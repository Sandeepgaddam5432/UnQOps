export function isLoopbackMcpHost(hostname: string): boolean {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function isIpLiteral(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  return normalized.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized);
}

export function isSafeMcpRemoteUrl(value: string, allowLocalDevelopment = false): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '')
      .replace(/\.$/, '');
    const localHost = isLoopbackMcpHost(url.hostname);

    if (url.username || url.password || url.hash) {
      return false;
    }

    if (localHost) {
      return allowLocalDevelopment && ['http:', 'https:'].includes(url.protocol);
    }

    if (
      url.protocol !== 'https:' ||
      isIpLiteral(url.hostname) ||
      !hostname.includes('.') ||
      ['.localhost', '.local', '.internal', '.test', '.example', '.invalid'].some((suffix) => hostname.endsWith(suffix))
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
