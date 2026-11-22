import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';

const ALLOWED_GIT_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org']);
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST']);
const REQUEST_HEADERS = ['accept', 'authorization', 'content-length', 'content-type', 'git-protocol', 'user-agent'];
const RESPONSE_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-type',
  'date',
  'etag',
  'expires',
  'last-modified',
];

export async function action({ request, params }: ActionFunctionArgs) {
  return handleProxyRequest(request, params['*']);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return handleProxyRequest(request, params['*']);
}

function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

function isAllowedGitEndpoint(target: URL, method: string, headers?: Headers): boolean {
  const segments = target.pathname.split('/').filter(Boolean);

  if (segments.length < 3) {
    return false;
  }

  try {
    const decodedSegments = segments.map((segment) => decodeURIComponent(segment));

    if (
      decodedSegments.some(
        (segment) =>
          segment === '.' ||
          segment === '..' ||
          segment.includes('/') ||
          segment.includes(String.fromCharCode(92)) ||
          /[\u0000-\u001f\u007f]/.test(segment),
      )
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const isUploadPackDiscovery =
    segments.length >= 4 &&
    segments.at(-2) === 'info' &&
    segments.at(-1) === 'refs' &&
    ['GET', 'HEAD'].includes(method) &&
    [...target.searchParams].length === 1 &&
    target.searchParams.get('service') === 'git-upload-pack';

  if (isUploadPackDiscovery) {
    return true;
  }

  const contentType = headers?.get('content-type')?.split(';', 1)[0].trim().toLowerCase();

  return (
    method === 'POST' &&
    segments.at(-1) === 'git-upload-pack' &&
    segments.length >= 3 &&
    target.search === '' &&
    contentType === 'application/x-git-upload-pack-request'
  );
}

function getTargetUrl(request: Request, path: string): URL | null {
  const normalizedPath = path.replace(/^\/+/, '');
  const slashIndex = normalizedPath.indexOf('/');

  if (slashIndex < 1 || normalizedPath.includes('\\') || normalizedPath.includes('@')) {
    return null;
  }

  const host = normalizedPath.slice(0, slashIndex).toLowerCase();

  if (!ALLOWED_GIT_HOSTS.has(host)) {
    return null;
  }

  try {
    const target = new URL(`https://${normalizedPath}`);

    if (target.protocol !== 'https:' || target.hostname !== host || target.username || target.password || target.port) {
      return null;
    }

    target.search = new URL(request.url).search;
    target.hash = '';

    if (!isAllowedGitEndpoint(target, request.method, request.headers)) {
      return null;
    }

    return target;
  } catch {
    return null;
  }
}

async function fetchWithSafeRedirects(target: URL, options: RequestInit): Promise<Response> {
  let current = target;

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, { ...options, redirect: 'manual' });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get('Location');

    if (!location) {
      return response;
    }

    const next = new URL(location, current);

    if (
      next.protocol !== 'https:' ||
      next.hostname !== target.hostname ||
      next.username ||
      next.password ||
      next.port ||
      !isAllowedGitEndpoint(next, String(options.method ?? 'GET').toUpperCase(), new Headers(options.headers))
    ) {
      throw new Error('Redirect target is not allowed');
    }

    current = next;
  }

  throw new Error('Too many upstream redirects');
}

async function handleProxyRequest(request: Request, path: string | undefined): Promise<Response> {
  if (!path) {
    return errorResponse('Invalid proxy path', 400);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if ((origin && origin !== requestUrl.origin) || (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none')) {
    return errorResponse('Cross-origin proxy requests are not allowed', 403);
  }

  if (request.method === 'POST' && !origin) {
    return errorResponse('Git upload requests must include a same-origin Origin header', 403);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': requestUrl.origin,
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Git-Protocol',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      },
    });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return errorResponse('HTTP method is not allowed', 405);
  }

  const target = getTargetUrl(request, path);

  if (!target) {
    return errorResponse('Only Git upload-pack endpoints on HTTPS GitHub, GitLab, and Bitbucket are allowed', 403);
  }

  const headers = new Headers();

  for (const header of REQUEST_HEADERS) {
    const value = request.headers.get(header);

    if (value !== null) {
      headers.set(header, value);
    }
  }

  try {
    const response = await fetchWithSafeRedirects(target, {
      method: request.method,
      headers,
      ...(request.method === 'GET' || request.method === 'HEAD' ? {} : { body: request.body, duplex: 'half' as const }),
    });

    const responseHeaders = new Headers({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Authorization, Origin',
    });

    for (const name of RESPONSE_HEADERS) {
      const value = response.headers.get(name);

      if (value !== null) {
        responseHeaders.set(name, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return errorResponse('Unable to reach the allowed Git provider', 502);
  }
}
