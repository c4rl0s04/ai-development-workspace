// Adapted from the approved workspace primitives; universal, without client hooks.
import { cva } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

const badgeVariants = cva('ws-badge', {
  variants: {
    tone: {
      neutral: 'ws-tone-neutral',
      success: 'ws-tone-success',
      warning: 'ws-tone-warning',
      danger: 'ws-tone-danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return <span {...props} className={cn(badgeVariants({ tone }), className)} />;
}
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={cn('ws-skeleton', className)}
    />
  );
}
