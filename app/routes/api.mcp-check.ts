import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createMcpSessionCookie, getMcpSessionId, toMcpServerToolsSummary } from '~/lib/api/mcp-security';
import { MCPService } from '~/lib/services/mcpService';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie, Origin',
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');

  if (
    (origin !== null && origin !== requestUrl.origin) ||
    (fetchSite !== null && fetchSite !== 'same-origin' && fetchSite !== 'none')
  ) {
    return json({ error: 'Cross-origin requests are not allowed' }, 403);
  }

  const sessionId = getMcpSessionId(request);

  if (!sessionId) {
    return json({});
  }

  try {
    const serverTools = await MCPService.getInstance(sessionId).checkServersAvailabilities();
    const response = json(toMcpServerToolsSummary(serverTools));
    response.headers.set('Set-Cookie', createMcpSessionCookie(request, sessionId));

    return response;
  } catch {
    return json({ error: 'Failed to check MCP servers' }, 500);
  }
}
