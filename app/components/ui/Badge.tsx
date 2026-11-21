'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from '~/utils/classNames';

const badgeVariants = cva(
  'inline-flex items-center gap-1 border transition-colors focus:outline-none focus:ring-2 focus:ring-od-primary/40',
  {
    variants: {
      variant: {
        default: 'border-od-border bg-od-subtle text-od-fg',
        secondary: 'border-od-border bg-od-secondary text-od-secondary-fg',
        destructive: 'border-od-danger/30 bg-od-danger/12 text-od-danger',
        outline: 'border-od-border-strong bg-transparent text-od-fg',
        primary: 'border-od-primary/30 bg-od-primary/10 text-od-fg',
        success: 'border-od-success/30 bg-od-success/12 text-od-success',
        warning: 'border-od-warning/30 bg-od-warning/12 text-od-warning',
        danger: 'border-od-danger/30 bg-od-danger/12 text-od-danger',
        info: 'border-od-info/30 bg-od-info/12 text-od-info',
        subtle: 'border-od-border bg-od-surface text-od-fg-muted',
      },
      size: {
        default: 'rounded-od-badge px-2.5 py-0.5 text-xs font-semibold',
        sm: 'rounded-od-badge px-1.5 py-0.5 text-xs',
        md: 'rounded-od-control px-2 py-1 text-xs font-medium',
        lg: 'rounded-od-control px-2.5 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: string;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={classNames(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className={icon} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
