import { describe, expect, it, vi } from 'vitest';
import { action as apiKeysAction, loader as apiKeysLoader } from '~/routes/api.api-keys';
import { action as exportKeys } from '~/routes/api.export-api-keys';
import { loader as gitProxy } from '~/routes/api.git-proxy.$';
import { loader as githubTemplate } from '~/routes/api.github-template';
import { loader as gitInfo } from '~/routes/api.system.git-info';
import { action as vercelAction, loader as vercelLoader } from '~/routes/api.vercel-deploy';
import { action as chatAction } from '~/routes/api.chat';
import { action as enhancerAction } from '~/routes/api.enhancer';
import { action as llmCallAction } from '~/routes/api.llmcall';
import { action as mcpUpdateConfigAction } from '~/routes/api.mcp-update-config';
import { loader as mcpCheckLoader } from '~/routes/api.mcp-check';
import { action as supabaseProjectsAction } from '~/routes/api.supabase';
import { action as supabaseQueryAction } from '~/routes/api.supabase.query';
import { action as supabaseVariablesAction } from '~/routes/api.supabase.variables';
import { createProviderCredentialCookie } from '~/lib/api/provider-credentials.server';

const providerEncryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(51)));
const providerContext = { cloudflare: { env: { UNQOPS_CREDENTIALS_ENCRYPTION_KEY: providerEncryptionKey } } };

const callLoader = (
  loader: (args: any) => Response | Promise<Response>,
  request: Request,
  params: Record<string, string> = {},
  context: unknown = {},
) => loader({ request, params, context });

