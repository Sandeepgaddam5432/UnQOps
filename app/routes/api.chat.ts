import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream, generateId } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS, type FileMap } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { WORK_DIR } from '~/utils/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';
import { extractPropertiesFromMessage } from '~/lib/.server/llm/utils';
import type { DesignScheme } from '~/types/design-scheme';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '~/lib/api/deployment-security';
import { createMcpSessionCookie, getMcpSessionId } from '~/lib/api/mcp-security';
import { MCPService } from '~/lib/services/mcpService';

const MAX_CHAT_BODY_BYTES = 20_000_000;

interface ChatRequestBody {
  messages?: unknown;
  files?: unknown;
  promptId?: unknown;
  contextOptimization?: unknown;
  supabase?: unknown;
  chatMode?: unknown;
  designScheme?: unknown;
  maxLLMSteps?: unknown;
}

function errorResponse(message: string, status: number): Response {
  return Response.json(
    { error: true, message, statusCode: status, isRetryable: status >= 500 },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Cookie, Origin',
      },
    },
  );
}

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

const logger = createScopedLogger('api.chat');

async function chatAction({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (!isSameOriginRequest(request)) {
    return errorResponse('Same-origin requests are required', 403);
  }

  if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return errorResponse('Content-Type must be application/json', 415);
  }

  let body: ChatRequestBody;

  try {
    const parsedBody = await readJsonBody(request, MAX_CHAT_BODY_BYTES);

    if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
      return errorResponse('Invalid request body', 400);
    }

    body = parsedBody as ChatRequestBody;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return errorResponse('Chat request is too large', 413);
    }

    return errorResponse('Invalid request body', 400);
  }

  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > 500 ||
    !body.messages.every(
      (message) =>
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        ['user', 'assistant', 'system', 'tool'].includes(String(message.role)),
    ) ||
    (body.files !== undefined &&
      (typeof body.files !== 'object' || body.files === null || Array.isArray(body.files))) ||
    (body.contextOptimization !== undefined && typeof body.contextOptimization !== 'boolean') ||
    (body.chatMode !== 'discuss' && body.chatMode !== 'build') ||
    (body.promptId !== undefined && (typeof body.promptId !== 'string' || body.promptId.length > 128)) ||
    (body.supabase !== undefined &&
      body.supabase !== null &&
      (typeof body.supabase !== 'object' || Array.isArray(body.supabase))) ||
    (body.designScheme !== undefined &&
      body.designScheme !== null &&
      (typeof body.designScheme !== 'object' || Array.isArray(body.designScheme)))
  ) {
    return errorResponse('Invalid chat request fields', 400);
  }

  const messages = body.messages as Messages;
  const files = (body.files ?? {}) as any;
  const promptId = body.promptId as string | undefined;
  const contextOptimization = body.contextOptimization === true;
  const supabase = body.supabase as any;
  const chatMode = body.chatMode as 'discuss' | 'build';
  const designScheme = body.designScheme as DesignScheme | undefined;
  const maxLLMSteps =
    typeof body.maxLLMSteps === 'number' &&
    Number.isInteger(body.maxLLMSteps) &&
    body.maxLLMSteps >= 1 &&
    body.maxLLMSteps <= 20
      ? body.maxLLMSteps
      : 5;

  const cookieHeader = request.headers.get('Cookie');
  const mcpSessionId = getMcpSessionId(request);
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader) as Record<string, IProviderSetting>;

  const stream = new SwitchableStream();

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  const encoder: TextEncoder = new TextEncoder();
  let progressCounter: number = 1;

  try {
    const mcpService = MCPService.getInstance(mcpSessionId ?? 'default');
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length}, words`);

    let lastChunk: string | undefined = undefined;

    const dataStream = createDataStream({
      async execute(dataStream) {
        const filePaths = getFilePaths(files || {});
        let filteredFiles: FileMap | undefined = undefined;
        let summary: string | undefined = undefined;
        let messageSliceId = 0;

        const processedMessages = await mcpService.processToolInvocations(messages, dataStream);

        if (processedMessages.length > 3) {
          messageSliceId = processedMessages.length - 3;
        }

        if (filePaths.length > 0 && contextOptimization) {
          logger.debug('Generating Chat Summary');
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Analysing Request',
          } satisfies ProgressAnnotation);

          // Create a summary of the chat
          console.log(`Messages count: ${processedMessages.length}`);

          summary = await createSummary({
            messages: [...processedMessages],
            env: context.cloudflare?.env,
            apiKeys,
            providerSettings,
            promptId,
            contextOptimization,
            onFinish(resp) {
              if (resp.usage) {
                logger.debug('createSummary token usage', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'complete',
            order: progressCounter++,
            message: 'Analysis Complete',
          } satisfies ProgressAnnotation);

          dataStream.writeMessageAnnotation({
            type: 'chatSummary',
            summary,
            chatId: processedMessages.slice(-1)?.[0]?.id,
          } as ContextAnnotation);

          // Update context buffer
          logger.debug('Updating Context Buffer');
          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Determining Files to Read',
          } satisfies ProgressAnnotation);

          // Select context files
          console.log(`Messages count: ${processedMessages.length}`);
          filteredFiles = await selectContext({
            messages: [...processedMessages],
            env: context.cloudflare?.env,
            apiKeys,
            files,
            providerSettings,
            promptId,
            contextOptimization,
            summary,
            onFinish(resp) {
              if (resp.usage) {
                logger.debug('selectContext token usage', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });

          if (filteredFiles) {
            logger.debug(`files in context : ${JSON.stringify(Object.keys(filteredFiles))}`);
          }

          dataStream.writeMessageAnnotation({
            type: 'codeContext',
            files: Object.keys(filteredFiles).map((key) => {
              let path = key;

              if (path.startsWith(WORK_DIR)) {
                path = path.replace(WORK_DIR, '');
              }

              return path;
            }),
          } as ContextAnnotation);

          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'complete',
            order: progressCounter++,
            message: 'Code Files Selected',
          } satisfies ProgressAnnotation);

          // logger.debug('Code Files Selected');
        }

        const options: StreamingOptions = {
          supabaseConnection: supabase,
          toolChoice: 'auto',
          tools: mcpService.toolsWithoutExecute,
          maxSteps: maxLLMSteps,
          onStepFinish: ({ toolCalls }) => {
            // add tool call annotations for frontend processing
            toolCalls.forEach((toolCall) => {
              mcpService.processToolCall(toolCall, dataStream);
            });
          },
          onFinish: async ({ text: content, finishReason, usage }) => {
            logger.debug('usage', JSON.stringify(usage));

            if (usage) {
              cumulativeUsage.completionTokens += usage.completionTokens || 0;
              cumulativeUsage.promptTokens += usage.promptTokens || 0;
              cumulativeUsage.totalTokens += usage.totalTokens || 0;
            }

            if (finishReason !== 'length') {
              dataStream.writeMessageAnnotation({
                type: 'usage',
                value: {
                  completionTokens: cumulativeUsage.completionTokens,
                  promptTokens: cumulativeUsage.promptTokens,
                  totalTokens: cumulativeUsage.totalTokens,
                },
              });
              dataStream.writeData({
                type: 'progress',
                label: 'response',
                status: 'complete',
                order: progressCounter++,
                message: 'Response Generated',
              } satisfies ProgressAnnotation);
              await new Promise((resolve) => setTimeout(resolve, 0));

              // stream.close();
              return;
            }

            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
              throw Error('Cannot continue message: Maximum segments reached');
            }

            const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

            logger.info(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

            const lastUserMessage = processedMessages.filter((x) => x.role == 'user').slice(-1)[0];
            const { model, provider } = extractPropertiesFromMessage(lastUserMessage);
            processedMessages.push({ id: generateId(), role: 'assistant', content });
            processedMessages.push({
              id: generateId(),
              role: 'user',
              content: `[Model: ${model}]\n\n[Provider: ${provider}]\n\n${CONTINUE_PROMPT}`,
            });

            const result = await streamText({
              messages: [...processedMessages],
              env: context.cloudflare?.env,
              options,
              apiKeys,
              files,
              providerSettings,
              promptId,
              contextOptimization,
              contextFiles: filteredFiles,
              chatMode,
              designScheme,
              summary,
              messageSliceId,
            });

            result.mergeIntoDataStream(dataStream);

            (async () => {
              for await (const part of result.fullStream) {
                if (part.type === 'error') {
                  logger.error('Chat continuation provider stream failed');

                  return;
                }
              }
            })();

            return;
          },
        };

        dataStream.writeData({
          type: 'progress',
          label: 'response',
          status: 'in-progress',
          order: progressCounter++,
          message: 'Generating Response',
        } satisfies ProgressAnnotation);

        const result = await streamText({
          messages: [...processedMessages],
          env: context.cloudflare?.env,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
          contextOptimization,
          contextFiles: filteredFiles,
          chatMode,
          designScheme,
          summary,
          messageSliceId,
        });

        (async () => {
          for await (const part of result.fullStream) {
            if (part.type === 'error') {
              logger.error('Chat provider stream failed');

              return;
            }
          }
        })();
        result.mergeIntoDataStream(dataStream);
      },
      onError: () => 'The chat request failed',
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (!lastChunk) {
            lastChunk = ' ';
          }

          if (typeof chunk === 'string') {
            if (chunk.startsWith('g') && !lastChunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "<div class=\\"__boltThought__\\">"\n`));
            }

            if (lastChunk.startsWith('g') && !chunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "</div>\\n"\n`));
            }
          }

          lastChunk = chunk;

          let transformedChunk = chunk;

          if (typeof chunk === 'string' && chunk.startsWith('g')) {
            let content = chunk.split(':').slice(1).join(':');

            if (content.endsWith('\n')) {
              content = content.slice(0, content.length - 1);
            }

            transformedChunk = `0:${content}\n`;
          }

          // Convert the string stream to a byte stream
          const str = typeof transformedChunk === 'string' ? transformedChunk : JSON.stringify(transformedChunk);
          controller.enqueue(encoder.encode(str));
        },
      }),
    );

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Cookie, Origin',
        ...(mcpSessionId ? { 'Set-Cookie': createMcpSessionCookie(request, mcpSessionId) } : {}),
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: unknown) {
    const invalidApiKey = error instanceof Error && error.message.includes('API key');
    logger.error('Chat request failed');

    return errorResponse(
      invalidApiKey ? 'Invalid or missing API key' : 'Chat request failed',
      invalidApiKey ? 401 : 502,
    );
  }
}
