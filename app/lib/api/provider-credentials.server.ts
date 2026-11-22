import { parseCookies } from '~/lib/api/cookies';

export const PROVIDER_CREDENTIAL_PROVIDERS = ['github', 'netlify', 'vercel', 'supabase', 'cloudflare'] as const;

export type ProviderCredentialProvider = (typeof PROVIDER_CREDENTIAL_PROVIDERS)[number];

export type ProviderCredential = { token: string } | { token: string; accountId: string };

export const PROVIDER_CREDENTIAL_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const PROVIDER_CREDENTIAL_MAX_PLAINTEXT_BYTES = 2_500;
export const PROVIDER_CREDENTIAL_MAX_COOKIE_VALUE_BYTES = 3_800;

const COOKIE_PREFIX = 'unqops_credential_';
const LEGACY_COOKIES: Record<ProviderCredentialProvider, string[]> = {
  github: ['githubToken', 'github_token', 'githubUsername', 'git:github.com'],
  netlify: ['netlifyToken'],
  vercel: [],
  supabase: [],
  cloudflare: [],
};
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export class CredentialStoreUnavailableError extends Error {
  constructor() {
    super('Credential storage is not configured');
    this.name = 'CredentialStoreUnavailableError';
  }
}

export class InvalidProviderCredentialError extends Error {
  constructor() {
    super('Provider credential is invalid or exceeds the supported size');
    this.name = 'InvalidProviderCredentialError';
  }
}

interface CredentialEnvelope {
  version: 1;
  provider: ProviderCredentialProvider;
  issuedAt: number;
  expiresAt: number;
  credential: ProviderCredential;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isProviderCredentialProvider(value: unknown): value is ProviderCredentialProvider {
  return typeof value === 'string' && (PROVIDER_CREDENTIAL_PROVIDERS as readonly string[]).includes(value);
}

export function validateProviderCredential(
  provider: ProviderCredentialProvider,
  value: unknown,
): ProviderCredential | null {
  if (!isRecord(value)) {
    return null;
  }

  const allowedKeys = provider === 'cloudflare' ? ['token', 'accountId'] : ['token'];

  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    return null;
  }

  if (typeof value.token !== 'string' || value.token.trim().length === 0 || /[\u0000-\u001f\u007f]/.test(value.token)) {
    return null;
  }

  const token = value.token.trim();

  if (provider === 'cloudflare') {
    if (typeof value.accountId !== 'string' || !/^[a-f0-9]{32}$/i.test(value.accountId)) {
      return null;
    }

    return { token, accountId: value.accountId.toLowerCase() };
  }

  return { token };
}

function getEncryptionKey(context: unknown): string | undefined {
  if (isRecord(context) && Object.hasOwn(context, 'cloudflare')) {
    const cloudflare = context.cloudflare;
    const environment = isRecord(cloudflare) && isRecord(cloudflare.env) ? cloudflare.env : undefined;
    const binding = environment?.UNQOPS_CREDENTIALS_ENCRYPTION_KEY;

    return typeof binding === 'string' && binding.length > 0 ? binding : undefined;
  }

  if (typeof process !== 'undefined' && typeof process.env?.UNQOPS_CREDENTIALS_ENCRYPTION_KEY === 'string') {
    return process.env.UNQOPS_CREDENTIALS_ENCRYPTION_KEY;
  }

  return undefined;
}

function decodeBase64Key(value: string): Uint8Array | null {
  if (
    value.length < 43 ||
    value.length > 44 ||
    !/^[A-Za-z0-9+/_-]+={0,2}$/.test(value) ||
    ((value.includes('+') || value.includes('/')) && (value.includes('-') || value.includes('_')))
  ) {
    return null;
  }

  const standard = value.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');

  if (standard.length !== 43 || standard.length % 4 === 0) {
    return null;
  }

  try {
    const binary = atob(`${standard}=`);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return bytes.byteLength === 32 ? bytes : null;
  } catch {
    return null;
  }
}

