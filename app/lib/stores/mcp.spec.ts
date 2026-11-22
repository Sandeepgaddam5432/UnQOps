import { afterEach, describe, expect, it, vi } from 'vitest';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, String(value))),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('MCP browser settings storage', () => {
  it('removes legacy credential-bearing configuration and restores only status and safe preferences', async () => {
    const storage = createStorage({
      mcp_settings: JSON.stringify({
        mcpConfig: {
          mcpServers: {
            private: {
              type: 'streamable-http',
              url: 'https://mcp.example.com/mcp?token=query-secret',
              headers: { Authorization: 'Bearer header-secret' },
            },
          },
        },
        maxLLMSteps: 14,
      }),
      mcp_max_llm_steps: '3',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ remote: { status: 'unavailable' } })));

    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', fetchMock);

    const { useMCPStore } = await import('./mcp');
    await useMCPStore.getState().initialize();

    const state = useMCPStore.getState();

    expect(storage.values.has('mcp_settings')).toBe(false);
    expect(state.settings.maxLLMSteps).toBe(3);
    expect(state.settings.mcpConfig).toEqual({ mcpServers: {} });
    expect(state.serverTools).toEqual({ remote: { status: 'unavailable' } });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mcp-check',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
  });

  it('persists the bounded step preference but never writes MCP URLs, headers, or process config', async () => {
    const storage = createStorage();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({})));

    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', fetchMock);

    const { useMCPStore } = await import('./mcp');
    await useMCPStore.getState().updateSettings({
      maxLLMSteps: 99,
      mcpConfig: {
        mcpServers: {
          remote: {
            type: 'streamable-http',
            url: 'https://mcp.example.com/mcp?token=query-secret',
            headers: { Authorization: 'Bearer header-secret' },
          },
        },
      },
    });

    const persisted = JSON.stringify(Object.fromEntries(storage.values));

    expect(useMCPStore.getState().settings.maxLLMSteps).toBe(5);
    expect(storage.values.get('mcp_max_llm_steps')).toBe('5');
    expect(storage.values.has('mcp_settings')).toBe(false);
    expect(persisted).not.toContain('mcp.example.com');
    expect(persisted).not.toContain('query-secret');
    expect(persisted).not.toContain('header-secret');

    const [, request] = fetchMock.mock.calls[0];
    expect(request?.credentials).toBe('same-origin');
    expect(JSON.stringify(request?.body)).toContain('header-secret');
  });
});
