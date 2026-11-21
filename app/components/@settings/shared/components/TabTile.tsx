import * as Tooltip from '@radix-ui/react-tooltip';
import { classNames } from '~/utils/classNames';
import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { TAB_LABELS, TAB_ICONS } from '~/components/@settings/core/constants';

interface TabTileProps {
  tab: TabVisibilityConfig;
  onClick?: () => void;
  isActive?: boolean;
  hasUpdate?: boolean;
  statusMessage?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TabTile: React.FC<TabTileProps> = ({
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
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            aria-busy={isLoading || undefined}
            className={classNames('settings-tile', { 'settings-tile-active': !!isActive }, className)}
          >
            <span className="settings-tile-icon" aria-hidden="true">
              <span className={TAB_ICONS[tab.id]} />
            </span>
            <span className="settings-tile-content">
              <span className="settings-tile-title">{TAB_LABELS[tab.id]}</span>
              {description && <span className="settings-tile-description">{description}</span>}
              {hasUpdate && statusMessage && <span className="settings-tile-status">{statusMessage}</span>}
            </span>
            <span className="i-ph:arrow-up-right settings-tile-arrow" aria-hidden="true" />
            {children}
          </button>
        </Tooltip.Trigger>
        {hasUpdate && statusMessage && (
          <Tooltip.Portal>
            <Tooltip.Content className="settings-tile-tooltip" side="top" sideOffset={5}>
              {statusMessage}
              <Tooltip.Arrow className="fill-[#18181b]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
