import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

// Which URL prefixes each role is allowed to access
const ROLE_PREFIXES: Record<string, string[]> = {
  superadmin:        ['/dashboard', '/products', '/inventory', '/orders', '/users', '/locations', '/clients', '/reports', '/settings'],
  warehouse_manager: ['/wh/'],
  store_manager:     ['/st/'],
};

const ROLE_HOME: Record<string, string> = {
  superadmin:        '/dashboard',
  warehouse_manager: '/wh/dashboard',
  store_manager:     '/st/dashboard',
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Next.js internals / static assets — always allow
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')   ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Public pages — always allow
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('a2z_token')?.value;
  const role  = req.cookies.get('a2z_role')?.value;

  // Not authenticated → /login
  if (!token || !role) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Root → role home
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? '/login';
    return NextResponse.redirect(url);
  }

  // Wrong role trying to access another role's section → redirect to their home
  const allowed = ROLE_PREFIXES[role] ?? [];
  const ok = allowed.some((prefix) => pathname.startsWith(prefix));
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
