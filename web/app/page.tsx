import { ThemeToggle } from '../components/layout/theme-toggle';

function LogoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14L4 17m8 4V11" />
    </svg>
  );
}

const roles = [
  {
    title: 'Super Admin',
    description: 'Full system access — products, orders, users, reports, locations, and clients.',
    href: '/dashboard',
    color: 'bg-primary-subtle border-primary/20 hover:border-primary/50',
    badge: 'bg-primary text-primary-foreground',
    items: ['Product catalogue', 'Order approvals', 'User management', 'Reports & audit logs'],
  },
  {
    title: 'Warehouse Manager',
    description: 'Pack and dispatch store orders and bulk orders from the warehouse.',
    href: '/wh/dashboard',
    color: 'bg-warning-subtle border-warning/20 hover:border-warning/50',
    badge: 'bg-warning text-warning-foreground',
    items: ['Pending orders', 'Bulk orders', 'Dispatch queue', 'Warehouse inventory'],
  },
  {
    title: 'Store Manager',
    description: 'Request inventory from warehouse, track orders, and view store stock.',
    href: '/st/dashboard',
    color: 'bg-success-subtle border-success/20 hover:border-success/50',
    badge: 'bg-success text-success-foreground',
    items: ['Create order requests', 'Track orders', 'Confirm receipts', 'Store inventory'],
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-dvh bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-20">
        {/* Hero */}
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <LogoIcon />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-foreground">A2Z Supply Management</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Role-based operations console for stores and warehouses
            </p>
          </div>
          <a
            href="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Sign in →
          </a>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {roles.map((role) => (
            <a
              key={role.title}
              href={role.href}
              className={`group flex flex-col gap-3 rounded-xl border p-5 transition-all ${role.color}`}
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${role.badge}`}>
                  {role.title}
                </span>
                <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
              </div>
              <p className="text-sm text-muted-foreground">{role.description}</p>
              <ul className="flex flex-col gap-1">
                {role.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="size-1 rounded-full bg-current opacity-40 flex-shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </a>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          A2Z Supply Management System &copy; {new Date().getFullYear()} · Demo environment
        </p>
      </div>
    </div>
  );
}
