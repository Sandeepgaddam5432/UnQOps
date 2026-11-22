import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import {
  createMcpSessionCookie,
  createMcpSessionId,
  getMcpSessionId,
  toMcpServerToolsSummary,
  validateMcpConfig,
} from '~/lib/api/mcp-security';
import { isLoopbackMcpHost } from '~/lib/api/mcp-network-security';
import { isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '~/lib/api/deployment-security';
import { MCPService } from '~/lib/services/mcpService';

const MAX_MCP_CONFIG_BYTES = 262_144;

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'private, no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Vary', 'Origin, Cookie');

  return Response.json(data, { status, headers: responseHeaders });
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

  let parsedBody: unknown;

  try {
    parsedBody = await readJsonBody(request, MAX_MCP_CONFIG_BYTES);
  } catch (error) {
    const isTooLarge = error instanceof RequestBodyTooLargeError;
    return json(
      { error: isTooLarge ? 'MCP configuration is too large' : 'Invalid MCP configuration body' },
      isTooLarge ? 413 : 400,
    );
  }

  const allowLocalDevelopment = import.meta.env.DEV && isLoopbackMcpHost(new URL(request.url).hostname);
  const config = validateMcpConfig(parsedBody, allowLocalDevelopment);

  if (!config) {
    return json({ error: 'Invalid or unsafe MCP configuration' }, 400);
  }

  const sessionId = getMcpSessionId(request) ?? createMcpSessionId();

  try {
    const mcpService = MCPService.getInstance(sessionId);
    const serverTools = await mcpService.updateConfig(config, allowLocalDevelopment);
    const headers = new Headers({ 'Set-Cookie': createMcpSessionCookie(request, sessionId) });

    return json(toMcpServerToolsSummary(serverTools), 200, headers);
  } catch {
    return json({ error: 'Failed to update MCP configuration' }, 500);
  }
}
