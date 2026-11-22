import { json as baseJson, type ActionFunctionArgs } from '@remix-run/cloudflare';
import type { SupabaseProject } from '~/types/supabase';
import {
  isSameOriginRequest,
  isValidProviderResourceId,
  readJsonBody,
  RequestBodyTooLargeError,
} from '~/lib/api/deployment-security';
import { CredentialStoreUnavailableError, getProviderCredential } from '~/lib/api/provider-credentials.server';

const MAX_REQUEST_BYTES = 16_384;

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Vary', 'Cookie, Origin');

  return baseJson(data, { ...init, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeProject(value: unknown): SupabaseProject | null {
  if (!isRecord(value) || !isValidProviderResourceId(value.id) || typeof value.name !== 'string') {
    return null;
  }

  return {
    id: value.id,
    name: value.name.slice(0, 160),
    organization_id:
      typeof value.organization_id === 'string' && value.organization_id.length <= 128 ? value.organization_id : '',
    region: typeof value.region === 'string' && value.region.length <= 100 ? value.region : 'unknown',
    created_at: typeof value.created_at === 'string' && value.created_at.length <= 64 ? value.created_at : '',
    status: typeof value.status === 'string' && value.status.length <= 100 ? value.status : 'unknown',
  };
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

  if (!isRecord(body) || Object.hasOwn(body, 'token')) {
    return json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const credential = await getProviderCredential(request, 'supabase', context);

    if (!credential) {
      return json({ error: 'Not connected to Supabase' }, { status: 401 });
    }

    const projectsResponse = await fetch('https://api.supabase.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${credential.token}`,
        Accept: 'application/json',
      },
    });

    if (!projectsResponse.ok) {
      return json({ error: 'Failed to fetch Supabase projects' }, { status: 502 });
    }

    const result: unknown = await projectsResponse.json();

    if (!Array.isArray(result)) {
      return json({ error: 'Invalid response from Supabase' }, { status: 502 });
    }

    const projects = result.flatMap((project) => {
      const safe = safeProject(project);
      return safe ? [safe] : [];
    });
    const uniqueProjects = Array.from(new Map(projects.map((project) => [project.id, project])).values());
    uniqueProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return json({
      user: { email: 'Connected', role: 'Admin' },
      stats: {
        projects: uniqueProjects,
        totalProjects: uniqueProjects.length,
      },
    });
  } catch (error) {
    if (error instanceof CredentialStoreUnavailableError) {
      return json({ error: 'Secure credential storage is not configured' }, { status: 503 });
    }

    return json({ error: 'Supabase authentication failed' }, { status: 502 });
  }
}
