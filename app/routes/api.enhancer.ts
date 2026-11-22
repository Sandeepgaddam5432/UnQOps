import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { PROVIDER_LIST } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';
import { isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '~/lib/api/deployment-security';

const MAX_REQUEST_BYTES = 1_000_000;
const logger = createScopedLogger('api.enhancher');

function errorResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie, Origin',
    },
  });
}

export async function action({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (!isSameOriginRequest(request)) {
    return errorResponse('Same-origin requests are required', 403);
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return errorResponse('Content-Type must be application/json', 415);
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    return errorResponse(
      error instanceof RequestBodyTooLargeError ? 'Request is too large' : 'Invalid request body',
      error instanceof RequestBodyTooLargeError ? 413 : 400,
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return errorResponse('Invalid request body', 400);
  }

  const { message, model, provider } = body as { message?: unknown; model?: unknown; provider?: unknown };
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
    !PROVIDER_LIST.some((item) => item.name === providerName)
  ) {
    return errorResponse('Invalid or missing provider request fields', 400);
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content:
            `[Model: ${model}]\n\n[Provider: ${providerName}]\n\n` +
            stripIndents`
            You are a professional prompt engineer specializing in crafting precise, effective prompts.
            Your task is to enhance prompts by making them more specific, actionable, and effective.

            I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

            For valid prompts:
            - Make instructions explicit and unambiguous
            - Add relevant context and constraints
            - Remove redundant information
            - Maintain the core intent
            - Ensure the prompt is self-contained
            - Use professional language

            For invalid or unclear prompts:
            - Respond with clear, professional guidance
            - Keep responses concise and actionable
            - Maintain a helpful, constructive tone
            - Focus on what the user should provide
            - Use a standard template for consistency

            IMPORTANT: Your response must ONLY contain the enhanced prompt text.
            Do not include any explanations, metadata, or wrapper tags.

            <original_prompt>
              ${message}
            </original_prompt>
          `,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
      options: {
        system:
          'You are a senior software principal architect, you should help the user analyse the user query and enrich it with the necessary context and constraints to make it more specific, actionable, and effective. You should also ensure that the prompt is self-contained and uses professional language. Your response should ONLY contain the enhanced prompt text. Do not include any explanations, metadata, or wrapper tags.',
      },
    });

    void (async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'error') {
            logger.error('Prompt enhancement provider stream failed');
            break;
          }
        }
      } catch {
        logger.error('Prompt enhancement stream processing failed');
      }
    })();

    return new Response(result.textStream, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        Vary: 'Cookie, Origin',
      },
    });
  } catch (error: unknown) {
    const invalidApiKey = error instanceof Error && error.message.includes('API key');
    logger.error('Prompt enhancement request failed');

    return errorResponse(
      invalidApiKey ? 'Invalid or missing API key' : 'Prompt enhancement failed',
      invalidApiKey ? 401 : 502,
    );
  }
}
