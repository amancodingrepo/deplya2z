import { ThemeToggle } from './theme-toggle';
import { Avatar } from '../ui/avatar';

interface HeaderProps {
  title?: string;
  userName: string;
  userRole: string;
}

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  warehouse_manager: 'Warehouse Manager',
  store_manager: 'Store Manager',
};

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

export function Header({ userName, userRole }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-sm px-6">
      <div />
      <div className="flex items-center gap-1">
        <button
          className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Notifications"
        >
          <BellIcon />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-surface" aria-hidden="true" />
        </button>

        <ThemeToggle />

        <div className="ml-2 flex items-center gap-2.5 pl-2 border-l border-border">
          <Avatar name={userName} size="sm" />
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-foreground leading-tight">{userName}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{roleLabels[userRole] ?? userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
