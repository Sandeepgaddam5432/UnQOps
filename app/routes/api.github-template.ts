import { json } from '@remix-run/cloudflare';

const GITHUB_API = 'https://api.github.com';
const MAX_FILES = 300;
const MAX_TEMPLATE_FILE_BYTES = 100_000;
const MAX_LOCK_FILE_BYTES = 1_000_000;
const MAX_TOTAL_FILE_BYTES = 5_000_000;
const ALLOWED_TEMPLATE_REPOSITORIES = new Set(
  [
    'xKevIsDev/unqops-expo-template',
    'xKevIsDev/unqops-astro-basic-template',
    'xKevIsDev/unqops-nextjs-shadcn-template',
    'xKevIsDev/vite-shadcn',
    'xKevIsDev/unqops-qwik-ts-template',
    'xKevIsDev/unqops-remix-ts-template',
    'xKevIsDev/unqops-slidev-template',
    'xKevIsDev/vanilla-vite-template',
    'xKevIsDev/unqops-vite-react-ts-template',
    'xKevIsDev/unqops-vite-ts-template',
    'xKevIsDev/unqops-vue-template',
    'xKevIsDev/unqops-angular-template',
    'xKevIsDev/solidjs-ts-tw',
  ].map((repo) => repo.toLowerCase()),
);

interface GitHubTreeEntry {
  path: string;
  type: string;
  size?: number;
}

interface GitHubContentResponse {
  content?: string;
  encoding?: string;
}

function isValidPublicRepository(value: string): boolean {
  const parts = value.split('/');

  return (
    parts.length === 2 &&
    parts.every((part) => /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(part) && part !== '.' && part !== '..') &&
    ALLOWED_TEMPLATE_REPOSITORIES.has(value.toLowerCase())
  );
}

function isSafeTemplatePath(path: string): boolean {
  const segments = path.split('/');

  return (
    path.length > 0 &&
    path.length <= 512 &&
    !path.startsWith('/') &&
    !path.includes(String.fromCharCode(92)) &&
    !/[\u0000-\u001f\u007f"&<>]/.test(path) &&
    segments.every((segment) => segment && segment !== '.' && segment !== '..' && segment !== '.git')
  );
}

function isLockFile(path: string): boolean {
  return ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(path.split('/').pop() ?? '');
}

function isSensitiveTemplatePath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/');
  const fileName = normalized.split('/').pop()?.toLowerCase() ?? '';
  const safeEnvExamples = new Set(['.env.example', '.env.sample', '.env.template']);

  if (fileName.startsWith('.env') && !safeEnvExamples.has(fileName)) {
    return true;
  }

  if (['.npmrc', '.netrc', 'credentials.json', 'secrets.json', 'service-account.json'].includes(fileName)) {
    return true;
  }

  if (/^(id_rsa|id_ed25519)(\.pub)?$/.test(fileName)) {
    return true;
  }

  if (/\.(pem|p12|pfx|key|keystore)$/i.test(fileName)) {
    return true;
  }

  return false;
}

function decodeBase64Utf8(value: string, maxBytes: number): { content: string; byteLength: number } | null {
  if (value.length > maxBytes * 2) {
    return null;
  }

  const normalized = value.replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  if (bytes.byteLength > maxBytes) {
    return null;
  }

  const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);

  return { content, byteLength: bytes.byteLength };
}

async function fetchPublicRepositoryFiles(
  repo: string,
  signal: AbortSignal,
): Promise<Array<{ name: string; path: string; content: string }>> {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'UnQOps-app',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const repoResponse = await fetch(`${GITHUB_API}/repos/${repo}`, { headers, signal });

  if (!repoResponse.ok) {
    throw new Error('Repository not found or unavailable');
  }

  const repository = (await repoResponse.json()) as { default_branch?: string };
  const branch = repository.default_branch;

  if (!branch || !/^[A-Za-z0-9_.\/-]{1,255}$/.test(branch)) {
    throw new Error('Repository branch unavailable');
  }

  const treeResponse = await fetch(`${GITHUB_API}/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
    headers,
    signal,
  });

  if (!treeResponse.ok) {
    throw new Error('Repository files unavailable');
  }

  const tree = (await treeResponse.json()) as { tree?: GitHubTreeEntry[]; truncated?: boolean };
  let totalSelectedBytes = 0;
  let selectedFileCount = 0;
  const files = (Array.isArray(tree.tree) ? tree.tree : []).filter((entry) => {
    if (selectedFileCount >= MAX_FILES || entry.type !== 'blob' || !entry.path || !isSafeTemplatePath(entry.path)) {
      return false;
    }

    if (isSensitiveTemplatePath(entry.path)) {
      return false;
    }

    const size = entry.size;

    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0) {
      return false;
    }

    const maxFileSize = isLockFile(entry.path) ? MAX_LOCK_FILE_BYTES : MAX_TEMPLATE_FILE_BYTES;

    if (size > maxFileSize || totalSelectedBytes + size > MAX_TOTAL_FILE_BYTES) {
      return false;
    }

    selectedFileCount += 1;
    totalSelectedBytes += size;

    return true;
  });

  const results: Array<{ name: string; path: string; content: string }> = [];
  let totalFetchedBytes = 0;

  for (let offset = 0; offset < files.length; offset += 10) {
    const batch = files.slice(offset, offset + 10);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
        const response = await fetch(
          `${GITHUB_API}/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
          {
            headers,
            signal,
          },
        );

        if (!response.ok) {
          return null;
        }

        const content = (await response.json()) as GitHubContentResponse;

        if (content.encoding !== 'base64' || typeof content.content !== 'string') {
          return null;
        }

        try {
          const decoded = decodeBase64Utf8(
            content.content,
            isLockFile(file.path) ? MAX_LOCK_FILE_BYTES : MAX_TEMPLATE_FILE_BYTES,
          );

          if (!decoded) {
            return null;
          }

          return {
            name: file.path.split('/').pop() ?? '',
            path: file.path,
            content: decoded.content,
            byteLength: decoded.byteLength,
          };
        } catch {
          return null;
        }
      }),
    );

    for (const file of batchResults) {
      if (!file || totalFetchedBytes + file.byteLength > MAX_TOTAL_FILE_BYTES) {
        continue;
      }

      results.push({ name: file.name, path: file.path, content: file.content });
      totalFetchedBytes += file.byteLength;
    }

    if (offset + 10 < files.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

export async function loader({ request }: { request: Request }) {
  const repo = new URL(request.url).searchParams.get('repo')?.trim() ?? '';
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

  if (!isValidPublicRepository(repo)) {
    return json({ error: 'A supported public starter repository is required' }, { status: 400, headers });
  }

  try {
    /*
     * Intentionally unauthenticated: this route only imports public template repositories.
     * Never use a server-side GitHub token here, because callers can choose the repository.
     */
    const files = await fetchPublicRepositoryFiles(repo, request.signal);
    return json(files, { headers });
  } catch {
    return json({ error: 'Unable to load files from this public repository' }, { status: 404, headers });
  }
}
