import { cn } from '../../lib/cn';

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary';

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning-foreground dark:text-warning',
  destructive: 'bg-destructive-subtle text-destructive',
  outline: 'border border-border bg-transparent text-foreground',
  secondary: 'bg-surface-raised text-foreground border border-border',
};

const dotClasses: Record<Variant, string> = {
  default: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  outline: 'bg-foreground',
  secondary: 'bg-muted-foreground',
};

export function Badge({ variant = 'default', className, children, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('size-1.5 rounded-full flex-shrink-0', dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
}

export function statusToBadgeVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    draft: 'default',
    confirmed: 'primary',
    packed: 'warning',
    dispatched: 'warning',
    store_received: 'success',
    completed: 'success',
    cancelled: 'destructive',
    active: 'success',
    inactive: 'default',
    blocked: 'destructive',
    present: 'success',
    discontinued: 'destructive',
    pending: 'warning',
    in_transit: 'primary',
    rejected: 'destructive',
  };
  return map[status] ?? 'default';
}
