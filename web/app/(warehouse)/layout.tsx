import type { ReactNode } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import {
  HomeIcon, ClipboardIcon, ShoppingCartIcon, TruckIcon, LayersIcon, CogIcon,
} from '../../components/layout/icons';

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
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        groups={navGroups}
        role="warehouse_manager"
        roleName="Warehouse Manager"
        locationName="Main Warehouse (WH01)"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName="Sam Park" userRole="warehouse_manager" />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
