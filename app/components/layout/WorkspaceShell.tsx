import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { chatStore } from '~/lib/stores/chat';

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const chat = useStore(chatStore);

  return (
    <div className="studio-shell" data-chat-started={chat.started}>
      {!chat.started && (
        <aside className="studio-rail" aria-label="Workspace navigation">
          <a className="studio-brand" href="/">
            <span className="studio-brand-mark" aria-hidden="true">
              U
            </span>
            <span>
              UnQOps <small>workspace</small>
            </span>
          </a>
          <div className="studio-rail-label">WORKSPACE</div>
          <nav className="studio-nav" aria-label="Main navigation">
            <a className="studio-nav-item studio-nav-item-active" href="/" aria-current="page">
              <span className="i-ph:house" aria-hidden="true" /> Home
            </a>
            <button
              type="button"
              className="studio-nav-item"
              onClick={() => window.dispatchEvent(new Event('unqops:open-history'))}
            >
              <span className="i-ph:clock-counter-clockwise" aria-hidden="true" /> Chat history
            </button>
            <button
              type="button"
              className="studio-nav-item"
              onClick={() => window.dispatchEvent(new Event('unqops:open-settings'))}
            >
              <span className="i-ph:gear" aria-hidden="true" /> Settings
            </button>
          </nav>
          <div className="studio-rail-footer">
            <div className="studio-rail-hint">Your ideas, your workspace.</div>
            <div className="studio-rail-account">
              <span className="studio-avatar" aria-hidden="true">
                U
              </span>
              <span>
                UnQOps <small>Personal workspace</small>
              </span>
              <ClientOnly>{() => <ThemeSwitch />}</ClientOnly>
            </div>
          </div>
        </aside>
      )}
      <main className="studio-main">{children}</main>
    </div>
  );
}
