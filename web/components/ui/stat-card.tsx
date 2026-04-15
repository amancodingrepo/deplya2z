import { cn } from '../../lib/cn';
import { Card } from './card';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, changeType = 'neutral', icon, className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
          {change && (
            <span
              className={cn('text-xs tabular-nums', {
                'text-success': changeType === 'positive',
                'text-destructive': changeType === 'negative',
                'text-muted-foreground': changeType === 'neutral',
              })}
            >
              {change}
            </span>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 rounded-md bg-primary-subtle p-2.5 text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
