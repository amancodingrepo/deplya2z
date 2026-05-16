'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import {
  HomeIcon, ClipboardIcon, ShoppingCartIcon, TruckIcon, LayersIcon, CogIcon,
} from '../../components/layout/icons';
import { getAuth, clearAuth, getUserInitials } from '../../lib/auth';

const navGroups = [
  {
    items: [
      { label: 'Dashboard', href: '/wh/dashboard', icon: <HomeIcon /> },
    ],
  },
  {
    label: 'Orders',
    items: [
      { label: 'Pending Orders', href: '/wh/orders/pending', icon: <ClipboardIcon />, badge: 5 },
      { label: 'Bulk Orders', href: '/wh/orders/bulk', icon: <ShoppingCartIcon />, badge: 2 },
      { label: 'Dispatch Queue', href: '/wh/dispatch', icon: <TruckIcon /> },
    ],
  },
  {
    label: 'Stock',
    items: [
      { label: 'Inventory', href: '/wh/inventory', icon: <LayersIcon /> },
      { label: 'Transfers', href: '/wh/transfers', icon: <TruckIcon /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/wh/settings', icon: <CogIcon /> },
    ],
  },
];

export default function WarehouseLayout({ children }: { children: ReactNode }) {
  const auth = getAuth();
  const userName = auth?.user.name ?? 'Manager';
  const userInitials = getUserInitials(userName);
  const locationName = auth?.user.location_name ?? auth?.user.location_code ?? 'Warehouse';

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        groups={navGroups}
        roleName="Warehouse Manager"
        locationName={locationName}
        userName={userName}
        userInitials={userInitials}
        onLogout={() => { clearAuth(); window.location.href = '/login'; }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userRole="warehouse_manager" />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
