'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import {
  HomeIcon, PlusIcon, ClipboardIcon, LayersIcon, CogIcon,
} from '../../components/layout/icons';
import { getAuth, clearAuth, getUserInitials } from '../../lib/auth';

const navGroups = [
  {
    items: [
      { label: 'Dashboard', href: '/st/dashboard', icon: <HomeIcon /> },
    ],
  },
  {
    label: 'Orders',
    items: [
      { label: 'Create Order', href: '/st/orders/create', icon: <PlusIcon /> },
      { label: 'My Orders', href: '/st/orders', icon: <ClipboardIcon /> },
    ],
  },
  {
    label: 'Stock',
    items: [
      { label: 'Inventory', href: '/st/inventory', icon: <LayersIcon /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/st/settings', icon: <CogIcon /> },
    ],
  },
];

export default function StoreLayout({ children }: { children: ReactNode }) {
  const auth = getAuth();
  const userName = auth?.user.name ?? 'Manager';
  const userInitials = getUserInitials(userName);
  const locationName = auth?.user.location_name ?? auth?.user.location_code ?? 'Store';

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        groups={navGroups}
        roleName="Store Manager"
        locationName={locationName}
        userName={userName}
        userInitials={userInitials}
        onLogout={() => { clearAuth(); window.location.href = '/login'; }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userRole="store_manager" />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
