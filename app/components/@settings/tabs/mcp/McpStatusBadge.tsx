import { useMemo } from 'react';

export default function McpStatusBadge({ status }: { status: 'checking' | 'available' | 'unavailable' }) {
  const { styles, label, icon, ariaLabel } = useMemo(() => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors';

    const config = {
      checking: {
        styles: `${base} bg-od-info/12 text-od-info dark:bg-od-info/80 dark:text-od-info`,
        label: 'Checking...',
        ariaLabel: 'Checking server status',
        icon: <span className="i-svg-spinners:90-ring-with-bg w-3 h-3 text-current animate-spin" aria-hidden="true" />,
      },
      available: {
        styles: `${base} bg-od-success/12 text-od-success dark:bg-od-success/80 dark:text-od-success`,
        label: 'Available',
        ariaLabel: 'Server available',
        icon: <span className="i-ph:check-circle w-3 h-3 text-current" aria-hidden="true" />,
      },
      unavailable: {
        styles: `${base} bg-od-danger/12 text-od-danger dark:bg-od-danger/80 dark:text-od-danger`,
        label: 'Unavailable',
        ariaLabel: 'Server unavailable',
        icon: <span className="i-ph:warning-circle w-3 h-3 text-current" aria-hidden="true" />,
      },
    };

    return config[status];
  }, [status]);

  return (
    <span className={styles} role="status" aria-live="polite" aria-label={ariaLabel}>
      {icon}
      {label}
    </span>
  );
}
