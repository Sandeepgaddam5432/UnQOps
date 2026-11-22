import { describe, expect, it } from 'vitest';
import {
  createDeploymentName,
  hasOversizedContentLength,
  isSameOriginRequest,
  isValidProviderResourceId,
  isValidProviderToken,
  readJsonBody,
  RequestBodyTooLargeError,
  sanitizeDeploymentFiles,
} from './deployment-security';

describe('deployment request safeguards', () => {
  it('requires an exact same-origin request', () => {
    expect(
      isSameOriginRequest(new Request('https://app.test/api/deploy', { headers: { Origin: 'https://app.test' } })),
    ).toBe(true);
    expect(
      isSameOriginRequest(new Request('https://app.test/api/deploy', { headers: { Origin: 'https://attacker.test' } })),
    ).toBe(false);
    expect(isSameOriginRequest(new Request('https://app.test/api/deploy'))).toBe(false);
  });

  it('validates provider credentials and IDs before using them in requests', () => {
    expect(isValidProviderToken('user-token')).toBe(true);
    expect(isValidProviderToken('bad\ntoken')).toBe(false);
    expect(isValidProviderToken('')).toBe(false);
    expect(isValidProviderResourceId('prj_test-123')).toBe(true);
    expect(isValidProviderResourceId('../projects')).toBe(false);
  });

  it('strips common secret files and normalizes safe paths', () => {
    expect(
      sanitizeDeploymentFiles({
        '/index.html': '<main>ready</main>',
        '.env.production': 'private=value',
        'src/.env.local': 'private=value',
        '.git/config': 'private=value',
        'src/app.js': 'console.log("ok")',
      }),
    ).toEqual({
      'index.html': '<main>ready</main>',
      'src/app.js': 'console.log("ok")',
    });
  });

  it('rejects traversal paths, non-string file content, and empty sanitized deployments', () => {
    expect(sanitizeDeploymentFiles({ '../secret.txt': 'secret' })).toBeNull();
    expect(sanitizeDeploymentFiles({ 'index.html': 42 })).toBeNull();
    expect(sanitizeDeploymentFiles({ '.env': 'secret' })).toBeNull();
  });

  it('rejects declared request bodies over the configured limit', () => {
    const request = new Request('https://app.test/api/deploy', {
      headers: { 'Content-Length': '2048' },
    });

    expect(hasOversizedContentLength(request, 1024)).toBe(true);
    expect(hasOversizedContentLength(new Request('https://app.test/api/deploy'), 1024)).toBe(false);
  });

  it('limits streamed JSON bodies even when Content-Length is absent', async () => {
    const request = new Request('https://app.test/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'a'.repeat(100) }),
    });

    await expect(readJsonBody(request, 32)).rejects.toBeInstanceOf(RequestBodyTooLargeError);

    const validRequest = new Request('https://app.test/api/deploy', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
    });
    await expect(readJsonBody(validRequest, 100)).resolves.toEqual({ ok: true });
  });

  it('creates provider-safe project names from arbitrary chat IDs', () => {
    const name = createDeploymentName('chat/with whitespace and #chars');

    expect(name).toMatch(/^unqops-diy-chat-with-whitespace-and-chars-\d+$/);
  });
});
