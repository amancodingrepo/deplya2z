import Link from 'next/link';
import { cn } from '../../lib/cn';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
  activePath?: string;
  role: string;
  roleName: string;
  locationName?: string;
}

function LogoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14L4 17m8 4V11" />
    </svg>
  );
}

export function Sidebar({ groups, activePath, role, roleName, locationName }: SidebarProps) {
  return (
    <aside className="flex h-dvh w-60 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LogoIcon />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">A2Z Supply</span>
          <span className="truncate text-xs text-muted-foreground leading-tight">{roleName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5" role="list">
          {groups.map((group, gi) => (
            <li key={gi}>
              {group.label && (
                <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground first:mt-0">
                  {group.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5" role="list">
                {group.items.map((item) => {
                  const isActive = activePath === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-muted/60',
                        )}
                      >
                        <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="ml-auto flex-shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {locationName && (
          <p className="mb-2 px-3 text-xs text-muted-foreground truncate">
            <span className="font-medium">Location:</span> {locationName}
          </p>
        )}
        <Link
          href="/login"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-muted/60 transition-colors"
        >
          <LogoutIcon />
          <span>Log out</span>
        </Link>
      </div>
    </aside>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
