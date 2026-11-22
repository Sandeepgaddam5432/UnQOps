type CommonRequest = Omit<RequestInit, 'body'> & { body?: URLSearchParams };

/** Use the platform fetch implementation with normal certificate validation in every mode. */
export async function request(url: string, init?: CommonRequest) {
  return fetch(url, init);
}
