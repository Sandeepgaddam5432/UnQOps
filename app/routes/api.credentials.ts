import { type ActionFunctionArgs, type LoaderFunctionArgs, json as baseJson } from '@remix-run/cloudflare';
import { isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '~/lib/api/deployment-security';
import {
  clearLegacyProviderCredentialCookies,
  clearProviderCredentialCookies,
  createProviderCredentialCookie,
  CredentialStoreUnavailableError,
  getProviderCredential,
  isProviderCredentialProvider,
  InvalidProviderCredentialError,
  PROVIDER_CREDENTIAL_PROVIDERS,
  validateProviderCredential,
  type ProviderCredential,
  type ProviderCredentialProvider,
} from '~/lib/api/provider-credentials.server';

const MAX_REQUEST_BYTES = 8_192;
const PROVIDER_API_TIMEOUT_MS = 10_000;

type SafeProviderProfile = Record<string, unknown>;

function json(data: unknown, status = 200, headersInit?: HeadersInit): Response {
  const headers = new Headers(headersInit);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Vary', 'Cookie, Origin');

  return baseJson(data, { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, maxLength = 256): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : undefined;
}

function safeGitHubProfile(value: unknown): SafeProviderProfile | null {
  const login = isRecord(value) ? safeString(value.login, 100) : undefined;

  if (!isRecord(value) || !login) {
    return null;
  }

  return {
    login,
    name: safeString(value.name, 160) ?? null,
    avatarUrl: safeString(value.avatar_url, 2_048),
    htmlUrl: safeString(value.html_url, 2_048),
  };
}

function safeNetlifyProfile(value: unknown): SafeProviderProfile | null {
  if (!isRecord(value) || (typeof value.id !== 'string' && typeof value.id !== 'number')) {
    return null;
  }

  return {
    id: String(value.id).slice(0, 128),
    fullName: safeString(value.full_name, 160) ?? safeString(value.fullName, 160) ?? null,
    email: safeString(value.email, 320) ?? null,
    avatarUrl: safeString(value.avatar_url, 2_048) ?? safeString(value.avatar, 2_048),
  };
}

function safeVercelProfile(value: unknown): SafeProviderProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const user = isRecord(value.user) ? value.user : value;
  const username = safeString(user.username, 100) ?? safeString(user.name, 100);

  if (!username) {
    return null;
  }

  return {
    username,
    email: safeString(user.email, 320) ?? null,
    avatar: safeString(user.avatar, 2_048),
  };
}

function safeSupabaseProjects(value: unknown): SafeProviderProfile[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      return [];
    }

    return [
      {
        id: item.id.slice(0, 128),
        name: item.name.slice(0, 160),
        region: safeString(item.region, 100) ?? null,
        organization_id: safeString(item.organization_id, 128) ?? null,
        status: safeString(item.status, 100) ?? null,
        created_at: safeString(item.created_at, 64) ?? null,
      },
    ];
  });
}

function safeCloudflareAccount(value: unknown, accountId: string): SafeProviderProfile | null {
  if (!isRecord(value) || value.success !== true || !isRecord(value.result)) {
    return null;
  }

  const result = value.result;

  if (result.id !== accountId) {
    return null;
  }

  return {
    accountId,
    name: safeString(result.name, 160) ?? null,
  };
}

async function requestProviderProfile(
  provider: ProviderCredentialProvider,
  credential: ProviderCredential,
): Promise<
  { ok: true; profile: SafeProviderProfile | { projects: SafeProviderProfile[] } } | { ok: false; status: number }
