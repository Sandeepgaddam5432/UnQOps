import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import {
  isSameOriginRequest,
  isValidProviderResourceId,
  readJsonBody,
  RequestBodyTooLargeError,
} from '~/lib/api/deployment-security';
import { CredentialStoreUnavailableError, getProviderCredential } from '~/lib/api/provider-credentials.server';

const MAX_REQUEST_BYTES = 1_000_000;
const MAX_QUERY_LENGTH = 250_000;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie, Origin',
    },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: { message: 'Method not allowed' } }, 405);
  }

  if (!isSameOriginRequest(request) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: { message: 'Same-origin requests are required' } }, 403);
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: { message: 'Content-Type must be application/json' } }, 415);
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: { message: 'Query request is too large' } }, 413);
    }

    return json({ error: { message: 'Invalid request body' } }, 400);
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.hasOwn(body, 'token')) {
    return json({ error: { message: 'Invalid request body' } }, 400);
  }

  const { projectId, query } = body as { projectId?: unknown; query?: unknown };

  if (
    !isValidProviderResourceId(projectId) ||
    typeof query !== 'string' ||
    query.trim().length === 0 ||
    query.length > MAX_QUERY_LENGTH
  ) {
    return json({ error: { message: 'A valid project ID and SQL query are required' } }, 400);
  }

  try {
    const credential = await getProviderCredential(request, 'supabase', context);

    if (!credential) {
      return json({ error: { message: 'Not connected to Supabase' } }, 401);
    }

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(projectId)}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!response.ok) {
      const status = response.status >= 400 && response.status <= 599 ? response.status : 502;
      return json({ error: { status, message: 'Supabase rejected the database query' } }, status);
    }

    const result: unknown = await response.json();

    return json(result);
  } catch (error) {
    if (error instanceof CredentialStoreUnavailableError) {
      return json({ error: { message: 'Secure credential storage is not configured' } }, 503);
    }

    return json({ error: { message: 'Query execution failed' } }, 502);
  }
}
