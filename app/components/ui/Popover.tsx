import * as Popover from '@radix-ui/react-popover';
import type { PropsWithChildren, ReactNode } from 'react';

export default ({
  children,
  trigger,
  side,
  align,
}: PropsWithChildren<{
  trigger: ReactNode;
  side: 'top' | 'right' | 'bottom' | 'left' | undefined;
  align: 'center' | 'start' | 'end' | undefined;
}>) => (
  <Popover.Root>
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    <Popover.Anchor />
    <Popover.Portal>
      <Popover.Content
        sideOffset={10}
        side={side}
        align={align}
        className="border border-od-border bg-od-surface text-od-fg p-2 rounded-od-card shadow-od-lg z-workbench"
      >
        {children}
        <Popover.Arrow className="fill-od-surface" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
