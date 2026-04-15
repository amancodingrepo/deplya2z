import type { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import {
  HomeIcon, BoxIcon, ClipboardIcon, ShoppingCartIcon, LayersIcon,
  UsersIcon, MapPinIcon, BuildingIcon, ChartBarIcon, CogIcon,
} from '../../components/layout/icons';

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
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users', href: '/users', icon: <UsersIcon /> },
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
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        groups={navGroups}
        role="superadmin"
        roleName="Super Admin"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName="Alex Johnson" userRole="superadmin" />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
