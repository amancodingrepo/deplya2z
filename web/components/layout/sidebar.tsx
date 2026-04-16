import Link from 'next/link';
import { cn } from '../../lib/cn';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'default' | 'warning' | 'danger';
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
  activePath?: string;
  roleName: string;
  locationName?: string;
  userName?: string;
  userInitials?: string;
}

function LogoMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="size-5" aria-hidden="true">
      <path d="M14 2L3 8v12l11 6 11-6V8L14 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 8l11 6m0 0l11-6m-11 6v12" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

const badgeVariantClasses = {
  default: 'bg-blue-500/20 text-blue-400',
  warning: 'bg-amber-500/20 text-amber-400',
  danger: 'bg-red-500/20 text-red-400',
};

export function Sidebar({ groups, activePath, roleName, locationName, userName, userInitials }: SidebarProps) {
  return (
    <aside className="flex h-dvh w-56 flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border">

      {/* Brand */}
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary flex-shrink-0">
          <LogoMark />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-sidebar-foreground leading-tight truncate">A2Z Supply</p>
          <p className="text-[11px] text-sidebar-foreground-muted leading-tight truncate">{roleName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 no-scrollbar" aria-label="Main navigation">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {group.label && (
              <p className="mx-3 mb-1 mt-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground-muted select-none">
                {group.label}
              </p>
            )}
            <ul role="list" className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const isActive = activePath === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-active-bg text-sidebar-active'
                          : 'text-sidebar-foreground-muted hover:bg-sidebar-hover-bg hover:text-sidebar-foreground',
                      )}
                    >
                      <span className={cn('flex-shrink-0', isActive ? 'text-sidebar-active' : '')}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={cn(
                          'ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                          badgeVariantClasses[item.badgeVariant ?? 'default'],
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {locationName && (
          <div className="mx-1 mb-2 rounded-md bg-sidebar-hover-bg px-3 py-2">
            <p className="text-[10px] text-sidebar-foreground-muted uppercase tracking-wide font-semibold">Location</p>
            <p className="text-[12px] text-sidebar-foreground truncate mt-0.5">{locationName}</p>
          </div>
        )}

        {userName && (
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
              {userInitials}
            </span>
            <span className="truncate text-[13px] font-medium text-sidebar-foreground">{userName}</span>
          </div>
        )}

        <Link
          href="/login"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground-muted hover:bg-sidebar-hover-bg hover:text-sidebar-foreground transition-colors"
        >
          <LogoutIcon />
          <span>Log out</span>
        </Link>
      </div>
    </aside>
  );
}
