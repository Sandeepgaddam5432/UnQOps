import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting } from '~/types/model';
import { generateText } from 'ai';
import { PROVIDER_LIST } from '~/utils/constants';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '~/lib/api/deployment-security';

const MAX_REQUEST_BYTES = 1_000_000;
const logger = createScopedLogger('api.llmcall');

interface LlmCallBody {
  system?: unknown;
  message?: unknown;
  model?: unknown;
  provider?: unknown;
  streamOutput?: unknown;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie, Origin',
    },
  });
}

export async function action(args: ActionFunctionArgs) {
  return llmCallAction(args);
}

async function getModelList(options: {
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  serverEnv?: Record<string, string>;
}) {
  const llmManager = LLMManager.getInstance(import.meta.env);
  return llmManager.updateModelList(options);
}

async function llmCallAction({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: true, message: 'Method not allowed' }, 405);
  }

  if (!isSameOriginRequest(request)) {
    return json({ error: true, message: 'Same-origin requests are required' }, 403);
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: true, message: 'Content-Type must be application/json' }, 415);
  }

  let body: LlmCallBody;

  try {
    const parsedBody = await readJsonBody(request, MAX_REQUEST_BYTES);

    if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
      return json({ error: true, message: 'Invalid request body' }, 400);
    }

    body = parsedBody as LlmCallBody;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: true, message: 'Request is too large' }, 413);
    }

    return json({ error: true, message: 'Invalid request body' }, 400);
  }

  const { system, message, model, provider, streamOutput } = body;
  const providerName =
    typeof provider === 'object' && provider !== null && !Array.isArray(provider) && 'name' in provider
      ? provider.name
      : undefined;

  if (
    typeof message !== 'string' ||
    message.length === 0 ||
    typeof model !== 'string' ||
    model.length === 0 ||
    model.length > 256 ||
    typeof providerName !== 'string' ||
    providerName.length === 0 ||
    providerName.length > 80 ||
    !PROVIDER_LIST.some((item) => item.name === providerName) ||
    (system !== undefined && typeof system !== 'string') ||
    (streamOutput !== undefined && typeof streamOutput !== 'boolean')
  ) {
    return json({ error: true, message: 'Invalid or missing model request fields' }, 400);
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  if (streamOutput) {
    try {
      const result = await streamText({
        options: {
          system: typeof system === 'string' ? system : undefined,
        },
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        env: context.cloudflare?.env as any,
        apiKeys,
        providerSettings,
      });

      return new Response(result.textStream, {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          Vary: 'Cookie, Origin',
        },
      });
    } catch (error: unknown) {
      const invalidApiKey = error instanceof Error && error.message.includes('API key');
      return json(
        { error: true, message: invalidApiKey ? 'Invalid or missing API key' : 'The provider request failed' },
        invalidApiKey ? 401 : 502,
      );
    }
  }

  try {
    const models = await getModelList({ apiKeys, providerSettings, serverEnv: context.cloudflare?.env as any });
    const modelDetails = models.find((item: ModelInfo) => item.name === model);

    if (!modelDetails) {
      return json({ error: true, message: 'Model not found' }, 400);
    }

    const dynamicMaxTokens = modelDetails.maxTokenAllowed || MAX_TOKENS;
    const providerInfo = PROVIDER_LIST.find((item) => item.name === providerName);

    if (!providerInfo) {
      return json({ error: true, message: 'Provider not found' }, 400);
    }

    logger.info(`Generating response Provider: ${providerInfo.name}, Model: ${modelDetails.name}`);

    const result = await generateText({
      system: typeof system === 'string' ? system : undefined,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      model: providerInfo.getModelInstance({
        model: modelDetails.name,
        serverEnv: context.cloudflare?.env as any,
        apiKeys,
        providerSettings,
      }),
      maxTokens: dynamicMaxTokens,
      toolChoice: 'none',
    });

    logger.info('Generated response');

    return json(result);
  } catch (error: unknown) {
    const invalidApiKey = error instanceof Error && error.message.includes('API key');
    const rawStatus =
      typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined;
    const statusCode = invalidApiKey
      ? 401
      : typeof rawStatus === 'number' && Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
        ? rawStatus
        : 502;
    const responseProvider = PROVIDER_LIST.some((item) => item.name === providerName) ? providerName : 'unknown';

    return json(
      {
        error: true,
        message: invalidApiKey ? 'Invalid or missing API key' : 'The provider request failed',
        statusCode,
        isRetryable: statusCode !== 401 && statusCode !== 400,
        provider: responseProvider,
      },
      statusCode,
    );
  }
}
