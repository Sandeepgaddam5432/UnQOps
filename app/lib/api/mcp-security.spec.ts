import { describe, expect, it } from 'vitest';
import {
  createMcpSessionCookie,
  createMcpSessionId,
  getMcpSessionId,
  toMcpServerToolsSummary,
  validateMcpConfig,
} from './mcp-security';
import { MCPService, type MCPServerTools } from '~/lib/services/mcpService';

describe('MCP request safeguards', () => {
  it('accepts HTTPS remote servers and rejects unsafe or malformed configurations', () => {
    expect(
      validateMcpConfig({
        mcpServers: { docs: { type: 'streamable-http', url: 'https://mcp.example.com/mcp' } },
      }),
    ).not.toBeNull();

    expect(validateMcpConfig({ mcpServers: { local: { type: 'sse', url: 'http://localhost:8000/sse' } } })).toBeNull();
    expect(validateMcpConfig({ mcpServers: { private: { type: 'sse', url: 'https://127.0.0.1/sse' } } })).toBeNull();
    expect(
      validateMcpConfig({ mcpServers: { unsafe: { type: 'stdio', command: 'sh', args: ['-c', 'id'] } } }),
    ).toBeNull();
    expect(
      validateMcpConfig({
        mcpServers: { unsafe: { type: 'streamable-http', url: 'https://user:secret@mcp.example.com/mcp' } },
      }),
    ).toBeNull();
  });

  it('allows loopback MCP servers only when local development explicitly opts in', () => {
    const config = { mcpServers: { local: { type: 'sse', url: 'http://localhost:8000/sse' } } };

    expect(validateMcpConfig(config, true)).not.toBeNull();
    expect(validateMcpConfig({ mcpServers: { local: { type: 'stdio', command: 'node' } } }, true)).not.toBeNull();
  });

  it('creates high-entropy HttpOnly session cookies and validates session IDs', () => {
    const sessionId = createMcpSessionId();
    const request = new Request('https://app.test/api/mcp-update-config');
    const cookie = createMcpSessionCookie(request, sessionId);

    expect(sessionId).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    expect(getMcpSessionId(new Request(request.url, { headers: { Cookie: `unqops_mcp_session=${sessionId}` } }))).toBe(
      sessionId,
    );
    expect(
      getMcpSessionId(new Request(request.url, { headers: { Cookie: 'unqops_mcp_session=attacker-controlled' } })),
    ).toBeNull();
  });

  it('keeps MCP config credentials and executable arguments out of public status responses', () => {
    const servers = {
      remote: {
        status: 'available',
        client: { serverName: 'remote' },
        config: {
          type: 'streamable-http',
          url: 'https://mcp.example.com/private/path?token=query-secret',
          headers: { Authorization: 'Bearer header-secret' },
        },
        tools: {
          search: {
            description: 'Search documents',
            parameters: {
              jsonSchema: {
                properties: { query: { type: 'string', description: 'Search text' } },
                required: ['query'],
              },
            },
            execute: () => undefined,
          },
        },
      },
      local: {
        status: 'unavailable',
        client: null,
        config: { type: 'stdio', command: 'node', args: ['--token', 'process-secret'], env: { TOKEN: 'env-secret' } },
        error: 'internal connection error with credentials',
      },
    } as unknown as MCPServerTools;

    const summary = toMcpServerToolsSummary(servers);
    const serialized = JSON.stringify(summary);

    expect(serialized).toContain('https://mcp.example.com/');
    expect(serialized).toContain('Search documents');
    expect(serialized).not.toContain('query-secret');
    expect(serialized).not.toContain('header-secret');
    expect(serialized).not.toContain('process-secret');
    expect(serialized).not.toContain('env-secret');
    expect(serialized).not.toContain('internal connection error');
  });

  it('uses distinct MCP service instances for separate sessions', () => {
    expect(MCPService.getInstance('a'.repeat(64))).not.toBe(MCPService.getInstance('b'.repeat(64)));
  });
});