describe('credential and proxy route safeguards', () => {
  it('requires same-origin requests for credential-backed LLM actions', async () => {
    const crossOrigin = 'https://attacker.test';
    const appOrigin = 'https://unqops.test';
    const actions = [chatAction, enhancerAction, llmCallAction];

    for (const action of actions) {
      const request = new Request(`${appOrigin}/api/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: crossOrigin },
        body: JSON.stringify({}),
      });
      const response = await callLoader(action as any, request);

      expect(response.status).toBe(403);
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
  });

  it('bounds chat and prompt request bodies before provider calls', async () => {
    const cases = [
      { action: chatAction, url: 'https://unqops.test/api/chat', size: '20000001' },
      { action: enhancerAction, url: 'https://unqops.test/api/enhancer', size: '1000001' },
      { action: llmCallAction, url: 'https://unqops.test/api/llmcall', size: '1000001' },
    ];

    for (const { action, url, size } of cases) {
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': size,
          Origin: 'https://unqops.test',
        },
        body: JSON.stringify({}),
      });
      const response = await callLoader(action as any, request);

      expect(response.status).toBe(413);
    }
  });

  it('requires same-origin JSON requests to update MCP server configuration', async () => {
    const request = new Request('https://unqops.test/api/mcp-update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.test' },
      body: JSON.stringify({ mcpServers: {} }),
    });
    const response = await callLoader(mcpUpdateConfigAction as any, request);

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects MCP stdio commands on hosted request origins', async () => {
    const request = new Request('https://unqops.test/api/mcp-update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ mcpServers: { command: { type: 'stdio', command: 'sh', args: ['-c', 'whoami'] } } }),
    });
    const response = await callLoader(mcpUpdateConfigAction as any, request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid or unsafe MCP configuration' });
  });

  it('isolates MCP configuration by HttpOnly session and returns only safe server summaries', async () => {
    const updateRequest = new Request('https://unqops.test/api/mcp-update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ mcpServers: {} }),
    });
    const updateResponse = await callLoader(mcpUpdateConfigAction as any, updateRequest);
    const setCookie = updateResponse.headers.get('set-cookie');

    expect(updateResponse.status).toBe(200);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(updateResponse.headers.get('cache-control')).toContain('no-store');

    const cookie = setCookie?.split(';', 1)[0] ?? '';
    const statusRequest = new Request('https://unqops.test/api/mcp-check', { headers: { Cookie: cookie } });
    const statusResponse = await callLoader(mcpCheckLoader as any, statusRequest);

    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toEqual({});
    expect(statusResponse.headers.get('set-cookie')).toContain('HttpOnly');
    expect(statusResponse.headers.get('cache-control')).toContain('no-store');
  });

  it('upgrades legacy API-key cookies to HttpOnly and returns only provider presence', async () => {
    const userKeys = { OpenAI: 'user-provided-key' };
    const request = new Request('https://unqops.test/api/api-keys', {
      headers: { Cookie: `apiKeys=${encodeURIComponent(JSON.stringify(userKeys))}` },
    });

    const response = await callLoader(apiKeysLoader as any, request);
    const result = await response.json();

    expect(result).toEqual({ providers: ['OpenAI'] });
    expect(JSON.stringify(result)).not.toContain('user-provided-key');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Strict');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('expires an oversized legacy readable key cookie instead of leaving it script-accessible', async () => {
    const request = new Request('https://unqops.test/api/api-keys', {
      headers: { Cookie: `apiKeys=${encodeURIComponent(JSON.stringify({ OpenAI: 'a'.repeat(4_000) }))}` },
    });

    const response = await callLoader(apiKeysLoader as any, request);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: 'Legacy API-key cookie exceeded the safe storage limit',
      providers: [],
    });
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('saves provider keys in HttpOnly cookies and returns only provider names', async () => {
    const request = new Request('https://unqops.test/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ provider: 'OpenAI', apiKey: 'user-provided-key' }),
    });

    const response = await callLoader(apiKeysAction as any, request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual({ providers: ['OpenAI'] });
    expect(JSON.stringify(result)).not.toContain('user-provided-key');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Strict');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('clears a single key using an expiring HttpOnly cookie without returning its value', async () => {
    const oldKeys = { OpenAI: 'previous-secret' };
    const request = new Request('https://unqops.test/api/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
        Cookie: `apiKeys=${encodeURIComponent(JSON.stringify(oldKeys))}`,
      },
      body: JSON.stringify({ provider: 'OpenAI', apiKey: '' }),
    });

    const response = await callLoader(apiKeysAction as any, request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ providers: [] });
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('rejects API keys that exceed the safe cookie budget', async () => {
    const request = new Request('https://unqops.test/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ provider: 'OpenAI', apiKey: 'a'.repeat(4_000) }),
    });

    const response = await callLoader(apiKeysAction as any, request);

    expect(response.status).toBe(413);
    expect(await response.json()).toHaveProperty('error');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('rejects cross-origin API-key updates and credential exports', async () => {
    const updateRequest = new Request('https://unqops.test/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.test' },
      body: JSON.stringify({ provider: 'OpenAI', apiKey: 'user-key' }),
    });
    const exportRequest = new Request('https://unqops.test/api/export-api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.test' },
      body: '{}',
    });

    expect((await callLoader(apiKeysAction as any, updateRequest)).status).toBe(403);
    expect((await callLoader(exportKeys as any, exportRequest)).status).toBe(403);
  });

  it('exports keys only through an explicit same-origin no-store POST', async () => {
    const userKeys = { OpenAI: 'user-provided-key' };
    const request = new Request('https://unqops.test/api/export-api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
        Cookie: `apiKeys=${encodeURIComponent(JSON.stringify(userKeys))}`,
      },
      body: '{}',
    });

    const response = await callLoader(exportKeys as any, request);
    expect(await response.json()).toEqual(userKeys);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('requires a caller-supplied GitHub token and never enables wildcard CORS', async () => {
    const request = new Request('https://unqops.test/api/system/git-info?action=getUser');
    const response = await callLoader(gitInfo as any, request);

    expect(response.status).toBe(401);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('does not accept Vercel credentials in query strings', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/vercel-deploy?projectId=prj_test&token=user-secret');
    const response = await callLoader(vercelLoader as any, request);

    expect(response.status).toBe(405);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
    fetchSpy.mockRestore();
  });

  it('sends Vercel status tokens in a same-origin POST body, never in upstream URLs', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'prj_test', name: 'demo' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deployments: [{ id: 'dpl_test', state: 'READY', url: 'demo.vercel.app' }] }), {
          status: 200,
        }),
      );
    const request = new Request('https://unqops.test/api/vercel-deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ mode: 'status', projectId: 'prj_test', token: 'private-token' }),
    });
    const response = await callLoader(vercelAction as any, request);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain('private-token');
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer private-token');
    fetchSpy.mockRestore();
  });

  it('rejects Supabase credentials from legacy request bodies and Authorization headers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const legacyBodyRequest = new Request('https://unqops.test/api/supabase/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ projectId: 'abcdefghijklmnopqrst', query: 'select 1', token: 'legacy-token' }),
    });
    const bearerOnlyRequest = new Request('https://unqops.test/api/supabase/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
        Authorization: 'Bearer legacy-token',
      },
      body: JSON.stringify({ projectId: 'abcdefghijklmnopqrst', query: 'select 1' }),
    });
    const projectsBodyRequest = new Request('https://unqops.test/api/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unqops.test' },
      body: JSON.stringify({ token: 'legacy-token' }),
    });
    const projectsBearerRequest = new Request('https://unqops.test/api/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
        Authorization: 'Bearer legacy-token',
      },
      body: '{}',
    });
    const bodyResponse = await callLoader(supabaseQueryAction as any, legacyBodyRequest);
    const bearerResponse = await callLoader(supabaseQueryAction as any, bearerOnlyRequest);
    const projectsBodyResponse = await callLoader(supabaseProjectsAction as any, projectsBodyRequest);
    const projectsBearerResponse = await callLoader(supabaseProjectsAction as any, projectsBearerRequest);

    expect(bodyResponse.status).toBe(400);
    expect(bearerResponse.status).toBe(401);
    expect(projectsBodyResponse.status).toBe(400);
    expect(projectsBearerResponse.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('uses the encrypted Supabase session and sanitizes upstream query errors', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'relation private_customer_records does not exist' }), { status: 400 }),
      );
    const sessionCookie = await createProviderCredentialCookie(
      new Request('https://unqops.test/api/credentials'),
      'supabase',
      { token: 'supabase-token' },
      providerContext,
    );
    const request = new Request('https://unqops.test/api/supabase/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
        Cookie: sessionCookie.split(';', 1)[0],
      },
      body: JSON.stringify({ projectId: 'abcdefghijklmnopqrst', query: 'select * from private_customer_records' }),
    });

    const response = await callLoader(supabaseQueryAction as any, request, {}, providerContext);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(JSON.stringify(body)).not.toContain('private_customer_records');
    expect(JSON.stringify(body)).toContain('Supabase rejected the database query');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer supabase-token');
    fetchSpy.mockRestore();
  });

  it('enforces Supabase query body limits before forwarding the request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/supabase/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '1000001',
        Origin: 'https://unqops.test',
        Authorization: 'Bearer supabase-token',
      },
      body: JSON.stringify({ projectId: 'abcdefghijklmnopqrst', query: 'select 1' }),
    });

    const response = await callLoader(supabaseQueryAction as any, request);

    expect(response.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('returns only public Supabase API keys, never service-role or secret keys', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          { name: 'anon', api_key: 'public-anon-key', internal_id: 'ignored' },
          { name: 'service_role', api_key: 'service-role-secret' },
          { name: 'publishable', api_key: 'public-publishable-key' },
          { name: 'secret', api_key: 'secret-key' },
        ]),
        { status: 200 },
      ),
    );
    const sessionCookie = await createProviderCredentialCookie(
      new Request('https://unqops.test/api/credentials'),
      'supabase',
      { token: 'supabase-token' },
      providerContext,
    );
    const request = new Request('https://unqops.test/api/supabase/variables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://unqops.test',
        Cookie: sessionCookie.split(';', 1)[0],
      },
      body: JSON.stringify({ projectId: 'abcdefghijklmnopqrst' }),
    });
    const response = await callLoader(supabaseVariablesAction as any, request, {}, providerContext);
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(body).toContain('public-anon-key');
    expect(body).toContain('public-publishable-key');
    expect(body).not.toContain('service-role-secret');
    expect(body).not.toContain('secret-key');
    expect(body).not.toContain('internal_id');
    expect(response.headers.get('cache-control')).toContain('no-store');
    fetchSpy.mockRestore();
  });

  it('rejects invalid repository identifiers before making an upstream request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/github-template?repo=../../private');
    const response = await callLoader(githubTemplate as any, request);

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('loads public template files without privileged credentials and filters secret-shaped files', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({ default_branch: 'main' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tree: [
              { path: '.env', type: 'blob', size: 20 },
              { path: '.env.example', type: 'blob', size: 25 },
              { path: 'id_rsa', type: 'blob', size: 30 },
              { path: 'package.json', type: 'blob', size: 35 },
              { path: '../escape', type: 'blob', size: 10 },
              { path: 'logo.png', type: 'blob', size: 6 },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ encoding: 'base64', content: btoa('example') }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ encoding: 'base64', content: btoa('{}') }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ encoding: 'base64', content: btoa(String.fromCharCode(255)) }), { status: 200 }),
      );

    const request = new Request(
      'https://unqops.test/api/github-template?repo=xKevIsDev%2Funqops-vite-react-ts-template',
    );
    const response = await callLoader(githubTemplate as any, request);
    const files = (await response.json()) as Array<{ path: string; content: string }>;

    expect(response.status).toBe(200);
    expect(files.map((file) => file.path)).toEqual(['.env.example', 'package.json']);
    expect(fetchSpy.mock.calls.every(([, options]) => !new Headers(options?.headers).has('Authorization'))).toBe(true);
    fetchSpy.mockRestore();
  });

  it('blocks untrusted Git proxy hosts without making an upstream request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/git-proxy/127.0.0.1/admin');
    const response = await callLoader(gitProxy as any, request, { '*': '127.0.0.1/admin' });

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects Git proxy requests from another origin before forwarding credentials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/git-proxy/github.com/org/repo.git', {
      headers: { Origin: 'https://attacker.test', Authorization: 'Bearer user-token' },
    });
    const response = await callLoader(gitProxy as any, request, { '*': 'github.com/org/repo.git' });

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('allows only Git smart-HTTP clone discovery paths', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('git advertisement', {
        status: 200,
        headers: {
          'Content-Type': 'application/x-git-upload-pack-advertisement',
          'Cache-Control': 'public, max-age=3600',
          Vary: 'Accept-Encoding',
        },
      }),
    );
    const request = new Request(
      'https://unqops.test/api/git-proxy/github.com/org/repo.git/info/refs?service=git-upload-pack',
    );
    const response = await callLoader(gitProxy as any, request, { '*': 'github.com/org/repo.git/info/refs' });

    expect(response.status).toBe(200);
    expect(String(fetchSpy.mock.calls[0][0])).toBe('https://github.com/org/repo.git/info/refs?service=git-upload-pack');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Authorization, Origin');
    fetchSpy.mockRestore();
  });

  it('rejects Git push endpoints and arbitrary paths before making an upstream request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/git-proxy/github.com/org/repo.git/git-receive-pack', {
      method: 'POST',
      headers: {
        Origin: 'https://unqops.test',
        'Content-Type': 'application/x-git-receive-pack-request',
      },
      body: 'request body',
    });
    const response = await callLoader(gitProxy as any, request, {
      '*': 'github.com/org/repo.git/git-receive-pack',
    });

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects Git upload POST requests without a same-origin Origin header', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://unqops.test/api/git-proxy/github.com/org/repo.git/git-upload-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-git-upload-pack-request' },
      body: 'request body',
    });
    const response = await callLoader(gitProxy as any, request, {
      '*': 'github.com/org/repo.git/git-upload-pack',
    });

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
