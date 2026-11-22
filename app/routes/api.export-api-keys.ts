import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { isSameOriginRequest } from '~/lib/api/deployment-security';

function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}

/** Explicit user-requested export only; normal API routes never return provider keys. */
export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (!isSameOriginRequest(request)) {
    return errorResponse('Same-origin export is required', 403);
  }

  const apiKeys = getApiKeysFromCookie(request.headers.get('Cookie'));

  return Response.json(apiKeys, {
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie, Origin',
    },
  });
}
