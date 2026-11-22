import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { classNames } from '~/utils/classNames';
import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { TAB_LABELS, TAB_ICONS } from '~/components/@settings/core/constants';
import { GlowingEffect } from '~/components/ui/GlowingEffect';

interface TabTileProps {
  tab: TabVisibilityConfig;
  onClick?: () => void;
  isActive?: boolean;
  hasUpdate?: boolean;
  statusMessage?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  children?: ReactNode;
}

export const TabTile = ({
  tab,
  onClick,
  isActive,
  hasUpdate,
  statusMessage,
  description,
  isLoading,
  className,
  children,
}: TabTileProps) => {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <div className={classNames('min-h-[160px] list-none', className || '')}>
          <div className="relative h-full rounded-xl border border-[#E5E5E5] p-0.5 dark:border-[#333333]">
            <GlowingEffect
              blur={0}
              borderWidth={1}
              spread={20}
              glow={true}
              disabled={false}
              proximity={40}
              inactiveZone={0.3}
              movementDuration={0.4}
            />
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={onClick}
                disabled={isLoading}
                aria-busy={isLoading || undefined}
                className={classNames(
                  'relative flex h-full w-full flex-col items-center justify-center rounded-lg p-4 text-center',
                  'bg-white dark:bg-[#141414]',
                  'group cursor-pointer',
                  'hover:bg-purple-50 dark:hover:bg-[#1a1a1a]',
                  'transition-colors duration-100 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-unqops-elements-focus',
                  isActive ? 'bg-purple-500/5 dark:bg-purple-500/10' : '',
                  isLoading ? 'cursor-wait opacity-70' : '',
                )}
              >
                <span
                  className={classNames(
                    'relative flex size-14 items-center justify-center rounded-xl',
                    'bg-gray-100 dark:bg-gray-800',
                    'ring-1 ring-gray-200 dark:ring-gray-700',
                    'group-hover:bg-purple-100 dark:group-hover:bg-gray-700/80',
                    'group-hover:ring-purple-200 dark:group-hover:ring-purple-800/30',
                    'transition-all duration-100 ease-out',
                    isActive ? 'bg-purple-500/10 ring-purple-500/30 dark:ring-purple-500/20' : '',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={classNames(
                      TAB_ICONS[tab.id],
                      'size-8 text-gray-600 dark:text-gray-300',
                      'group-hover:text-purple-500 dark:group-hover:text-purple-400/80',
                      'transition-colors duration-100 ease-out',
                      isActive ? 'text-purple-500 dark:text-purple-400/90' : '',
                    )}
                  />
                </span>

                <span className="mt-4 flex w-full flex-col items-center">
                  <span
                    role="heading"
                    aria-level={3}
                    className={classNames(
                      'mb-2 text-[15px] font-medium leading-snug',
                      'text-gray-700 dark:text-gray-200',
                      'group-hover:text-purple-600 dark:group-hover:text-purple-300/90',
                      'transition-colors duration-100 ease-out',
                      isActive ? 'text-purple-500 dark:text-purple-400/90' : '',
                    )}
                  >
                    {TAB_LABELS[tab.id]}
                  </span>
                  {description && (
                    <span
                      className={classNames(
                        'max-w-[85%] text-center text-[13px] leading-relaxed',
                        'text-gray-500 dark:text-gray-400',
                        'group-hover:text-purple-500 dark:group-hover:text-purple-400/70',
                        'transition-colors duration-100 ease-out',
                        isActive ? 'text-purple-400 dark:text-purple-400/80' : '',
                      )}
                    >
                      {description}
                    </span>
                  )}
                </span>

                {hasUpdate && (
                  <span
                    className="absolute right-4 top-4 size-2 animate-pulse rounded-full bg-purple-500 dark:bg-purple-400"
                    aria-hidden="true"
                  />
                )}
                {children}
              </button>
            </Tooltip.Trigger>
          </div>

          {hasUpdate && (
            <Tooltip.Portal>
              <Tooltip.Content
                className={classNames(
                  'z-[100] select-none rounded-lg bg-[#18181B] px-3 py-1.5 text-sm font-medium text-white',
                )}
                side="top"
                sideOffset={5}
              >
                {statusMessage}
                <Tooltip.Arrow className="fill-[#18181B]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          )}
        </div>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
