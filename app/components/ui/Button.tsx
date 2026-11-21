import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from '~/utils/classNames';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-od-control text-sm font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-primary/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-od-primary text-od-primary-fg shadow-od-sm hover:bg-od-primary/90',
        primary: 'bg-od-primary text-od-primary-fg shadow-od-sm hover:bg-od-primary/90',
        accent: 'bg-od-accent text-od-accent-fg shadow-od-sm hover:brightness-95',
        destructive: 'bg-od-danger text-white shadow-od-sm hover:brightness-95',
        outline: 'border border-od-border-strong bg-transparent text-od-fg hover:bg-od-subtle',
        secondary: 'border border-od-border bg-od-secondary text-od-secondary-fg hover:border-od-border-strong',
        ghost: 'text-od-fg-muted hover:bg-od-subtle hover:text-od-fg',
        link: 'text-od-fg underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 sm:min-h-9 px-4 py-2',
        sm: 'min-h-11 sm:min-h-8 px-3 text-xs',
        lg: 'min-h-12 sm:min-h-10 px-8',
        icon: 'h-11 w-11 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  _asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, _asChild = false, ...props }, ref) => {
    return <button className={classNames(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
