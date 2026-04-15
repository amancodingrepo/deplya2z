'use client';

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { ThemeToggle } from '../../../components/layout/theme-toggle';

function LogoMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="size-6" aria-hidden="true">
      <path d="M14 2L3 8v12l11 6 11-6V8L14 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3 8l11 6m0 0l11-6m-11 6v12" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

// Demo credentials — each maps to a role and dashboard
const demoCredentials = [
  {
    role: 'Super Admin',
    email: 'admin@a2zsupply.com',
    password: 'admin123',
    hint: 'Full system access',
    href: '/dashboard',
    dotColor: 'bg-primary',
  },
  {
    role: 'Warehouse Manager',
    email: 'warehouse@a2zsupply.com',
    password: 'wh123',
    hint: 'WH01 · Pack & dispatch',
    href: '/wh/dashboard',
    dotColor: 'bg-warning',
  },
  {
    role: 'Store Manager',
    email: 'store@a2zsupply.com',
    password: 'store123',
    hint: 'ST01 · Request & receive',
    href: '/st/dashboard',
    dotColor: 'bg-success',
  },
];

function getRoleRoute(email: string): string | null {
  if (email.startsWith('admin')) return '/dashboard';
  if (email.startsWith('warehouse')) return '/wh/dashboard';
  if (email.startsWith('store')) return '/st/dashboard';
  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  function fillCredentials(cred: typeof demoCredentials[0]) {
    setEmail(cred.email);
    setPassword(cred.password);
    setError('');
    setShowDemo(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const route = getRoleRoute(email);
      if (route) {
        window.location.href = route;
      } else {
        setError('Invalid credentials. Use the demo credentials below.');
      }
    }, 500);
  }

  return (
    <div className="relative flex min-h-dvh bg-background">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between bg-sidebar p-10">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <LogoMark />
          </span>
          <div>
            <p className="text-[14px] font-bold text-sidebar-foreground">A2Z Supply</p>
            <p className="text-[11px] text-sidebar-foreground-muted">Management System</p>
          </div>
        </div>

        <div>
          <blockquote className="border-l-2 border-primary/40 pl-4">
            <p className="text-[15px] text-sidebar-foreground leading-relaxed">
              "Real-time inventory, zero overselling, full audit trail — built for speed and reliability."
            </p>
          </blockquote>

          <div className="mt-8 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-sidebar-foreground-muted uppercase tracking-widest">Role-based access</p>
            {demoCredentials.map(c => (
              <div key={c.role} className="flex items-center gap-3">
                <span className={`size-2 rounded-full flex-shrink-0 ${c.dotColor}`} />
                <div>
                  <p className="text-[13px] font-medium text-sidebar-foreground">{c.role}</p>
                  <p className="text-[11px] text-sidebar-foreground-muted">{c.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-sidebar-foreground-muted">
          © {new Date().getFullYear()} A2Z Supply Management
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 relative">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary shadow-sm">
              <LogoMark />
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">A2Z Supply</h1>
              <p className="text-[13px] text-muted-foreground">Supply & Warehouse Management</p>
            </div>
          </div>

          {/* Desktop title */}
          <div className="mb-6 hidden lg:block">
            <h1 className="text-[22px] font-bold text-foreground">Sign in</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Enter your credentials to access your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-foreground">Email address</label>
              <input
                type="email"
                placeholder="you@a2zsupply.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="h-10 rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-foreground">Password</label>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10 rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive-subtle px-3 py-2 text-[12px] text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" className="w-full h-10 mt-1" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {/* Demo credentials toggle */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDemo(v => !v)}
              className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Demo credentials</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`size-3.5 transition-transform ${showDemo ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDemo && (
              <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">Click to auto-fill</p>
                {demoCredentials.map(c => (
                  <button
                    key={c.role}
                    type="button"
                    onClick={() => fillCredentials(c)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-raised transition-colors text-left"
                  >
                    <span className={`size-2 rounded-full flex-shrink-0 ${c.dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{c.role}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{c.email}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Fill →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
