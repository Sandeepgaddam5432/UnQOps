import { json, type LoaderFunction } from '@remix-run/cloudflare';

async function checkReachability(url: string): Promise<{ isReachable: boolean; status?: number }> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return { isReachable: response.ok, status: response.status };
  } catch {
    return { isReachable: false };
  }
}

export const loader: LoaderFunction = async () => {
  const [github, netlify] = await Promise.all([
    checkReachability('https://api.github.com/zen'),
    checkReachability('https://api.netlify.com/api/v1/'),
  ]);

  return json(
    {
      status: 'success',
      serverTimestamp: new Date().toISOString(),
      externalApis: { github, netlify },
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
};
