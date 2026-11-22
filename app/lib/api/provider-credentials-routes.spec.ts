import { afterEach, describe, expect, it, vi } from 'vitest';
import { action as credentialsAction, loader as credentialsLoader } from '~/routes/api.credentials';
import { createProviderCredentialCookie } from '~/lib/api/provider-credentials.server';

const encryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(19)));
const context = { cloudflare: { env: { UNQOPS_CREDENTIALS_ENCRYPTION_KEY: encryptionKey } } };

function callRoute(
  handler: (args: any) => Response | Promise<Response>,
  request: Request,
  routeContext: unknown = context,
) {
  return handler({ request, context: routeContext, params: {} });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('provider credential routes', () => {
  it('reports only provider connection presence and uses private no-store caching', async () => {
    const cookie = await createProviderCredentialCookie(
      new Request('https://unqops.test/api/credentials'),
      'github',
      { token: 'github-secret-test' },
      context,
    );
    const request = new Request('https://unqops.test/api/credentials', {
      headers: { Cookie: cookie.split(';', 1)[0] },
    });
    const response = await callRoute(credentialsLoader as any, request);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"github":true');
    expect(body).toContain('"netlify":false');
    expect(body).not.toContain('github-secret-test');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toContain('Cookie');
  });

  it('optionally verifies encrypted provider sessions without returning provider profiles or secrets', async () => {
    const cookie = await createProviderCredentialCookie(
      new Request('https://unqops.test/api/credentials'),
      'github',
      { token: 'github-secret-test' },
      context,
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ login: 'safe-user', name: 'Safe User', private_token: 'must-not-leak' }));
    const request = new Request('https://unqops.test/api/credentials?verify=1', {
      headers: { Cookie: cookie.split(';', 1)[0] },
    });
    const response = await callRoute(credentialsLoader as any, request);
    const body = await response.text();
    const data = JSON.parse(body) as { providers: Record<string, boolean>; checks: Record<string, boolean> };

    expect(response.status).toBe(200);
    expect(data.providers.github).toBe(true);
    expect(data.providers.netlify).toBe(false);
    expect(data.checks.github).toBe(true);
    expect(data.checks.netlify).toBe(false);
    expect(body).not.toContain('safe-user');
    expect(body).not.toContain('github-secret-test');
    expect(body).not.toContain('must-not-leak');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer github-secret-test');
  });

  it('connects only after server-side provider verification and returns a safe profile', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        login: 'safe-user',
        name: 'Safe User',
        avatar_url: 'https://avatars.example.test/u/1',
        html_url: 'https://github.com/safe-user',
        private_token: 'must-not-leak',
      }),
    );
    const request = new Request('https://unqops.test/api/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
      },
      body: JSON.stringify({ operation: 'connect', provider: 'github', token: 'github-secret-test' }),
    });
    const response = await callRoute(credentialsAction as any, request);
    const responseText = await response.text();

    expect(response.status).toBe(200);
    expect(responseText).toContain('safe-user');
    expect(responseText).not.toContain('github-secret-test');
    expect(responseText).not.toContain('must-not-leak');
    expect(response.headers.get('set-cookie')).toContain('__Host-unqops_credential_github=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('set-cookie')).not.toContain('github-secret-test');
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer github-secret-test');
  });

  it('rejects cross-origin and cross-site connection attempts before contacting providers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const requests = [
      new Request('https://unqops.test/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.test' },
        body: JSON.stringify({ operation: 'connect', provider: 'github', token: 'secret' }),
      }),
      new Request('https://unqops.test/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://unqops.test',
          'Sec-Fetch-Site': 'cross-site',
        },
        body: JSON.stringify({ operation: 'connect', provider: 'github', token: 'secret' }),
      }),
    ];

    for (const request of requests) {
      const response = await callRoute(credentialsAction as any, request);
      expect(response.status).toBe(403);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not save rejected provider credentials or expose upstream error bodies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: 'private provider response', token: 'must-not-leak' }, { status: 401 }),
    );

    const request = new Request('https://unqops.test/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ operation: 'connect', provider: 'vercel', token: 'vercel-secret-test' }),
    });
    const response = await callRoute(credentialsAction as any, request);
    const body = await response.text();

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(body).toContain('The provider rejected this credential');
    expect(body).not.toContain('vercel-secret-test');
    expect(body).not.toContain('private provider response');
    expect(body).not.toContain('must-not-leak');
  });

  it('requires the server encryption key before sending a submitted credential to a provider', async () => {
    vi.stubEnv('UNQOPS_CREDENTIALS_ENCRYPTION_KEY', '');

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ operation: 'connect', provider: 'github', token: 'github-secret-test' }),
    });
    const response = await callRoute(credentialsAction as any, request, {});

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('github-secret-test');
  });

  it('disconnects a provider by expiring encrypted and legacy cookies', async () => {
    const request = new Request('https://unqops.test/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ operation: 'disconnect', provider: 'github' }),
    });
    const response = await callRoute(credentialsAction as any, request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ connected: false, provider: 'github' });
    expect(response.headers.get('set-cookie')).toContain('__Host-unqops_credential_github=; Max-Age=0');
    expect(response.headers.get('set-cookie')).toContain('githubToken=; Max-Age=0');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects malformed and oversized credential requests without contacting providers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const invalidProviderRequest = new Request('https://unqops.test/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ operation: 'connect', provider: 'custom', token: 'secret' }),
    });
    const oversizedRequest = new Request('https://unqops.test/api/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '9000',
        Origin: 'https://unqops.test',
      },
      body: '{}',
    });

    expect((await callRoute(credentialsAction as any, invalidProviderRequest)).status).toBe(400);
    expect((await callRoute(credentialsAction as any, oversizedRequest)).status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
