import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { classNames } from '~/utils/classNames';

export type DrawerSide = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  header?: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  className?: string;
  closeLabel?: string;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'w-full max-w-md',
  md: 'w-full max-w-2xl',
  lg: 'w-full max-w-[1200px]',
  full: 'w-full max-w-none',
};

/** Accessible right/left side sheet with a mobile full-screen layout. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  header,
  side = 'right',
  size = 'sm',
  className,
  closeLabel = 'Close panel',
}: DrawerProps) {
  const sideClasses = side === 'right' ? 'right-0 border-l' : 'left-0 border-r';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={classNames(
            'fixed inset-y-0 z-[9999] flex max-h-[100dvh] flex-col overflow-hidden border-unqops-elements-borderColor bg-unqops-elements-background-depth-1 text-unqops-elements-textPrimary shadow-2xl focus:outline-none',
            sideClasses,
            sizeClasses[size],
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {header ? (
            header
          ) : (
            <header className="flex min-h-16 items-center justify-between border-b border-unqops-elements-borderColor bg-unqops-elements-background-depth-2 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
              <h2 className="text-base font-semibold">{title}</h2>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label={closeLabel}
                  className="inline-flex size-10 items-center justify-center rounded-full text-unqops-elements-textSecondary transition-colors hover:bg-unqops-elements-item-backgroundActive hover:text-unqops-elements-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unqops-elements-focus"
                >
                  <span className="i-ph:x size-4" aria-hidden="true" />
                </button>
              </DialogPrimitive.Close>
            </header>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
