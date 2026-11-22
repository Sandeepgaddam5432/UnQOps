import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { TabTile } from '~/components/@settings/shared/components/TabTile';
import { useFeatures } from '~/lib/hooks/useFeatures';
import { useNotifications } from '~/lib/hooks/useNotifications';
import { useConnectionStatus } from '~/lib/hooks/useConnectionStatus';
import { tabConfigurationStore, resetTabConfiguration } from '~/lib/stores/settings';
import { profileStore } from '~/lib/stores/profile';
import type { TabType, Profile } from './types';
import { TAB_LABELS, TAB_DESCRIPTIONS } from './constants';
import { Drawer } from '~/components/ui/Drawer';
import { AvatarDropdown } from './AvatarDropdown';
import BackgroundRays from '~/components/ui/BackgroundRays';

// Import all tab components
import ProfileTab from '~/components/@settings/tabs/profile/ProfileTab';
import SettingsTab from '~/components/@settings/tabs/settings/SettingsTab';
import NotificationsTab from '~/components/@settings/tabs/notifications/NotificationsTab';
import FeaturesTab from '~/components/@settings/tabs/features/FeaturesTab';
import { DataTab } from '~/components/@settings/tabs/data/DataTab';
import { EventLogsTab } from '~/components/@settings/tabs/event-logs/EventLogsTab';
import ConnectionsTab from '~/components/@settings/tabs/connections/ConnectionsTab';
import CloudProvidersTab from '~/components/@settings/tabs/providers/cloud/CloudProvidersTab';
import ServiceStatusTab from '~/components/@settings/tabs/providers/status/ServiceStatusTab';
import LocalProvidersTab from '~/components/@settings/tabs/providers/local/LocalProvidersTab';
import McpTab from '~/components/@settings/tabs/mcp/McpTab';

interface ControlPanelProps {
  open: boolean;
  onClose: () => void;
}

// Beta status for experimental features
const BETA_TABS = new Set<TabType>(['service-status', 'local-providers', 'mcp']);

const BetaLabel = () => (
  <span className="absolute right-2 top-2 rounded-full bg-unqops-elements-item-backgroundAccent px-1.5 py-0.5 text-[10px] font-medium text-unqops-elements-item-contentAccent">
    BETA
  </span>
);

