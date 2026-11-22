import Cookies from 'js-cookie';
import { type Message } from 'ai';
import { getAllChats, deleteChat } from '~/lib/persistence/chats';

interface ExtendedMessage extends Message {
  name?: string;
  function_call?: any;
  timestamp?: number;
}

/**
 * Service for handling import and export operations of application data
 */
export class ImportExportService {
  /**
   * Export all chats to a JSON file
   * @param db The IndexedDB database instance
   * @returns A promise that resolves to the export data
   */
  static async exportAllChats(db: IDBDatabase): Promise<{ chats: any[]; exportDate: string }> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get all chats from the database using the getAllChats helper
      const chats = await getAllChats(db);

      // Validate and sanitize each chat before export
      const sanitizedChats = chats.map((chat) => ({
        id: chat.id,
        description: chat.description || '',
        messages: chat.messages.map((msg: ExtendedMessage) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          name: msg.name,
          function_call: msg.function_call,
          timestamp: msg.timestamp,
        })),
        timestamp: chat.timestamp,
        urlId: chat.urlId || null,
        metadata: chat.metadata || null,
      }));

      console.log(`Successfully prepared ${sanitizedChats.length} chats for export`);

      return {
        chats: sanitizedChats,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting chats:', error);
      throw new Error(`Failed to export chats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export application settings to a JSON file
   * @returns A promise that resolves to the settings data
   */
  static async exportSettings(): Promise<any> {
    try {
      // Export only script-readable preferences; API keys are stored in HttpOnly cookies and exported separately.
      const allCookies = Cookies.get();
      const sensitiveCookieNames = new Set(['apiKeys', 'githubToken', 'git:github.com', 'netlifyToken']);

      for (const key of Object.keys(allCookies)) {
        if (sensitiveCookieNames.has(key) || /(?:token|secret|credential|api.?key|password)/i.test(key)) {
          delete allCookies[key];
        }
      }

      // Create a comprehensive settings object
      return {
        // Core settings
        core: {
          // User profile and main settings
          bolt_user_profile: this._safeGetItem('bolt_user_profile'),
          bolt_settings: this._safeGetItem('bolt_settings'),
          bolt_profile: this._safeGetItem('bolt_profile'),
          theme: this._safeGetItem('theme'),
        },

        // Provider settings (both local and cloud)
        providers: {
          // Provider configurations from localStorage
          provider_settings: this._safeGetItem('provider_settings'),

          // Selected provider and model
          selectedModel: allCookies.selectedModel,
          selectedProvider: allCookies.selectedProvider,

          // Provider-specific settings
          providers: allCookies.providers,
        },

        // Feature settings
        features: {
          // Feature flags
          viewed_features: this._safeGetItem('bolt_viewed_features'),
          developer_mode: this._safeGetItem('bolt_developer_mode'),

          // Context optimization
          contextOptimizationEnabled: this._safeGetItem('contextOptimizationEnabled'),

          // Auto-select template
          autoSelectTemplate: this._safeGetItem('autoSelectTemplate'),

          // Latest branch
          isLatestBranch: this._safeGetItem('isLatestBranch'),

          // Event logs
          isEventLogsEnabled: this._safeGetItem('isEventLogsEnabled'),

          // Energy saver settings
          energySaverMode: this._safeGetItem('energySaverMode'),
          autoEnergySaver: this._safeGetItem('autoEnergySaver'),
        },

        // UI configuration
        ui: {
          // Tab configuration
          bolt_tab_configuration: this._safeGetItem('bolt_tab_configuration'),
          tabConfiguration: allCookies.tabConfiguration,

          // Prompt settings
          promptId: this._safeGetItem('promptId'),
          cachedPrompt: allCookies.cachedPrompt,
        },

        // Non-secret connection metadata only; tokens must be re-entered after import.
        connections: {
          ...this._getGitHubConnections(allCookies),
        },

        // Debug and logs
        debug: {
          // Debug settings
          isDebugEnabled: allCookies.isDebugEnabled,
          acknowledged_debug_issues: this._safeGetItem('bolt_acknowledged_debug_issues'),
          acknowledged_connection_issue: this._safeGetItem('bolt_acknowledged_connection_issue'),

          // Error logs
          error_logs: this._safeGetItem('error_logs'),
          bolt_read_logs: this._safeGetItem('bolt_read_logs'),

          // Event logs
          eventLogs: allCookies.eventLogs,
        },

        // Update settings
        updates: {
          update_settings: this._safeGetItem('update_settings'),
          last_acknowledged_update: this._safeGetItem('bolt_last_acknowledged_version'),
        },

        // Chat snapshots (for chat history)
        chatSnapshots: this._getChatSnapshots(),

        // Raw data (for debugging and complete backup)
        _raw: {
          localStorage: this._getAllLocalStorage(),
          cookies: allCookies,
        },

        // Export metadata
        _meta: {
          exportDate: new Date().toISOString(),
          version: '2.0',
          appVersion: process.env.NEXT_PUBLIC_VERSION || 'unknown',
        },
      };
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw error;
    }
  }

  /**
   * Import settings from a JSON file
   * @param importedData The imported data
   */
  static async importSettings(importedData: any): Promise<void> {
    // Check if this is the new comprehensive format (v2.0)
    const isNewFormat = importedData._meta?.version === '2.0';

    if (isNewFormat) {
      // Import using the new comprehensive format
      await this._importComprehensiveFormat(importedData);
    } else {
      // Try to handle older formats
      await this._importLegacyFormat(importedData);
    }
  }

  /**
   * Import API keys from a JSON file
   * @param keys The API keys to import
   */
  static importAPIKeys(input: unknown): Record<string, string> {
    let keys = input;

    if (typeof keys === 'string') {
      if (keys.trim() === '') {
        keys = {};
      } else {
        try {
          keys = JSON.parse(keys) as unknown;
        } catch {
          throw new Error('Invalid API keys data');
        }
      }
    }

    if (typeof keys !== 'object' || keys === null || Array.isArray(keys)) {
      throw new Error('Invalid API keys data');
    }

    const importedKeys: Record<string, string> = Object.create(null);

    Object.entries(keys).forEach(([key, value]) => {
      if (key.startsWith('_') || key.includes('_API_BASE_URL')) {
        return;
      }

      if (typeof value !== 'string') {
        throw new Error(`Invalid value for key: ${key}`);
      }

      const normalizedKey = key.includes('_API_KEY') ? key.replace('_API_KEY', '') : key;

      if (value) {
        importedKeys[normalizedKey] = value;
      }
    });

    return importedKeys;
  }

  /**
   * Create an API keys template
   * @returns The API keys template
   */
  static createAPIKeysTemplate(): Record<string, any> {
    /*
     * Create a template with provider names as keys
     * This matches how the application stores API keys in cookies
     */
    const template = {
      Anthropic: '',
      OpenAI: '',
      Google: '',
      Groq: '',
      HuggingFace: '',
      OpenRouter: '',
      Deepseek: '',
      Mistral: '',
      OpenAILike: '',
      Together: '',
      xAI: '',
      Perplexity: '',
      Cohere: '',
      AzureOpenAI: '',
    };

    // Add a comment to explain the format
    return {
      _comment:
        "Fill in your API keys for each provider. Keys will be stored with the provider name (e.g., 'OpenAI'). The application also supports the older format with keys like 'OpenAI_API_KEY' for backward compatibility.",
      ...template,
    };
  }

  /**
   * Reset all settings to default values
   * @param db The IndexedDB database instance
   */
  static async resetAllSettings(db: IDBDatabase): Promise<void> {
    // 1. Clear all localStorage items related to application settings
    const localStorageKeysToPreserve: string[] = ['debug_mode']; // Keys to preserve if needed

    // Get all localStorage keys
    const allLocalStorageKeys = Object.keys(localStorage);

    // Clear all localStorage items except those to preserve
    allLocalStorageKeys.forEach((key) => {
      if (!localStorageKeysToPreserve.includes(key)) {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.error(`Error removing localStorage item ${key}:`, err);
        }
      }
    });

    // 2. Clear all cookies related to application settings
    const cookiesToPreserve: string[] = []; // Cookies to preserve if needed

    // Get all cookies
    const allCookies = Cookies.get();
    const cookieKeys = Object.keys(allCookies);

    // Clear all script-readable cookies except those to preserve.
    cookieKeys.forEach((key) => {
      if (!cookiesToPreserve.includes(key)) {
        try {
          Cookies.remove(key);
        } catch (err) {
          console.error(`Error removing cookie ${key}:`, err);
        }
      }
    });

    // HttpOnly API keys cannot be cleared by JavaScript; clear them through the same-origin server route.
    const apiKeysResponse = await fetch('/api/api-keys', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: {}, replace: true }),
    });

    if (!apiKeysResponse.ok) {
      throw new Error('Failed to clear saved API keys');
    }

    // 3. Clear all data from IndexedDB
    if (!db) {
      console.warn('Database not initialized, skipping IndexedDB reset');
    } else {
      // Get all chats and delete them
      const chats = await getAllChats(db);

      const deletePromises = chats.map((chat) => deleteChat(db, chat.id));
      await Promise.all(deletePromises);
    }

    // 4. Clear any chat snapshots
    const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));
    snapshotKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error(`Error removing snapshot ${key}:`, err);
      }
    });
  }

  /**
   * Delete all chats from the database
   * @param db The IndexedDB database instance
   */
  static async deleteAllChats(db: IDBDatabase): Promise<void> {
    // Clear chat history from localStorage
    localStorage.removeItem('bolt_chat_history');

    // Clear chats from IndexedDB
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Get all chats and delete them one by one
    const chats = await getAllChats(db);
    const deletePromises = chats.map((chat) => deleteChat(db, chat.id));
    await Promise.all(deletePromises);
  }

  // Private helper methods

  /**
   * Import settings from a comprehensive format
   * @param data The imported data
   */
  private static async _importComprehensiveFormat(data: any): Promise<void> {
    // Import core settings
    if (data.core) {
      Object.entries(data.core).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing core setting ${key}:`, err);
          }
        }
      });
    }

    // Import provider settings
    if (data.providers) {
      // Import provider_settings to localStorage
      if (data.providers.provider_settings) {
        try {
          this._safeSetItem('provider_settings', data.providers.provider_settings);
        } catch (err) {
          console.error('Error importing provider settings:', err);
        }
      }

      // Import API keys through the server so the values remain HttpOnly.
      if (data.providers.apiKeys !== null && data.providers.apiKeys !== undefined) {
        await this._saveApiKeys(this.importAPIKeys(data.providers.apiKeys));
      }

      // Import non-secret provider cookies in the browser.
      const providerCookies = ['selectedModel', 'selectedProvider', 'providers'];
      providerCookies.forEach((key) => {
        if (data.providers[key]) {
          try {
            this._safeSetCookie(key, data.providers[key]);
          } catch (err) {
            console.error(`Error importing provider cookie ${key}:`, err);
          }
        }
      });
    }

    // Import feature settings
    if (data.features) {
      Object.entries(data.features).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing feature setting ${key}:`, err);
          }
        }
      });
    }

    // Import UI configuration
    if (data.ui) {
      // Import localStorage UI settings
      if (data.ui.bolt_tab_configuration) {
        try {
          this._safeSetItem('bolt_tab_configuration', data.ui.bolt_tab_configuration);
        } catch (err) {
          console.error('Error importing tab configuration:', err);
        }
      }

      if (data.ui.promptId) {
        try {
          this._safeSetItem('promptId', data.ui.promptId);
        } catch (err) {
          console.error('Error importing prompt ID:', err);
        }
      }

      // Import UI cookies
      const uiCookies = ['tabConfiguration', 'cachedPrompt'];
      uiCookies.forEach((key) => {
        if (data.ui[key]) {
          try {
            this._safeSetCookie(key, data.ui[key]);
          } catch (err) {
            console.error(`Error importing UI cookie ${key}:`, err);
          }
        }
      });
    }

    /*
     * Connection credentials are intentionally omitted from exports and must be reconnected after import.
     * Import debug settings
     */
    if (data.debug) {
      // Import debug localStorage settings
      const debugLocalStorageKeys = [
        'bolt_acknowledged_debug_issues',
        'bolt_acknowledged_connection_issue',
        'error_logs',
        'bolt_read_logs',
      ];

      debugLocalStorageKeys.forEach((key) => {
        if (data.debug[key] !== null && data.debug[key] !== undefined) {
          try {
            this._safeSetItem(key, data.debug[key]);
          } catch (err) {
            console.error(`Error importing debug setting ${key}:`, err);
          }
        }
      });

      // Import debug cookies
      const debugCookies = ['isDebugEnabled', 'eventLogs'];
      debugCookies.forEach((key) => {
        if (data.debug[key]) {
          try {
            this._safeSetCookie(key, data.debug[key]);
          } catch (err) {
            console.error(`Error importing debug cookie ${key}:`, err);
          }
        }
      });
    }

    // Import update settings
    if (data.updates) {
      if (data.updates.update_settings) {
        try {
          this._safeSetItem('update_settings', data.updates.update_settings);
        } catch (err) {
          console.error('Error importing update settings:', err);
        }
      }

      if (data.updates.last_acknowledged_update) {
        try {
          this._safeSetItem('bolt_last_acknowledged_version', data.updates.last_acknowledged_update);
        } catch (err) {
          console.error('Error importing last acknowledged update:', err);
        }
      }
    }

    // Import chat snapshots
    if (data.chatSnapshots) {
      Object.entries(data.chatSnapshots).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          try {
            this._safeSetItem(key, value);
          } catch (err) {
            console.error(`Error importing chat snapshot ${key}:`, err);
          }
        }
      });
    }
  }

  /**
   * Import settings from a legacy format
   * @param data The imported data
   */
  private static async _importLegacyFormat(data: any): Promise<void> {
    /**
     * Handle legacy format (v1.0 or earlier)
     * This is a simplified version that tries to import whatever is available
     */

    // Try to import settings directly, keeping API keys in HttpOnly cookies.
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || ['exportDate', 'version', 'appVersion'].includes(key)) {
        continue;
      }

      if (key === 'apiKeys') {
        await this._saveApiKeys(this.importAPIKeys(value));
        continue;
      }

      if (
        ['github_connection', 'netlify_connection', 'supabase_connection', 'supabaseCredentials'].includes(key) ||
        /(?:token|secret|credential|api.?key|password)/i.test(key)
      ) {
        continue;
      }

      try {
        const isCookie = [
          'selectedModel',
          'selectedProvider',
          'providers',
          'tabConfiguration',
          'cachedPrompt',
          'isDebugEnabled',
          'eventLogs',
        ].includes(key);

        if (isCookie) {
          this._safeSetCookie(key, value);
        } else {
          this._safeSetItem(key, value);
        }
      } catch (err) {
        console.error(`Error importing legacy setting ${key}:`, err);
      }
    }
  }

  private static async _saveApiKeys(keys: Record<string, string>): Promise<void> {
    const response = await fetch('/api/api-keys', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    });

    if (!response.ok) {
      throw new Error('Failed to import API keys');
    }
  }

  private static _redactCredentials(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this._redactCredentials(item));
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const sanitized: Record<string, unknown> = Object.create(null);

    for (const [key, item] of Object.entries(value)) {
      if (!/(?:token|secret|credential|api.?key|password|authorization)/i.test(key)) {
        sanitized[key] = this._redactCredentials(item);
      }
    }

    return sanitized;
  }

  /**
   * Safely get an item from localStorage
   * @param key The key to get
   * @returns The value or null if not found
   */
  private static _safeGetItem(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error(`Error getting localStorage item ${key}:`, err);
      return null;
    }
  }

  /**
   * Get all localStorage items
   * @returns All localStorage items
   */
  private static _getAllLocalStorage(): Record<string, any> {
    const result: Record<string, any> = {};

    const sensitiveKeys = new Set([
      'github_connection',
      'netlify_connection',
      'supabase_connection',
      'supabaseCredentials',
      'mcp_settings',
    ]);

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && !sensitiveKeys.has(key) && !/(?:token|secret|credential|api.?key)/i.test(key)) {
          try {
            const value = localStorage.getItem(key);
            result[key] = value ? this._redactCredentials(JSON.parse(value)) : null;
          } catch {
            result[key] = null;
          }
        }
      }
    } catch (err) {
      console.error('Error getting all localStorage items:', err);
    }

    return result;
  }

  /**
   * Get GitHub connections from cookies
   * @param _cookies The cookies object
   * @returns GitHub connections
   */
  private static _getGitHubConnections(_cookies: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    // Get GitHub connections from localStorage
    const localStorageKeys = Object.keys(localStorage).filter((key) => key.startsWith('github_'));
    localStorageKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        result[key] = value ? this._redactCredentials(JSON.parse(value)) : null;
      } catch (err) {
        console.error(`Error getting GitHub connection ${key}:`, err);
        result[key] = null;
      }
    });

    return result;
  }

  /**
   * Get chat snapshots from localStorage
   * @returns Chat snapshots
   */
  private static _getChatSnapshots(): Record<string, any> {
    const result: Record<string, any> = {};

    // Get chat snapshots from localStorage
    const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));
    snapshotKeys.forEach((key) => {
      try {
        const value = localStorage.getItem(key);
        result[key] = value ? JSON.parse(value) : null;
      } catch (err) {
        console.error(`Error getting chat snapshot ${key}:`, err);
        result[key] = null;
      }
    });

    return result;
  }

  /**
   * Safely set an item in localStorage
   * @param key The key to set
   * @param value The value to set
   */
  private static _safeSetItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error setting localStorage item ${key}:`, err);
    }
  }

  /**
   * Safely set a cookie
   * @param key The key to set
   * @param value The value to set
   */
  private static _safeSetCookie(key: string, value: any): void {
    if (key === 'apiKeys') {
      throw new Error('API keys must be stored through the server-side credential route');
    }

    try {
      Cookies.set(key, typeof value === 'string' ? value : JSON.stringify(value), { expires: 365 });
    } catch (err) {
      console.error(`Error setting cookie ${key}:`, err);
    }
  }
}
