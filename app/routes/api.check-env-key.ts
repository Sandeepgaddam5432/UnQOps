import type { LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';

function json(data: unknown): Response {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
    },
  });
}

export const loader: LoaderFunction = async ({ context, request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider) {
    return json({ isSet: false });
  }

  const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);
  const providerInstance = llmManager.getProvider(provider);

  if (!providerInstance || !providerInstance.config.apiTokenKey) {
    return json({ isSet: false });
  }

  const envVarName = providerInstance.config.apiTokenKey;

  // This endpoint reports only server-side environment credentials, never user-managed cookie values.
  const isSet = !!(
    (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
    process.env[envVarName] ||
    llmManager.env[envVarName]
  );

  return json({ isSet });
};
