'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import {
  HomeIcon, BoxIcon, ClipboardIcon, ShoppingCartIcon, LayersIcon,
  UsersIcon, MapPinIcon, BuildingIcon, ChartBarIcon, CogIcon, TruckIcon,
} from '../../components/layout/icons';
import { getAuth, clearAuth, getUserInitials } from '../../lib/auth';

const navGroups = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Products', href: '/products', icon: <BoxIcon /> },
      { label: 'Inventory', href: '/inventory', icon: <LayersIcon /> },
    ],
  },
  {
    label: 'Orders',
    items: [
      { label: 'Store Orders', href: '/orders/store-orders', icon: <ClipboardIcon />, badge: 4 },
      { label: 'Bulk Orders', href: '/orders/bulk-orders', icon: <ShoppingCartIcon /> },
      { label: 'Transfers', href: '/transfers', icon: <TruckIcon /> },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users', href: '/users', icon: <UsersIcon /> },
      { label: 'Staff', href: '/staff', icon: <UsersIcon /> },
      { label: 'Locations', href: '/locations', icon: <MapPinIcon /> },
      { label: 'Clients', href: '/clients', icon: <BuildingIcon /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: <ChartBarIcon /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: <CogIcon /> },
    ],
  },
];

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  const auth = getAuth();
  const userName = auth?.user.name ?? 'Admin';
  const userInitials = getUserInitials(userName);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        groups={navGroups}
        roleName="Super Admin"
        userName={userName}
        userInitials={userInitials}
        onLogout={() => { clearAuth(); window.location.href = '/login'; }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userRole="superadmin" />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
