import { atom } from 'nanostores';
import type { SupabaseUser, SupabaseStats, SupabaseApiKey, SupabaseCredentials } from '~/types/supabase';

export interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  organization_id: string;
  status: string;
  database?: {
    host: string;
    version: string;
    postgres_engine: string;
    release_channel: string;
  };
  created_at: string;
}

export interface SupabaseConnectionState {
  user: SupabaseUser | null;

  /** Ephemeral input only. Cleared after a successful server-side connection. */
  token: string;
  stats?: SupabaseStats;
  selectedProjectId?: string;
  isConnected?: boolean;
  project?: SupabaseProject;

  /** The Supabase anon/publishable key is public by design and exists only in memory. */
  credentials?: SupabaseCredentials;
}

const initialState: SupabaseConnectionState = {
  user: null,
  token: '',
  stats: undefined,
  selectedProjectId: undefined,
  isConnected: false,
  project: undefined,
  credentials: undefined,
};

// Remove credentials persisted by older versions without reading or parsing their values.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('supabase_connection');
    window.localStorage.removeItem('supabaseCredentials');
  } catch {
    // Storage can be unavailable in private browsing contexts; the server cookie remains authoritative.
  }
}

export const supabaseConnection = atom<SupabaseConnectionState>(initialState);

export const isConnecting = atom(false);
export const isFetchingStats = atom(false);
export const isFetchingApiKeys = atom(false);

export function updateSupabaseConnection(connection: Partial<SupabaseConnectionState>) {
  const currentState = supabaseConnection.get();
  const nextConnection = { ...connection };

  if (connection.user === null && connection.isConnected === undefined) {
    nextConnection.isConnected = false;
  } else if (connection.user && connection.isConnected === undefined) {
    nextConnection.isConnected = true;
  }

  if (connection.selectedProjectId !== undefined) {
    if (connection.selectedProjectId && currentState.stats?.projects) {
      const selectedProject = currentState.stats.projects.find(
        (project) => project.id === connection.selectedProjectId,
      );

      if (selectedProject) {
        nextConnection.project = selectedProject;
      } else {
        nextConnection.project = {
          id: connection.selectedProjectId,
          name: `Project ${connection.selectedProjectId.substring(0, 8)}...`,
          region: 'unknown',
          organization_id: '',
          status: 'active',
          created_at: new Date().toISOString(),
        };
      }
    } else if (connection.selectedProjectId === '') {
      nextConnection.project = undefined;
      nextConnection.credentials = undefined;
    }
  }

  supabaseConnection.set({ ...currentState, ...nextConnection });
}

export async function fetchSupabaseStats() {
  isFetchingStats.set(true);

  try {
    const response = await fetch('/api/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        updateSupabaseConnection({ user: null, isConnected: false, credentials: undefined });
      }

      throw new Error('Failed to fetch Supabase projects');
    }

    const data = (await response.json()) as { user: SupabaseUser; stats: SupabaseStats };

    updateSupabaseConnection({
      user: data.user,
      stats: data.stats,
      isConnected: true,
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch Supabase projects');
  } finally {
    isFetchingStats.set(false);
  }
}

export async function fetchProjectApiKeys(projectId: string) {
  isFetchingApiKeys.set(true);

  try {
    const response = await fetch('/api/supabase/variables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch public project API keys');
    }

    const data = (await response.json()) as { apiKeys: SupabaseApiKey[] };
    const anonKey = data.apiKeys.find((key) => ['anon', 'public', 'publishable'].includes(key.name));

    if (anonKey) {
      const supabaseUrl = `https://${projectId}.supabase.co`;
      updateSupabaseConnection({ credentials: { anonKey: anonKey.api_key, supabaseUrl } });

      return { anonKey: anonKey.api_key, supabaseUrl };
    }

    updateSupabaseConnection({ credentials: undefined });

    return null;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch public project API keys');
  } finally {
    isFetchingApiKeys.set(false);
  }
}
