export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'warehouse_manager' | 'store_manager';
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
  location_type: 'warehouse' | 'store' | null;
}

export interface AuthState {
  token: string;
  user: AuthUser;
}

const AUTH_KEY = 'a2z_auth';

export function setAuth(state: AuthState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  // Cookie lets Next.js middleware read role without localStorage access
  const maxAge = 60 * 60 * 24; // 24 hours
  document.cookie = `a2z_token=${state.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `a2z_role=${state.user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getAuth(): AuthState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}

export function getUser(): AuthUser | null {
  return getAuth()?.user ?? null;
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  document.cookie = 'a2z_token=; path=/; max-age=0';
  document.cookie = 'a2z_role=; path=/; max-age=0';
}

export function getDashboardRoute(role: AuthUser['role']): string {
  switch (role) {
    case 'superadmin':        return '/dashboard';
    case 'warehouse_manager': return '/wh/dashboard';
    case 'store_manager':     return '/st/dashboard';
  }
}

export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function getRoleLabel(role: AuthUser['role']): string {
  switch (role) {
    case 'superadmin':        return 'Super Admin';
    case 'warehouse_manager': return 'Warehouse Manager';
    case 'store_manager':     return 'Store Manager';
  }
}
