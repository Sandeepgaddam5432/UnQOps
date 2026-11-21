import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { WorkspaceAppearance } from '~/components/ui/WorkspaceAppearance';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('workspace-header flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-unqops-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-unqops-elements-textPrimary cursor-pointer">
        <button
          type="button"
          className="rounded-md p-1 hover:bg-unqops-elements-background-depth-3"
          aria-label="Open navigation"
          onClick={() => window.dispatchEvent(new Event('unqops:toggle-navigation'))}
        >
          <span className="i-ph:sidebar-simple-duotone block text-xl" aria-hidden="true" />
        </button>
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          {/* <span className="i-unqops:logo-text?mask w-[46px] inline-block" /> */}
          <img src="/logo-light-styled.png" alt="UnQOps home" className="w-[90px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="UnQOps home" className="w-[90px] inline-block hidden dark:block" />
        </a>
      </div>
      {!chat.started && <span className="flex-1" />}
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-unqops-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
      <ClientOnly>{() => <WorkspaceAppearance />}</ClientOnly>
    </header>
  );
}
