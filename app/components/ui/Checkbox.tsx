import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={classNames(
      'peer h-4 w-4 shrink-0 rounded-[calc(var(--od-r-control)/3)] border border-od-border-strong bg-od-bg transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-primary/40',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-od-primary data-[state=checked]:bg-od-primary data-[state=checked]:text-od-primary-fg',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
