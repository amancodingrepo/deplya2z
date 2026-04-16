'use client';

import { cn } from '../../lib/cn';

export interface Chip<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  color?: 'default' | 'blue' | 'amber' | 'green' | 'red';
}

interface ChipFilterProps<T extends string = string> {
  chips: Chip<T>[];
  active: T | T[];
  onChange: (value: T) => void;
  multi?: boolean;
  className?: string;
}

const colorClasses = {
  default: {
    active: 'bg-primary text-primary-foreground border-primary',
    inactive: 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border-strong',
  },
  blue: {
    active: 'bg-primary/15 text-primary border-primary/30',
    inactive: 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border-strong',
  },
  amber: {
    active: 'bg-warning/15 text-warning border-warning/30',
    inactive: 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border-strong',
  },
  green: {
    active: 'bg-success/15 text-success border-success/30',
    inactive: 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border-strong',
  },
  red: {
    active: 'bg-destructive/15 text-destructive border-destructive/30',
    inactive: 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border-strong',
  },
};

export function ChipFilter<T extends string = string>({ chips, active, onChange, className }: ChipFilterProps<T>) {
  const activeValues = Array.isArray(active) ? active : [active];

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => {
        const isActive = activeValues.includes(chip.value);
        const colors = colorClasses[chip.color ?? 'default'];
        return (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
              isActive ? colors.active : colors.inactive,
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className="tabular-nums opacity-70">{chip.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
