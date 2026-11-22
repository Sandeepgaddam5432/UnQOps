import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { logStore } from '~/lib/stores/logs';
import {
  supabaseConnection,
  isConnecting,
  isFetchingStats,
  isFetchingApiKeys,
  updateSupabaseConnection,
  fetchProjectApiKeys,
  fetchSupabaseStats,
} from '~/lib/stores/supabase';
import type { SupabaseUser } from '~/types/supabase';

const CONNECTED_USER: SupabaseUser = {
  id: '',
  email: 'Connected',
  role: 'Admin',
  created_at: '',
  last_sign_in_at: '',
};

async function postCredentialOperation(operation: 'connect' | 'disconnect', token?: string): Promise<Response> {
  return fetch('/api/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, provider: 'supabase', ...(token ? { token } : {}) }),
    cache: 'no-store',
  });
}

export function useSupabaseConnection() {
  const connection = useStore(supabaseConnection);
  const connecting = useStore(isConnecting);
  const fetchingStats = useStore(isFetchingStats);
  const fetchingApiKeys = useStore(isFetchingApiKeys);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const restoreConnectionStatus = async () => {
      try {
        const response = await fetch('/api/credentials', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Unable to read provider connection status');
        }

        const data = (await response.json()) as { providers?: Record<string, boolean> };

        if (!active) {
          return;
        }

        if (data.providers?.supabase) {
          updateSupabaseConnection({ user: CONNECTED_USER, token: '', isConnected: true });
          await fetchSupabaseStats();
        } else {
          updateSupabaseConnection({
            user: null,
            token: '',
            isConnected: false,
            stats: undefined,
            credentials: undefined,
          });
        }
      } catch {
        if (active) {
          updateSupabaseConnection({ user: null, token: '', isConnected: false, credentials: undefined });
        }
      }
    };

    void restoreConnectionStatus();

    return () => {
      active = false;
    };
  }, []);

  const handleConnect = async () => {
    const cleanToken = connection.token.trim();

    if (!cleanToken) {
      toast.error('Enter a Supabase access token');
      return false;
    }

    isConnecting.set(true);

    try {
      const response = await postCredentialOperation('connect', cleanToken);
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Supabase');
      }

      updateSupabaseConnection({ user: CONNECTED_USER, token: '', isConnected: true });
      await fetchSupabaseStats();
      toast.success('Successfully connected to Supabase');
      setIsProjectsExpanded(true);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect to Supabase';
      logStore.logError('Failed to authenticate with Supabase', { message });
      toast.error(message);
      updateSupabaseConnection({ user: null, token: '', isConnected: false, credentials: undefined });

      return false;
    } finally {
      isConnecting.set(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await postCredentialOperation('disconnect');

      if (!response.ok) {
        throw new Error('Unable to disconnect Supabase');
      }
    } catch {
      toast.error('Could not clear the secure Supabase session');
      return;
    }

    updateSupabaseConnection({
      user: null,
      token: '',
      isConnected: false,
      stats: undefined,
      selectedProjectId: '',
      project: undefined,
      credentials: undefined,
    });
    toast.success('Disconnected from Supabase');
    setIsDropdownOpen(false);
  };

  const selectProject = async (projectId: string) => {
    const currentState = supabaseConnection.get();
    const projectData = projectId
      ? currentState.stats?.projects?.find((project) => project.id === projectId)
      : undefined;

    updateSupabaseConnection({
      selectedProjectId: projectId,
      project: projectData,
    });

    if (projectId && currentState.isConnected) {
      try {
        await fetchProjectApiKeys(projectId);
        toast.success('Project selected successfully');
      } catch {
        toast.error('Selected project but failed to fetch public project details');
      }
    } else {
      toast.success('Project selection updated');
    }

    setIsDropdownOpen(false);
  };

  const handleCreateProject = async () => {
    window.open('https://app.supabase.com/new/new-project', '_blank', 'noopener,noreferrer');
  };

  return {
    connection,
    connecting,
    fetchingStats,
    fetchingApiKeys,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen,
    setIsDropdownOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken: (token: string) => updateSupabaseConnection({ token }),
    isConnected: !!(connection.isConnected && connection.user),
    fetchProjectApiKeys: (projectId: string) => fetchProjectApiKeys(projectId),
  };
}
