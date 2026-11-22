import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getApiKeysFromCookie, parseCookies } from '~/lib/api/cookies';
import { isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '~/lib/api/deployment-security';

const API_KEYS_COOKIE = 'apiKeys';
const MAX_API_KEYS = 32;
const MAX_API_KEY_LENGTH = 4_096;
const MAX_COOKIE_VALUE_BYTES = 3_800;
const MAX_REQUEST_BYTES = 32_768;
const PROVIDER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'private, no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Vary', 'Cookie, Origin');

  return Response.json(data, { status, headers: responseHeaders });
}

function isSafeSameOriginRead(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (origin !== null) {
    try {
      if (new URL(origin).origin !== requestUrl.origin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return fetchSite === null || fetchSite === 'same-origin' || fetchSite === 'none';
}

function serializeApiKeys(keys: Record<string, string>): string | null {
  if (Object.keys(keys).length > MAX_API_KEYS) {
    return null;
  }

  const value = encodeURIComponent(JSON.stringify(keys));

  return new TextEncoder().encode(value).byteLength <= MAX_COOKIE_VALUE_BYTES ? value : null;
}

function createApiKeysCookie(request: Request, keys: Record<string, string>): string | null {
  const serialized = serializeApiKeys(keys);

  if (serialized === null) {
    return null;
  }

  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const maxAge = Object.keys(keys).length > 0 ? 31_536_000 : 0;

  return `${API_KEYS_COOKIE}=${serialized}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function expireApiKeysCookie(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';

  return `${API_KEYS_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function normalizeApiKeyRecord(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value);

  if (entries.length > MAX_API_KEYS) {
    return null;
  }

  const keys: Record<string, string> = Object.create(null);

  for (const [provider, apiKey] of entries) {
    if (
      !PROVIDER_NAME_PATTERN.test(provider) ||
      typeof apiKey !== 'string' ||
      apiKey.length > MAX_API_KEY_LENGTH ||
      /[\r\n\u0000]/.test(apiKey)
    ) {
      return null;
    }

    if (apiKey.length > 0) {
      keys[provider] = apiKey;
    }
  }

  return keys;
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isSafeSameOriginRead(request)) {
    return json({ error: 'Cross-origin requests are not allowed' }, 403);
  }

  const cookieHeader = request.headers.get('Cookie');
  const rawApiKeys = parseCookies(cookieHeader).apiKeys;
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const headers = new Headers();

  // Upgrade legacy JavaScript-readable cookies in place; never send key values back to the browser.
  if (rawApiKeys !== undefined) {
    const cookie = createApiKeysCookie(request, apiKeys);

    if (cookie) {
      headers.set('Set-Cookie', cookie);
    } else {
      // Fail closed if an old readable cookie is too large to migrate safely.
      headers.set('Set-Cookie', expireApiKeysCookie(request));
      return json({ error: 'Legacy API-key cookie exceeded the safe storage limit', providers: [] }, 413, headers);
    }
  }

  return json({ providers: Object.keys(apiKeys) }, 200, headers);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: 'Same-origin requests are required' }, 403);
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type must be application/json' }, 415);
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    const isTooLarge = error instanceof RequestBodyTooLargeError;
    return json(
      { error: isTooLarge ? 'API-key update is too large' : 'Invalid API-key update' },
      isTooLarge ? 413 : 400,
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({ error: 'Invalid API-key update' }, 400);
  }

  const input = body as { provider?: unknown; apiKey?: unknown; keys?: unknown; replace?: unknown };
  const existingKeys = getApiKeysFromCookie(request.headers.get('Cookie'));
  let nextKeys: Record<string, string>;

  if ('provider' in input) {
    if (
      typeof input.provider !== 'string' ||
      !PROVIDER_NAME_PATTERN.test(input.provider) ||
      typeof input.apiKey !== 'string' ||
      input.apiKey.length > MAX_API_KEY_LENGTH ||
      /[\r\n\u0000]/.test(input.apiKey)
    ) {
      return json({ error: 'Invalid provider API key' }, 400);
    }

    nextKeys = Object.assign(Object.create(null), existingKeys);

    if (input.apiKey.length > 0) {
      nextKeys[input.provider] = input.apiKey;
    } else {
      delete nextKeys[input.provider];
    }
  } else if ('keys' in input) {
    const importedKeys = normalizeApiKeyRecord(input.keys);

    if (!importedKeys || (input.replace !== undefined && typeof input.replace !== 'boolean')) {
      return json({ error: 'Invalid API-key set' }, 400);
    }

    nextKeys = input.replace ? importedKeys : Object.assign(Object.create(null), existingKeys, importedKeys);
  } else {
    return json({ error: 'Invalid API-key update' }, 400);
  }

  if (Object.keys(nextKeys).length > MAX_API_KEYS) {
    return json({ error: 'Too many provider API keys' }, 400);
  }

  const cookie = createApiKeysCookie(request, nextKeys);

  if (!cookie) {
    return json(
      { error: 'API-key set exceeds the browser cookie limit; remove keys or use server environment variables' },
      413,
    );
  }

  return json({ providers: Object.keys(nextKeys) }, 200, { 'Set-Cookie': cookie });
}