async function importEncryptionKey(context: unknown): Promise<CryptoKey> {
  const value = getEncryptionKey(context);
  const rawKey = value ? decodeBase64Key(value) : null;

  if (!rawKey || !globalThis.crypto?.subtle) {
    throw new CredentialStoreUnavailableError();
  }

  try {
    return await globalThis.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  } catch {
    throw new CredentialStoreUnavailableError();
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > PROVIDER_CREDENTIAL_MAX_COOKIE_VALUE_BYTES) {
    return null;
  }

  try {
    const standard = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return encodeBase64Url(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function cookieName(request: Request, provider: ProviderCredentialProvider): string {
  const prefix = new URL(request.url).protocol === 'https:' ? '__Host-' : '';

  return `${prefix}${COOKIE_PREFIX}${provider}`;
}

function aadFor(provider: ProviderCredentialProvider): Uint8Array {
  return encoder.encode(`unqops-provider-credential:v1:${provider}`);
}

function isValidEnvelope(
  value: unknown,
  provider: ProviderCredentialProvider,
  now: number,
): value is CredentialEnvelope {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.provider !== provider ||
    typeof value.issuedAt !== 'number' ||
    typeof value.expiresAt !== 'number' ||
    !Number.isSafeInteger(value.issuedAt) ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.issuedAt > now + 60_000 ||
    value.expiresAt <= now ||
    value.expiresAt - value.issuedAt !== PROVIDER_CREDENTIAL_MAX_AGE_SECONDS * 1_000
  ) {
    return false;
  }

  return validateProviderCredential(provider, value.credential) !== null;
}

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

function serializeCookie(request: Request, name: string, value: string, maxAge: number): string {
  const secure = isSecureRequest(request);
  const parts = [`${name}=${value}`, `Max-Age=${maxAge}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export async function createProviderCredentialCookie(
  request: Request,
  provider: ProviderCredentialProvider,
  rawCredential: unknown,
  context: unknown,
  now = Date.now(),
): Promise<string> {
  const credential = validateProviderCredential(provider, rawCredential);

  if (!credential) {
    throw new InvalidProviderCredentialError();
  }

  const envelope: CredentialEnvelope = {
    version: 1,
    provider,
    issuedAt: now,
    expiresAt: now + PROVIDER_CREDENTIAL_MAX_AGE_SECONDS * 1_000,
    credential,
  };
  const plaintext = encoder.encode(JSON.stringify(envelope));

  if (plaintext.byteLength > PROVIDER_CREDENTIAL_MAX_PLAINTEXT_BYTES) {
    throw new InvalidProviderCredentialError();
  }

  const key = await importEncryptionKey(context);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  let encrypted: ArrayBuffer;

  try {
    encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aadFor(provider), tagLength: 128 },
      key,
      plaintext,
    );
  } catch {
    throw new CredentialStoreUnavailableError();
  }

  const value = `v1.${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;

  if (encoder.encode(value).byteLength > PROVIDER_CREDENTIAL_MAX_COOKIE_VALUE_BYTES) {
    throw new InvalidProviderCredentialError();
  }

  return serializeCookie(request, cookieName(request, provider), value, PROVIDER_CREDENTIAL_MAX_AGE_SECONDS);
}

export async function getProviderCredential(
  request: Request,
  provider: ProviderCredentialProvider,
  context: unknown,
  now = Date.now(),
): Promise<ProviderCredential | null> {
  const value = parseCookies(request.headers.get('Cookie'))[cookieName(request, provider)];

  if (!value || encoder.encode(value).byteLength > PROVIDER_CREDENTIAL_MAX_COOKIE_VALUE_BYTES) {
    return null;
  }

  const match = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(value);

  if (!match) {
    return null;
  }

  const iv = decodeBase64Url(match[1]);
  const ciphertext = decodeBase64Url(match[2]);

  if (!iv || iv.byteLength !== 12 || !ciphertext || ciphertext.byteLength < 16) {
    return null;
  }

  const key = await importEncryptionKey(context);

  try {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aadFor(provider), tagLength: 128 },
      key,
      ciphertext,
    );
    const envelope: unknown = JSON.parse(decoder.decode(plaintext));

    if (!isValidEnvelope(envelope, provider, now)) {
      return null;
    }

    return validateProviderCredential(provider, envelope.credential);
  } catch {
    return null;
  }
}

function expiredCookie(request: Request, name: string): string {
  const secure = isSecureRequest(request);
  const expired = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Strict`;

  return secure ? `${expired}; Secure` : expired;
}

export function clearLegacyProviderCredentialCookies(request: Request, provider: ProviderCredentialProvider): string[] {
  return LEGACY_COOKIES[provider].map((name) => expiredCookie(request, name));
}

export function clearProviderCredentialCookies(request: Request, provider: ProviderCredentialProvider): string[] {
  const names = new Set([cookieName(request, provider), `${COOKIE_PREFIX}${provider}`]);

  return [
    ...Array.from(names, (name) => expiredCookie(request, name)),
    ...clearLegacyProviderCredentialCookies(request, provider),
  ];
}
