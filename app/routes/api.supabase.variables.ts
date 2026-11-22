import { type ActionFunctionArgs, json as baseJson } from '@remix-run/cloudflare';
import {
  isSameOriginRequest,
  isValidProviderResourceId,
  readJsonBody,
  RequestBodyTooLargeError,
} from '~/lib/api/deployment-security';
import {
  CredentialStoreUnavailableError,
  getProviderCredential,
  type ProviderCredential,
} from '~/lib/api/provider-credentials.server';

const MAX_REQUEST_BYTES = 16_384;

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Vary', 'Cookie, Origin');

  return baseJson(data, { ...init, headers });
}

interface SupabaseApiKey {
  name?: string;
  api_key?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  if (!isSameOriginRequest(request) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Same-origin requests are required' }, { status: 403 });
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: 'Request is too large' }, { status: 413 });
    }

    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.hasOwn(body, 'token')) {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { projectId } = body as { projectId?: unknown };

  if (!isValidProviderResourceId(projectId)) {
    return json({ error: 'A valid project ID is required' }, { status: 400 });
  }

  let credential: ProviderCredential | null;

  try {
    credential = await getProviderCredential(request, 'supabase', context);
  } catch (error) {
    if (error instanceof CredentialStoreUnavailableError) {
      return json({ error: 'Secure credential storage is not configured' }, { status: 503 });
    }

    return json({ error: 'Unable to read the Supabase connection' }, { status: 500 });
  }

  if (!credential) {
    return json({ error: 'Not connected to Supabase' }, { status: 401 });
  }

  let result: unknown;

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectId)}/api-keys`, {
      headers: {
        Authorization: `Bearer ${credential.token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return json({ error: 'Failed to fetch project API keys' }, { status: 502 });
    }

    result = await response.json();
  } catch {
    return json({ error: 'Failed to fetch public project API keys' }, { status: 502 });
  }

  const publicKeys = Array.isArray(result)
    ? result.flatMap((item) => {
        const key = item as SupabaseApiKey;

        if (
          !['anon', 'public', 'publishable'].includes(key?.name ?? '') ||
          typeof key.api_key !== 'string' ||
          key.api_key.length === 0 ||
          key.api_key.length > 4_096
        ) {
          return [];
        }

        return [{ name: key.name, api_key: key.api_key }];
      })
    : [];

  return json({ apiKeys: publicKeys });
}
