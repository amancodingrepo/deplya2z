'use client';

import { useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { ThemeToggle } from '../../../components/layout/theme-toggle';

function LogoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14L4 17m8 4V11" />
    </svg>
  );
}

const ROLE_ROUTES: Record<string, string> = {
  superadmin: '/dashboard',
  warehouse_manager: '/wh/dashboard',
  store_manager: '/st/dashboard',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    // Simulate login — navigate based on email prefix
    setTimeout(() => {
      setLoading(false);
      if (email.startsWith('admin')) window.location.href = ROLE_ROUTES.superadmin;
      else if (email.startsWith('warehouse')) window.location.href = ROLE_ROUTES.warehouse_manager;
      else if (email.startsWith('store')) window.location.href = ROLE_ROUTES.store_manager;
      else setError('Invalid credentials. Try admin@, warehouse@, or store@.');
    }, 800);
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LogoIcon />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">A2Z Supply</h1>
            <p className="text-sm text-muted-foreground">Store & Warehouse Management</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-foreground">Sign in to your account</h2>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" className="w-full mt-1" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: admin@, warehouse@, or store@ with any password
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          A2Z Supply Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
