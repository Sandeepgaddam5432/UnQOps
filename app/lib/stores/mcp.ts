import { create } from 'zustand';
import type { MCPConfig } from '~/lib/services/mcpService';
import type { MCPServerToolsSummary } from '~/lib/api/mcp-security';

const LEGACY_MCP_SETTINGS_KEY = 'mcp_settings';
const MCP_MAX_LLM_STEPS_KEY = 'mcp_max_llm_steps';
const isBrowser = typeof window !== 'undefined';

export type MCPSettings = {
  mcpConfig: MCPConfig;
  maxLLMSteps: number;
};

const defaultSettings = {
  maxLLMSteps: 5,
  mcpConfig: {
    mcpServers: {},
  },
} satisfies MCPSettings;

type Store = {
  isInitialized: boolean;
  settings: MCPSettings;
  serverTools: MCPServerToolsSummary;
  error: string | null;
  isUpdatingConfig: boolean;
};

type Actions = {
  initialize: () => Promise<void>;
  updateSettings: (settings: MCPSettings) => Promise<void>;
  checkServersAvailabilities: () => Promise<void>;
};

function normalizeMaxLLMSteps(value: unknown): number {
  const steps = typeof value === 'number' ? value : Number(value);

  return Number.isInteger(steps) && steps >= 1 && steps <= 20 ? steps : defaultSettings.maxLLMSteps;
}

function readMaxLLMSteps(): number {
  try {
    const savedSteps = localStorage.getItem(MCP_MAX_LLM_STEPS_KEY);

    return savedSteps === null ? defaultSettings.maxLLMSteps : normalizeMaxLLMSteps(savedSteps);
  } catch {
    return defaultSettings.maxLLMSteps;
  }
}

function persistMaxLLMSteps(settings: MCPSettings): void {
  if (!isBrowser) {
    return;
  }

  try {
    // Remove the old full-config value, which could contain server tokens in URLs or headers.
    localStorage.removeItem(LEGACY_MCP_SETTINGS_KEY);
    localStorage.setItem(MCP_MAX_LLM_STEPS_KEY, String(normalizeMaxLLMSteps(settings.maxLLMSteps)));
  } catch {
    // MCP configuration remains usable for this page session if browser storage is unavailable.
  }
}

export const useMCPStore = create<Store & Actions>((set, get) => ({
  isInitialized: false,
  settings: defaultSettings,
  serverTools: {},
  error: null,
  isUpdatingConfig: false,
  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    if (isBrowser) {
      const settings = { ...defaultSettings, maxLLMSteps: readMaxLLMSteps() };

      // Remove legacy MCP config data before making any network request or state update.
      try {
        localStorage.removeItem(LEGACY_MCP_SETTINGS_KEY);
      } catch {
        // Storage is optional; no new configuration will be written to it.
      }

      set({ settings });

      try {
        await get().checkServersAvailabilities();
      } catch {
        set({ error: 'Failed to check MCP server status' });
      }
    }

    set({ isInitialized: true });
  },
  updateSettings: async (newSettings: MCPSettings) => {
    if (get().isUpdatingConfig) {
      return;
    }

    const settings = { ...newSettings, maxLLMSteps: normalizeMaxLLMSteps(newSettings.maxLLMSteps) };

    try {
      set({ isUpdatingConfig: true, error: null });

      const serverTools = await updateServerConfig(settings.mcpConfig);
      persistMaxLLMSteps(settings);
      set({ settings, serverTools });
    } finally {
      set({ isUpdatingConfig: false });
    }
  },
  checkServersAvailabilities: async () => {
    const response = await fetch('/api/mcp-check', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('MCP server status request failed');
    }

    const serverTools = (await response.json()) as MCPServerToolsSummary;

    set({ serverTools, error: null });
  },
}));

async function updateServerConfig(config: MCPConfig) {
  const response = await fetch('/api/mcp-update-config', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('MCP configuration update failed');
  }

  return (await response.json()) as MCPServerToolsSummary;
}