> {
  const headers = new Headers({ Authorization: `Bearer ${credential.token}`, Accept: 'application/json' });
  let url: string;
  const method = 'GET';

  switch (provider) {
    case 'github':
      url = 'https://api.github.com/user';
      headers.set('X-GitHub-Api-Version', '2022-11-28');
      break;
    case 'netlify':
      url = 'https://api.netlify.com/api/v1/user';
      break;
    case 'vercel':
      url = 'https://api.vercel.com/v2/user';
      break;
    case 'supabase':
      url = 'https://api.supabase.com/v1/projects';
      break;
    case 'cloudflare':
      if (!('accountId' in credential)) {
        return { ok: false, status: 400 };
      }

      url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(credential.accountId)}`;
      break;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: AbortSignal.timeout(PROVIDER_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const body: unknown = await response.json();
    let profile: SafeProviderProfile | { projects: SafeProviderProfile[] } | null;

    switch (provider) {
      case 'github':
        profile = safeGitHubProfile(body);
        break;
      case 'netlify':
        profile = safeNetlifyProfile(body);
        break;
      case 'vercel':
        profile = safeVercelProfile(body);
        break;
      case 'supabase': {
        const projects = safeSupabaseProjects(body);
        profile = projects ? { projects } : null;
        break;
      }
      case 'cloudflare': {
        const accountId = 'accountId' in credential ? credential.accountId : '';
        profile = safeCloudflareAccount(body, accountId);
        break;
      }
    }

    return profile ? { ok: true, profile } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 502 };
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  }

  try {
    const shouldVerify = new URL(request.url).searchParams.get('verify') === '1';
    const providerResults = await Promise.all(
      PROVIDER_CREDENTIAL_PROVIDERS.map(async (provider) => {
        const credential = await getProviderCredential(request, provider, context);

        if (!shouldVerify) {
          return [provider, { connected: Boolean(credential) }] as const;
        }

        if (!credential) {
          return [provider, { connected: false, verified: false }] as const;
        }

        const verification = await requestProviderProfile(provider, credential);

        return [provider, { connected: true, verified: verification.ok }] as const;
      }),
    );
    const providers = Object.fromEntries(providerResults.map(([provider, result]) => [provider, result.connected]));
    const checks = shouldVerify
      ? Object.fromEntries(
          providerResults.map(([provider, result]) => [provider, 'verified' in result ? result.verified : false]),
        )
      : undefined;

    return json({ providers, ...(checks ? { checks } : {}) });
  } catch (error) {
    if (error instanceof CredentialStoreUnavailableError) {
      return json({ error: 'Secure credential storage is not configured' }, 503);
    }

    return json({ error: 'Unable to read connection status' }, 500);
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  }

  if (!isSameOriginRequest(request) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Same-origin requests are required' }, 403);
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type must be application/json' }, 415);
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: 'Credential request is too large' }, 413);
    }

    return json({ error: 'Invalid credential request body' }, 400);
  }

  if (!isRecord(body) || !isProviderCredentialProvider(body.provider)) {
    return json({ error: 'Invalid credential request' }, 400);
  }

  const provider = body.provider;

  if (body.operation === 'disconnect') {
    const headers = new Headers();

    for (const cookie of clearProviderCredentialCookies(request, provider)) {
      headers.append('Set-Cookie', cookie);
    }

    return json({ connected: false, provider }, 200, headers);
  }

  if (body.operation !== 'connect') {
    return json({ error: 'Unsupported credential operation' }, 400);
  }

  const credentialInput =
    provider === 'cloudflare' ? { token: body.token, accountId: body.accountId } : { token: body.token };
  const credential = validateProviderCredential(provider, credentialInput);

  if (!credential) {
    return json({ error: 'A valid provider credential is required' }, 400);
  }

  let credentialCookie: string;

  try {
    credentialCookie = await createProviderCredentialCookie(request, provider, credential, context);
  } catch (error) {
    if (error instanceof InvalidProviderCredentialError) {
      return json({ error: 'Provider credential exceeds the supported size' }, 413);
    }

    if (error instanceof CredentialStoreUnavailableError) {
      return json({ error: 'Secure credential storage is not configured' }, 503);
    }

    return json({ error: 'Unable to save the provider connection securely' }, 500);
  }

  const validation = await requestProviderProfile(provider, credential);

  if (!validation.ok) {
    const status = validation.status === 401 || validation.status === 403 ? 401 : validation.status === 429 ? 429 : 502;
    const message =
      status === 401
        ? 'The provider rejected this credential'
        : status === 429
          ? 'The provider is rate-limiting connection checks'
          : 'Unable to verify the provider connection';

    return json({ error: message }, status);
  }

  const headers = new Headers();
  headers.append('Set-Cookie', credentialCookie);

  for (const legacyCookie of clearLegacyProviderCredentialCookies(request, provider)) {
    headers.append('Set-Cookie', legacyCookie);
  }

  return json({ connected: true, provider, profile: validation.profile }, 200, headers);
}