export const ControlPanel = ({ open, onClose }: ControlPanelProps) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [loadingTab, setLoadingTab] = useState<TabType | null>(null);
  const [showTabManagement, setShowTabManagement] = useState(false);

  // Store values
  const tabConfiguration = useStore(tabConfigurationStore);
  const profile = useStore(profileStore) as Profile;

  // Status hooks
  const { hasNewFeatures, unviewedFeatures, acknowledgeAllFeatures } = useFeatures();
  const { hasUnreadNotifications, unreadNotifications, markAllAsRead } = useNotifications();
  const { hasConnectionIssues, currentIssue, acknowledgeIssue } = useConnectionStatus();

  // Add visibleTabs logic using useMemo with optimized calculations
  const visibleTabs = useMemo(() => {
    if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
      console.warn('Invalid tab configuration, resetting to defaults');
      resetTabConfiguration();

      return [];
    }

    const notificationsDisabled = profile?.preferences?.notifications === false;

    // Optimize user mode tab filtering
    return tabConfiguration.userTabs
      .filter((tab) => {
        if (!tab?.id) {
          return false;
        }

        if (tab.id === 'notifications' && notificationsDisabled) {
          return false;
        }

        return tab.visible && tab.window === 'user';
      })
      .sort((a, b) => a.order - b.order);
  }, [tabConfiguration, profile?.preferences?.notifications]);

  // Reset to default view when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Reset when closing
      setActiveTab(null);
      setLoadingTab(null);
      setShowTabManagement(false);
    } else {
      // When opening, set to null to show the main view
      setActiveTab(null);
    }
  }, [open]);

  // Handle closing
  const handleClose = () => {
    setActiveTab(null);
    setLoadingTab(null);
    setShowTabManagement(false);
    onClose();
  };

  // Handlers
  const handleBack = () => {
    if (showTabManagement) {
      setShowTabManagement(false);
    } else if (activeTab) {
      setActiveTab(null);
    }
  };

  const getTabComponent = (tabId: TabType) => {
    switch (tabId) {
      case 'profile':
        return <ProfileTab />;
      case 'settings':
        return <SettingsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'features':
        return <FeaturesTab />;
      case 'data':
        return <DataTab />;
      case 'cloud-providers':
        return <CloudProvidersTab />;
      case 'local-providers':
        return <LocalProvidersTab />;
      case 'connection':
        return <ConnectionsTab />;
      case 'event-logs':
        return <EventLogsTab />;
      case 'service-status':
        return <ServiceStatusTab />;
      case 'mcp':
        return <McpTab />;
      default:
        return null;
    }
  };

  const getTabUpdateStatus = (tabId: TabType): boolean => {
    switch (tabId) {
      case 'features':
        return hasNewFeatures;
      case 'notifications':
        return hasUnreadNotifications;
      case 'connection':
        return hasConnectionIssues;
      default:
        return false;
    }
  };

  const getStatusMessage = (tabId: TabType): string => {
    switch (tabId) {
      case 'features':
        return `${unviewedFeatures.length} new feature${unviewedFeatures.length === 1 ? '' : 's'} to explore`;
      case 'notifications':
        return `${unreadNotifications.length} unread notification${unreadNotifications.length === 1 ? '' : 's'}`;
      case 'connection':
        return currentIssue === 'disconnected'
          ? 'Connection lost'
          : currentIssue === 'high-latency'
            ? 'High latency detected'
            : 'Connection issues detected';
      default:
        return '';
    }
  };

  const handleTabClick = (tabId: TabType) => {
    setLoadingTab(tabId);
    setActiveTab(tabId);
    setShowTabManagement(false);

    // Acknowledge notifications based on tab
    switch (tabId) {
      case 'features':
        acknowledgeAllFeatures();
        break;
      case 'notifications':
        markAllAsRead();
        break;
      case 'connection':
        acknowledgeIssue();
        break;
    }

    // Clear loading state after a delay
    setTimeout(() => setLoadingTab(null), 500);
  };

  const panelTitle = showTabManagement ? 'Tab Management' : activeTab ? TAB_LABELS[activeTab] : 'Control Panel';

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={panelTitle}
      size="lg"
      className="border-unqops-elements-borderColor shadow-[var(--theme-shadow-dialog,0_24px_60px_rgba(0,0,0,0.16))]"
      header={
        <header className="relative z-10 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-unqops-elements-borderColor bg-unqops-elements-background-depth-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {(activeTab || showTabManagement) && (
              <button
                type="button"
                aria-label="Back to control panel"
                onClick={handleBack}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-unqops-elements-textSecondary transition-colors hover:bg-unqops-elements-item-backgroundActive hover:text-unqops-elements-item-contentAccent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unqops-elements-focus"
              >
                <span className="i-ph:arrow-left size-4" aria-hidden="true" />
              </button>
            )}
            <h2 className="truncate text-lg font-semibold text-unqops-elements-textPrimary sm:text-xl">{panelTitle}</h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <AvatarDropdown onSelectTab={handleTabClick} />
            <button
              type="button"
              aria-label="Close control panel"
              onClick={handleClose}
              className="inline-flex size-10 items-center justify-center rounded-full text-unqops-elements-textSecondary transition-colors hover:bg-unqops-elements-item-backgroundActive hover:text-unqops-elements-item-contentAccent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unqops-elements-focus"
            >
              <span className="i-ph:x size-4" aria-hidden="true" />
            </button>
          </div>
        </header>
      }
    >
      <div className="relative min-h-full">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <BackgroundRays />
        </div>
        <div className="relative z-10 p-4 sm:p-6">
          {activeTab ? (
            getTabComponent(activeTab)
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className="min-w-0 transition-transform duration-100 ease-out hover:scale-[1.01]"
                  style={{
                    animationDelay: `${index * 30}ms`,
                    animation: open ? 'fadeInUp 200ms ease-out forwards' : 'none',
                  }}
                >
                  <TabTile
                    tab={tab}
                    onClick={() => handleTabClick(tab.id as TabType)}
                    isActive={activeTab === tab.id}
                    hasUpdate={getTabUpdateStatus(tab.id)}
                    statusMessage={getStatusMessage(tab.id)}
                    description={TAB_DESCRIPTIONS[tab.id]}
                    isLoading={loadingTab === tab.id}
                    className="min-h-36 relative"
                  >
                    {BETA_TABS.has(tab.id) && <BetaLabel />}
                  </TabTile>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
