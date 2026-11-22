import { atom } from 'nanostores';
import type { NetlifyConnection, NetlifySite } from '~/types/netlify';
import { logStore } from './logs';
import { toast } from 'react-toastify';

function readStoredConnection(): NetlifyConnection {
  const fallback: NetlifyConnection = { user: null, token: '' };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const saved = localStorage.getItem('netlify_connection');

    if (!saved) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(saved);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }

    const connection = parsed as Partial<NetlifyConnection>;

    return {
      user: connection.user ?? null,
      token: typeof connection.token === 'string' ? connection.token : '',
      stats: connection.stats,
    };
  } catch {
    return fallback;
  }
}

export const netlifyConnection = atom<NetlifyConnection>(readStoredConnection());
export const isConnecting = atom<boolean>(false);
export const isFetchingStats = atom<boolean>(false);

export const updateNetlifyConnection = (updates: Partial<NetlifyConnection>) => {
  const newState = { ...netlifyConnection.get(), ...updates };
  netlifyConnection.set(newState);

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('netlify_connection', JSON.stringify(newState));
    }
  } catch {
    // Keep the connection active for this session if storage is blocked or full.
  }
};

export async function fetchNetlifyStats(token: string) {
  if (!token) {
    return;
  }

  try {
    isFetchingStats.set(true);

    const sitesResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sitesResponse.ok) {
      throw new Error(`Failed to fetch sites: ${sitesResponse.status}`);
    }

    const sites = (await sitesResponse.json()) as NetlifySite[];
    const typedSites = Array.isArray(sites) ? sites : [];

    updateNetlifyConnection({
      stats: {
        sites: typedSites,
        totalSites: typedSites.length,
      },
    });
  } catch (error) {
    console.error('Netlify API request failed:', error instanceof Error ? error.message : 'Unknown error');
    logStore.logError('Failed to fetch Netlify stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    toast.error('Failed to fetch Netlify statistics');
  } finally {
    isFetchingStats.set(false);
  }
}
