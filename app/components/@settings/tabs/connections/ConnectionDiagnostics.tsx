import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { classNames } from '~/utils/classNames';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '~/components/ui/Collapsible';
import { CodeBracketIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const PROVIDERS = ['github', 'netlify', 'vercel', 'supabase', 'cloudflare'] as const;
type Provider = (typeof PROVIDERS)[number];
type ProviderStatus = Record<Provider, boolean>;

const PROVIDER_LABELS: Record<Provider, string> = {
  github: 'GitHub',
  netlify: 'Netlify',
  vercel: 'Vercel',
  supabase: 'Supabase',
  cloudflare: 'Cloudflare',
};

const PROVIDER_ICONS: Record<Provider, string> = {
  github: 'i-ph:github-logo',
  netlify: 'i-unqops:netlify',
  vercel: 'i-ph:triangle',
  supabase: 'i-ph:database',
  cloudflare: 'i-ph:cloud',
};

const LEGACY_STORAGE_KEYS: Record<Provider, string[]> = {
  github: ['github_connection'],
  netlify: ['netlify_connection'],
  vercel: ['vercel_connection'],
  supabase: ['supabase_connection', 'supabaseCredentials'],
  cloudflare: ['cloudflare_connection'],
};

interface DiagnosticResults {
  timestamp: string;
  providers: ProviderStatus;
  checks: ProviderStatus;
  serverDiagnostics: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProviderStatus(value: unknown): ProviderStatus {
  const record = isRecord(value) ? value : {};

  return Object.fromEntries(PROVIDERS.map((provider) => [provider, record[provider] === true])) as ProviderStatus;
}

function safeReachability(value: unknown): { isReachable: boolean; status?: number } | undefined {
  if (!isRecord(value) || typeof value.isReachable !== 'boolean') {
    return undefined;
  }

  return {
    isReachable: value.isReachable,
    ...(typeof value.status === 'number' && Number.isInteger(value.status) ? { status: value.status } : {}),
  };
}

function sanitizeServerDiagnostics(value: unknown) {
  if (!isRecord(value)) {
    return { status: 'unavailable' };
  }

  const externalApis = isRecord(value.externalApis) ? value.externalApis : {};
  const github = safeReachability(externalApis.github);
  const netlify = safeReachability(externalApis.netlify);

  return {
    status: typeof value.status === 'string' ? value.status.slice(0, 32) : 'unknown',
    serverTimestamp: typeof value.serverTimestamp === 'string' ? value.serverTimestamp.slice(0, 64) : undefined,
    externalApis: {
      ...(github ? { github } : {}),
      ...(netlify ? { netlify } : {}),
    },
  };
}

/** Connection diagnostics only reports server-side credential presence and verification status. */
export default function ConnectionDiagnostics() {
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [resettingProvider, setResettingProvider] = useState<Provider | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnosticResults(null);

    try {
      const [credentialsResponse, serverResponse] = await Promise.all([
        fetch('/api/credentials?verify=1', { cache: 'no-store' }),
        fetch('/api/system/diagnostics', { cache: 'no-store' }).catch(() => null),
      ]);

      if (!credentialsResponse.ok) {
        throw new Error('Secure credential status is unavailable');
      }

      const credentialsData: unknown = await credentialsResponse.json();
      const serverData: unknown = serverResponse?.ok ? await serverResponse.json().catch(() => null) : null;
      const credentials = isRecord(credentialsData) ? credentialsData : {};
      const results: DiagnosticResults = {
        timestamp: new Date().toISOString(),
        providers: readProviderStatus(credentials.providers),
        checks: readProviderStatus(credentials.checks),
        serverDiagnostics: sanitizeServerDiagnostics(serverData),
      };

      setDiagnosticResults(results);

      const connectedProviders = PROVIDERS.filter((provider) => results.providers[provider]);
      const failedProviders = connectedProviders.filter((provider) => !results.checks[provider]);

      if (connectedProviders.length === 0) {
        toast.info('No encrypted provider sessions were found. Legacy browser storage is not inspected.');
      } else if (failedProviders.length > 0) {
        toast.warning(
          `Provider verification failed for: ${failedProviders.map((provider) => PROVIDER_LABELS[provider]).join(', ')}`,
        );
      } else {
        toast.success('All connected provider sessions passed verification.');
      }
    } catch (error) {
      setDiagnosticResults(null);
      toast.error(error instanceof Error ? error.message : 'Error running diagnostics');
    } finally {
      setIsRunning(false);
    }
  };

  const resetProviderConnection = async (provider: Provider) => {
    setResettingProvider(provider);

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'disconnect', provider }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Unable to clear the secure provider session');
      }

      for (const key of LEGACY_STORAGE_KEYS[provider]) {
        try {
          localStorage.removeItem(key);
        } catch {
          // Continue even if browser storage is unavailable.
        }
      }

      toast.success(`${PROVIDER_LABELS[provider]} connection data cleared. Reloading to clear in-memory state.`);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear provider connection data');
      setResettingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROVIDERS.map((provider) => {
          const connected = diagnosticResults?.providers[provider] ?? false;
          const verified = diagnosticResults?.checks[provider] ?? false;

          return (
            <section
              key={provider}
              className="p-4 rounded-lg bg-unqops-elements-background dark:bg-unqops-elements-background-depth-2 border border-unqops-elements-borderColor hover:border-unqops-elements-borderColorActive/70 transition-all duration-200 min-h-[180px] flex flex-col"
              aria-label={`${PROVIDER_LABELS[provider]} connection status`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`${PROVIDER_ICONS[provider]} text-unqops-elements-item-contentAccent w-4 h-4`}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-medium text-unqops-elements-textPrimary">
                  {PROVIDER_LABELS[provider]} Connection
                </h3>
              </div>

              {diagnosticResults ? (
                <>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={classNames(
                        'text-lg font-semibold',
                        connected ? 'text-green-600 dark:text-green-400' : 'text-unqops-elements-textSecondary',
                      )}
                    >
                      {connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <p className="text-xs text-unqops-elements-textSecondary mt-2">
                    {connected
                      ? 'Encrypted HttpOnly credential session detected.'
                      : 'No encrypted credential session was detected.'}
                  </p>
                  {connected && (
                    <div className="text-xs text-unqops-elements-textSecondary mt-2 flex items-center gap-1.5">
                      Provider verification:
                      <Badge variant={verified ? 'default' : 'destructive'} className="ml-1">
                        {verified ? 'OK' : 'Failed'}
                      </Badge>
                    </div>
                  )}
                  {connected && (
                    <Button
                      onClick={() => void resetProviderConnection(provider)}
                      disabled={isRunning || resettingProvider !== null}
                      variant="outline"
                      size="sm"
                      className="mt-auto self-start"
                    >
                      {resettingProvider === provider ? 'Clearing…' : `Reset ${PROVIDER_LABELS[provider]}`}
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center flex-1 text-sm text-unqops-elements-textSecondary">
                  Run diagnostics to check secure session status
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4">
        <Button onClick={runDiagnostics} disabled={isRunning || resettingProvider !== null} variant="outline">
          {isRunning ? (
            <div className="i-ph:spinner-gap w-4 h-4 animate-spin mr-2" aria-hidden="true" />
          ) : (
            <div className="i-ph:activity w-4 h-4 mr-2" aria-hidden="true" />
          )}
          {isRunning ? 'Running Diagnostics…' : 'Run Diagnostics'}
        </Button>
      </div>

      {diagnosticResults && (
        <div className="mt-4">
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="w-full">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 rounded-lg bg-unqops-elements-background dark:bg-unqops-elements-background-depth-2 border border-unqops-elements-borderColor hover:border-unqops-elements-borderColorActive/70 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <CodeBracketIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-unqops-elements-textPrimary">
                    Diagnostic Details (no credentials included)
                  </span>
                </div>
                <ChevronDownIcon
                  className={classNames(
                    'w-4 h-4 transform transition-transform duration-200 text-unqops-elements-textSecondary',
                    showDetails ? 'rotate-180' : '',
                  )}
                  aria-hidden="true"
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="p-4 mt-2 rounded-lg bg-unqops-elements-background-depth-2 dark:bg-unqops-elements-background-depth-1 border border-unqops-elements-borderColor">
                <p className="text-xs text-unqops-elements-textSecondary mb-3">
                  Diagnostics intentionally does not read localStorage, cookies, or provider credential values in the
                  browser.
                </p>
                <pre className="text-xs overflow-auto max-h-96 text-unqops-elements-textSecondary">
                  {JSON.stringify(diagnosticResults, null, 2)}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
