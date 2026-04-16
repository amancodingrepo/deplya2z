'use client';

import { cn } from '../../lib/cn';

export interface Tab<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string = string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({ tabs, active, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
            active === tab.value
              ? 'text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary after:rounded-t-full'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
              active === tab.value
                ? 'bg-primary/15 text-primary'
                : 'bg-surface-raised text-muted-foreground',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
