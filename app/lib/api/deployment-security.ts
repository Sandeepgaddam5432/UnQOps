const MAX_DEPLOYMENT_FILES = 5_000;
const MAX_DEPLOYMENT_TOTAL_BYTES = 20_000_000;
const MAX_DEPLOYMENT_PATH_LENGTH = 1_024;
const encoder = new TextEncoder();

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('Origin');

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function isValidProviderToken(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 4_096 && !/[\r\n]/.test(value);
}

export function isValidProviderResourceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function hasOversizedContentLength(request: Request, maxBytes: number): boolean {
  const contentLength = request.headers.get('Content-Length');

  return contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes);
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds the configured limit');
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (hasOversizedContentLength(request, maxBytes)) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError('Request body is empty');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
}

function isSensitiveDeploymentPath(path: string): boolean {
  const segments = path.toLowerCase().split('/');
  const fileName = segments.at(-1) ?? '';

  if (segments.some((segment) => ['.git', '.ssh', '.aws'].includes(segment))) {
    return true;
  }

  if (
    segments.some((segment) => segment.startsWith('.env')) ||
    ['.npmrc', '.netrc', 'credentials', 'credentials.json', 'secrets.json', 'service-account.json'].includes(fileName)
  ) {
    return true;
  }

  if (/^(id_rsa|id_ed25519)(\.pub)?$/.test(fileName) || /^firebase-adminsdk.*\.json$/.test(fileName)) {
    return true;
  }

  return /\.(pem|p12|pfx|key|keystore|jks)$/i.test(fileName);
}

/** Validate deploy file input, remove common secret files, and enforce aggregate size limits. */
export function sanitizeDeploymentFiles(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value);

  if (entries.length === 0 || entries.length > MAX_DEPLOYMENT_FILES) {
    return null;
  }

  const files: Record<string, string> = Object.create(null);
  let totalBytes = 0;

  for (const [inputPath, content] of entries) {
    const path = inputPath.startsWith('/') ? inputPath.slice(1) : inputPath;
    const segments = path.split('/');

    if (
      !path ||
      path.length > MAX_DEPLOYMENT_PATH_LENGTH ||
      path.startsWith('/') ||
      path.includes(String.fromCharCode(92)) ||
      /[\u0000-\u001f\u007f?#]/.test(path) ||
      segments.some((segment) => !segment || segment === '.' || segment === '..') ||
      typeof content !== 'string'
    ) {
      return null;
    }

    if (isSensitiveDeploymentPath(path)) {
      continue;
    }

    if (Object.hasOwn(files, path)) {
      return null;
    }

    totalBytes += encoder.encode(content).byteLength;

    if (totalBytes > MAX_DEPLOYMENT_TOTAL_BYTES) {
      return null;
    }

    files[path] = content;
  }

  return Object.keys(files).length > 0 ? files : null;
}

export function createDeploymentName(chatId: string): string {
  const safeChatId =
    chatId
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'chat';

  return `unqops-diy-${safeChatId}-${Date.now()}`;
}
