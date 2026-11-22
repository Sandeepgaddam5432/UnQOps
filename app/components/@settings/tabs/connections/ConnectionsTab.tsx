import { motion } from 'framer-motion';
import React, { Suspense, useState } from 'react';
import { classNames } from '~/utils/classNames';
import ConnectionDiagnostics from './ConnectionDiagnostics';
import { Button } from '~/components/ui/Button';
import VercelConnection from './VercelConnection';

// Use React.lazy for dynamic imports
const GitHubConnection = React.lazy(() => import('./GithubConnection'));
const NetlifyConnection = React.lazy(() => import('./NetlifyConnection'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="p-4 bg-unqops-elements-background-depth-1 dark:bg-unqops-elements-background-depth-1 rounded-lg border border-unqops-elements-borderColor dark:border-unqops-elements-borderColor">
    <div className="flex items-center justify-center gap-2 text-unqops-elements-textSecondary dark:text-unqops-elements-textSecondary">
      <div className="i-ph:spinner-gap w-4 h-4 animate-spin" />
      <span>Loading connection...</span>
    </div>
  </div>
);

export default function ConnectionsTab() {
  const [isEnvVarsExpanded, setIsEnvVarsExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:plugs-connected w-5 h-5 text-unqops-elements-item-contentAccent dark:text-unqops-elements-item-contentAccent" />
          <h2 className="text-lg font-medium text-unqops-elements-textPrimary dark:text-unqops-elements-textPrimary">
            Connection Settings
          </h2>
        </div>
        <Button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          variant="outline"
          className="flex items-center gap-2 hover:bg-unqops-elements-item-backgroundActive/10 hover:text-unqops-elements-textPrimary dark:hover:bg-unqops-elements-item-backgroundActive/10 dark:hover:text-unqops-elements-textPrimary transition-colors"
        >
          {showDiagnostics ? (
            <>
              <div className="i-ph:eye-slash w-4 h-4" />
              Hide Diagnostics
            </>
          ) : (
            <>
              <div className="i-ph:wrench w-4 h-4" />
              Troubleshoot Connections
            </>
          )}
        </Button>
      </motion.div>
      <p className="text-sm text-unqops-elements-textSecondary dark:text-unqops-elements-textSecondary">
        Manage your external service connections and integrations
      </p>

      {/* Diagnostics Tool - Conditionally rendered */}
      {showDiagnostics && <ConnectionDiagnostics />}

      {/* Environment Variables Info - Collapsible */}
      <motion.div
        className="bg-unqops-elements-background dark:bg-unqops-elements-background rounded-lg border border-unqops-elements-borderColor dark:border-unqops-elements-borderColor"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6">
          <button
            onClick={() => setIsEnvVarsExpanded(!isEnvVarsExpanded)}
            className={classNames(
              'w-full bg-transparent flex items-center justify-between',
              'hover:bg-unqops-elements-item-backgroundActive/10 hover:text-unqops-elements-textPrimary',
              'dark:hover:bg-unqops-elements-item-backgroundActive/10 dark:hover:text-unqops-elements-textPrimary',
              'rounded-md p-2 -m-2 transition-colors',
            )}
          >
            <div className="flex items-center gap-2">
              <div className="i-ph:info w-5 h-5 text-unqops-elements-item-contentAccent dark:text-unqops-elements-item-contentAccent" />
              <h3 className="text-base font-medium text-unqops-elements-textPrimary dark:text-unqops-elements-textPrimary">
                Environment Variables
              </h3>
            </div>
            <div
              className={classNames(
                'i-ph:caret-down w-4 h-4 text-unqops-elements-textSecondary dark:text-unqops-elements-textSecondary transition-transform',
                isEnvVarsExpanded ? 'rotate-180' : '',
              )}
            />
          </button>

          {isEnvVarsExpanded && (
            <div className="mt-4 space-y-3 text-sm text-unqops-elements-textSecondary">
              <p>
                GitHub and Netlify credentials should be entered in their connection forms. Never place credentials in a{' '}
                <code>VITE_*</code> variable: Vite exposes those values in the public browser bundle.
              </p>
              <p>
                For server-side provider credentials, use local server-only configuration during development and
                Cloudflare Pages secret bindings in production. Do not return or log secret values from server routes.
              </p>
              <p className="text-xs text-unqops-elements-textTertiary">
                Personal connection tokens are stored in this browser so the editor can access your account. Use
                short-lived, least-privilege tokens and disconnect them on shared devices.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<LoadingFallback />}>
          <GitHubConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <NetlifyConnection />
        </Suspense>
        <Suspense fallback={<LoadingFallback />}>
          <VercelConnection />
        </Suspense>
      </div>

      {/* Additional help text */}
      <div className="text-sm text-unqops-elements-textSecondary dark:text-unqops-elements-textSecondary bg-unqops-elements-background-depth-2 dark:bg-unqops-elements-background-depth-2 p-4 rounded-lg">
        <p className="flex items-center gap-1 mb-2">
          <span className="i-ph:lightbulb w-4 h-4 text-unqops-elements-icon-success dark:text-unqops-elements-icon-success" />
          <span className="font-medium">Troubleshooting Tip:</span>
        </p>
        <p className="mb-2">
          If you're having trouble with connections, try using the troubleshooting tool at the top of this page. It can
          help diagnose and fix common connection issues.
        </p>
        <p>For persistent issues:</p>
        <ol className="list-decimal list-inside pl-4 mt-1">
          <li>Check your browser console for errors</li>
          <li>Verify that your tokens have the correct permissions</li>
          <li>Try clearing your browser cache and cookies</li>
          <li>Ensure your browser allows third-party cookies if using integrations</li>
        </ol>
      </div>
    </div>
  );
}
