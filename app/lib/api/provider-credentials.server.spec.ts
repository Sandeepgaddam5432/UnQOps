import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearProviderCredentialCookies,
  createProviderCredentialCookie,
  getProviderCredential,
  InvalidProviderCredentialError,
  CredentialStoreUnavailableError,
  PROVIDER_CREDENTIAL_MAX_AGE_SECONDS,
} from '~/lib/api/provider-credentials.server';

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(37)));
const context = { cloudflare: { env: { UNQOPS_CREDENTIALS_ENCRYPTION_KEY: KEY } } };

function cookiePair(setCookie: string): string {
  return setCookie.split(';', 1)[0];
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('encrypted provider credential cookies', () => {
  it('stores a credential in a host-only HttpOnly cookie and decrypts it server-side', async () => {
    const request = new Request('https://unqops.test/api/credentials');
    const setCookie = await createProviderCredentialCookie(
      request,
      'github',
      { token: 'ghp-safe-test-value' },
      context,
    );
    const parsed = new Request(request.url, { headers: { Cookie: cookiePair(setCookie) } });

    expect(setCookie).toContain('__Host-unqops_credential_github=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain(`Max-Age=${PROVIDER_CREDENTIAL_MAX_AGE_SECONDS}`);
    expect(setCookie).not.toContain('ghp-safe-test-value');
    await expect(getProviderCredential(parsed, 'github', context)).resolves.toEqual({ token: 'ghp-safe-test-value' });
  });

  it('uses a non-Secure host-only cookie for local HTTP and never sets a Domain attribute', async () => {
    const setCookie = await createProviderCredentialCookie(
      new Request('http://localhost:5173/api/credentials'),
      'netlify',
      { token: 'netlify-test' },
      context,
    );

    expect(setCookie).toContain('unqops_credential_netlify=');
    expect(setCookie).not.toContain('__Host-');
    expect(setCookie).not.toContain('Secure');
    expect(setCookie).not.toContain('Domain=');
  });

  it('rejects a modified ciphertext and ciphertext moved to another provider cookie', async () => {
    const request = new Request('https://unqops.test/api/credentials');
    const setCookie = await createProviderCredentialCookie(request, 'github', { token: 'github-secret' }, context);
    const [name, value] = cookiePair(setCookie).split('=');
    const tamperedValue = `${value.slice(0, -1)}${value.endsWith('A') ? 'B' : 'A'}`;
    const tamperedRequest = new Request(request.url, { headers: { Cookie: `${name}=${tamperedValue}` } });
    const movedRequest = new Request(request.url, {
      headers: { Cookie: `__Host-unqops_credential_netlify=${value}` },
    });

    await expect(getProviderCredential(tamperedRequest, 'github', context)).resolves.toBeNull();
    await expect(getProviderCredential(movedRequest, 'netlify', context)).resolves.toBeNull();
  });

  it('expires credentials based on the authenticated envelope as well as cookie Max-Age', async () => {
    const issuedAt = new Date('2026-11-21T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(issuedAt);

    const request = new Request('https://unqops.test/api/credentials');
    const setCookie = await createProviderCredentialCookie(request, 'vercel', { token: 'vercel-test' }, context);
    const cookieRequest = new Request(request.url, { headers: { Cookie: cookiePair(setCookie) } });

    vi.setSystemTime(issuedAt.getTime() + (PROVIDER_CREDENTIAL_MAX_AGE_SECONDS + 1) * 1_000);

    await expect(getProviderCredential(cookieRequest, 'vercel', context)).resolves.toBeNull();
  });

  it('fails closed if the server encryption key is missing or malformed', async () => {
    const request = new Request('https://unqops.test/api/credentials');
    vi.stubEnv('UNQOPS_CREDENTIALS_ENCRYPTION_KEY', '');

    await expect(createProviderCredentialCookie(request, 'github', { token: 'secret' }, {})).rejects.toBeInstanceOf(
      CredentialStoreUnavailableError,
    );
    await expect(
      createProviderCredentialCookie(
        request,
        'github',
        { token: 'secret' },
        { cloudflare: { env: { UNQOPS_CREDENTIALS_ENCRYPTION_KEY: 'not-a-32-byte-key' } } },
      ),
    ).rejects.toBeInstanceOf(CredentialStoreUnavailableError);
  });

  it('rejects unsupported credential fields, invalid Cloudflare account IDs, and oversized values', async () => {
    const request = new Request('https://unqops.test/api/credentials');

    await expect(
      createProviderCredentialCookie(request, 'github', { token: 'secret', username: 'alice' }, context),
    ).rejects.toBeInstanceOf(InvalidProviderCredentialError);
    await expect(
      createProviderCredentialCookie(request, 'cloudflare', { token: 'secret', accountId: 'invalid' }, context),
    ).rejects.toBeInstanceOf(InvalidProviderCredentialError);
    await expect(
      createProviderCredentialCookie(request, 'github', { token: 'x'.repeat(2_500) }, context),
    ).rejects.toBeInstanceOf(InvalidProviderCredentialError);
  });

  it('expires both secure and non-secure cookie names plus legacy readable credentials', () => {
    const secureCookies = clearProviderCredentialCookies(new Request('https://unqops.test'), 'github');
    const localCookies = clearProviderCredentialCookies(new Request('http://localhost:5173'), 'netlify');

    expect(secureCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('__Host-unqops_credential_github=; Max-Age=0'),
        expect.stringContaining('unqops_credential_github=; Max-Age=0'),
        expect.stringContaining('githubToken=; Max-Age=0'),
        expect.stringContaining('git:github.com=; Max-Age=0'),
      ]),
    );
    expect(localCookies).toEqual(expect.arrayContaining([expect.stringContaining('netlifyToken=; Max-Age=0')]));
  });
});
