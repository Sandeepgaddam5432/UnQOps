import type { ToolSet } from 'ai';
import { mcpConfigSchema, type MCPConfig, type MCPServerTools } from '~/lib/services/mcpService';
import { isSafeMcpRemoteUrl } from './mcp-network-security';
import { parseCookies } from './cookies';

export const MCP_SESSION_COOKIE = 'unqops_mcp_session';

const SESSION_ID_PATTERN = /^[a-f0-9]{64}$/;
const MAX_MCP_SERVERS = 20;
const MAX_SERVER_NAME_LENGTH = 64;
const MAX_HEADERS_PER_SERVER = 32;
const MAX_HEADER_VALUE_LENGTH = 4_096;

export interface MCPServerConfigSummary {
  type: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  url?: string;
}

export interface MCPToolSummary {
  description?: string;
  parameters?: {
    jsonSchema: {
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    };
  };
}

export type MCPServerSummary =
  | { status: 'available'; config: MCPServerConfigSummary; tools: Record<string, MCPToolSummary> }
  | { status: 'unavailable'; config: MCPServerConfigSummary; error: string };

export type MCPServerToolsSummary = Record<string, MCPServerSummary>;

export function getMcpSessionId(request: Request): string | null {
  const sessionId = parseCookies(request.headers.get('Cookie'))[MCP_SESSION_COOKIE];

  return sessionId && SESSION_ID_PATTERN.test(sessionId) ? sessionId : null;
}

export function createMcpSessionId(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createMcpSessionCookie(request: Request, sessionId: string): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';

  return `${MCP_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${secure}`;
}

function hasSafeHeaders(headers: Record<string, string> | undefined): boolean {
  if (!headers) {
    return true;
  }

  const entries = Object.entries(headers);

  return (
    entries.length <= MAX_HEADERS_PER_SERVER &&
    entries.every(
      ([name, value]) =>
        /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(name) &&
        typeof value === 'string' &&
        value.length <= MAX_HEADER_VALUE_LENGTH &&
        !/[\r\n\u0000]/.test(value),
    )
  );
}

/** Validate a client-provided MCP config before it can trigger server-side connections or process launches. */
export function validateMcpConfig(value: unknown, allowLocalDevelopment = false): MCPConfig | null {
  const parsed = mcpConfigSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  const entries = Object.entries(parsed.data.mcpServers);

  if (entries.length > MAX_MCP_SERVERS) {
    return null;
  }

  for (const [name, config] of entries) {
    if (
      name.length === 0 ||
      name.length > MAX_SERVER_NAME_LENGTH ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) ||
      !hasSafeHeaders('headers' in config ? config.headers : undefined)
    ) {
      return null;
    }

    if (config.type === 'stdio') {
      if (!allowLocalDevelopment) {
        return null;
      }

      continue;
    }

    if (!isSafeMcpRemoteUrl(config.url, allowLocalDevelopment)) {
      return null;
    }
  }

  return parsed.data;
}

function summarizeConfig(config: MCPConfig['mcpServers'][string]): MCPServerConfigSummary {
  if (config.type === 'stdio') {
    return { type: 'stdio', command: 'local process' };
  }

  let url = 'remote MCP server';

  try {
    url = `${new URL(config.url).origin}/`;
  } catch {
    // Keep a generic label for malformed or legacy configuration values.
  }

  return { type: config.type, url };
}

function summarizeTools(tools: ToolSet): Record<string, MCPToolSummary> {
  const result: Record<string, MCPToolSummary> = Object.create(null);

  for (const [name, tool] of Object.entries(tools).slice(0, 100)) {
    const toolName = name.slice(0, 128);
    const rawParameters = (tool as { parameters?: { jsonSchema?: unknown } }).parameters?.jsonSchema;
    let parameters: MCPToolSummary['parameters'];

    if (typeof rawParameters === 'object' && rawParameters !== null) {
      const schema = rawParameters as {
        properties?: Record<string, unknown>;
        required?: unknown;
      };
      const properties: NonNullable<NonNullable<MCPToolSummary['parameters']>['jsonSchema']['properties']> =
        Object.create(null);

      for (const [propertyName, rawProperty] of Object.entries(schema.properties ?? {}).slice(0, 100)) {
        if (typeof rawProperty !== 'object' || rawProperty === null) {
          continue;
        }

        const property = rawProperty as { type?: unknown; description?: unknown };
        properties[propertyName.slice(0, 128)] = {
          ...(typeof property.type === 'string' ? { type: property.type.slice(0, 64) } : {}),
          ...(typeof property.description === 'string' ? { description: property.description.slice(0, 1_000) } : {}),
        };
      }

      parameters = {
        jsonSchema: {
          properties,
          required: Array.isArray(schema.required)
            ? schema.required.filter((item): item is string => typeof item === 'string').slice(0, 100)
            : [],
        },
      };
    }

    result[toolName] = {
      ...(typeof tool.description === 'string' ? { description: tool.description.slice(0, 2_000) } : {}),
      ...(parameters ? { parameters } : {}),
    };
  }

  return result;
}

/** Return only UI-safe MCP status and tool metadata; never serialize clients or credentials. */
export function toMcpServerToolsSummary(servers: MCPServerTools): MCPServerToolsSummary {
  const result: MCPServerToolsSummary = Object.create(null);

  for (const [name, server] of Object.entries(servers).slice(0, MAX_MCP_SERVERS)) {
    const summaryName = name.slice(0, MAX_SERVER_NAME_LENGTH);
    const config = summarizeConfig(server.config as MCPConfig['mcpServers'][string]);

    result[summaryName] =
      server.status === 'available'
        ? { status: 'available', config, tools: summarizeTools(server.tools) }
        : { status: 'unavailable', config, error: 'MCP server is unavailable' };
  }

  return result;
}
