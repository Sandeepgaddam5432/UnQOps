import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import type { ProviderInfo } from '~/types/model';

interface APIKeyManagerProps {
  provider: ProviderInfo;
  isApiKeySet: boolean;
  setApiKey: (key: string) => Promise<void>;
}

const providerEnvKeyStatusCache = new Map<string, boolean>();

export const ApiKeyManager: React.FC<APIKeyManagerProps> = ({ provider, isApiKeySet, setApiKey }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTempKey('');
    setIsEditing(false);
    setError(null);
  }, [provider.name]);

  const checkEnvApiKey = useCallback(async () => {
    const cachedStatus = providerEnvKeyStatusCache.get(provider.name);

    if (cachedStatus !== undefined) {
      setIsEnvKeySet(cachedStatus);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('Environment credential status request failed');
      }

      const data = (await response.json()) as { isSet?: unknown };
      const isSet = data.isSet === true;
      providerEnvKeyStatusCache.set(provider.name, isSet);
      setIsEnvKeySet(isSet);
    } catch {
      setIsEnvKeySet(false);
    }
  }, [provider.name]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  const saveKey = async (key: string) => {
    setIsSaving(true);
    setError(null);

    try {
      await setApiKey(key);
      setTempKey('');
      setIsEditing(false);
    } catch {
      setError('Unable to save the API key. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-sm font-medium text-unqops-elements-textSecondary">{provider.name} API key:</span>
        {!isEditing && (
          <span
            className={
              isApiKeySet || isEnvKeySet ? 'text-xs text-green-500' : 'text-xs text-unqops-elements-textTertiary'
            }
          >
            {isApiKeySet ? 'Set via UI' : isEnvKeySet ? 'Set via environment variable' : 'Not set'}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isEditing ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              type="password"
              value={tempKey}
              autoComplete="new-password"
              placeholder="Enter API key"
              aria-label={`${provider.name} API key`}
              onChange={(event) => setTempKey(event.target.value)}
              className="w-[min(300px,calc(100vw-180px))] min-w-32 rounded border border-unqops-elements-borderColor bg-unqops-elements-prompt-background px-3 py-1.5 text-sm text-unqops-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-unqops-elements-focus"
            />
            <IconButton
              onClick={() => void saveKey(tempKey)}
              title="Save API key"
              disabled={isSaving || tempKey.length === 0}
              className="bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
            >
              <div className="i-ph:check w-4 h-4" />
            </IconButton>
            {isApiKeySet && (
              <IconButton
                onClick={() => void saveKey('')}
                title="Clear saved API key"
                disabled={isSaving}
                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
              >
                <div className="i-ph:trash w-4 h-4" />
              </IconButton>
            )}
            <IconButton
              onClick={() => {
                setTempKey('');
                setError(null);
                setIsEditing(false);
              }}
              title="Cancel"
              disabled={isSaving}
              className="bg-unqops-elements-background-depth-3 text-unqops-elements-textSecondary hover:bg-unqops-elements-background-depth-4"
            >
              <div className="i-ph:x w-4 h-4" />
            </IconButton>
          </div>
        ) : (
          <>
            <IconButton
              onClick={() => setIsEditing(true)}
              title={isApiKeySet ? 'Replace API key' : 'Set API key'}
              className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
            >
              <div className="i-ph:pencil-simple w-4 h-4" />
            </IconButton>
            {provider.getApiKeyLink && !isApiKeySet && (
              <IconButton
                onClick={() => window.open(provider.getApiKeyLink, '_blank', 'noopener,noreferrer')}
                title={provider.labelForGetApiKey || 'Get API key'}
                className="flex items-center gap-2 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
              >
                <span className="text-xs whitespace-nowrap">{provider.labelForGetApiKey || 'Get API key'}</span>
                <div className={`${provider.icon || 'i-ph:key'} w-4 h-4`} />
              </IconButton>
            )}
          </>
        )}
      </div>

      {isEditing && (
        <p className="basis-full text-xs text-unqops-elements-textTertiary">
          The saved key is never sent back to the browser. Enter a replacement, or use the clear button to remove it.
        </p>
      )}
      {error && (
        <p role="alert" className="basis-full text-xs text-unqops-elements-icon-error">
          {error}
        </p>
      )}
    </div>
  );
};
