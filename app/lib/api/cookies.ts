function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeCookiePart(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = Object.create(null);

  if (!cookieHeader) {
    return cookies;
  }

  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');

    if (separator <= 0) {
      continue;
    }

    const name = decodeCookiePart(item.slice(0, separator).trim());
    const value = decodeCookiePart(item.slice(separator + 1).trim());

    if (name && value !== null) {
      cookies[name] = value;
    }
  }

  return cookies;
}

function parseObjectCookie(value: string | undefined): Record<string, unknown> {
  if (!value) {
    return Object.create(null);
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!isRecord(parsed)) {
      return Object.create(null);
    }

    const result: Record<string, unknown> = Object.create(null);

    for (const [key, item] of Object.entries(parsed)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      result[key] = item;
    }

    return result;
  } catch {
    return Object.create(null);
  }
}

export function getApiKeysFromCookie(cookieHeader: string | null): Record<string, string> {
  const values = parseObjectCookie(parseCookies(cookieHeader).apiKeys);
  const apiKeys: Record<string, string> = Object.create(null);

  for (const [provider, key] of Object.entries(values)) {
    if (
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(provider) &&
      typeof key === 'string' &&
      key.length > 0 &&
      key.length <= 4_096 &&
      !/[\r\n\u0000]/.test(key)
    ) {
      apiKeys[provider] = key;
    }
  }

  return apiKeys;
}

export function getProviderSettingsFromCookie(cookieHeader: string | null): Record<string, any> {
  const values = parseObjectCookie(parseCookies(cookieHeader).providers);
  const providerSettings: Record<string, any> = Object.create(null);

  for (const [provider, settings] of Object.entries(values)) {
    if (!/^[\w-]{1,80}$/.test(provider) || !isRecord(settings)) {
      continue;
    }

    providerSettings[provider] = settings;
  }

  return providerSettings;
}
