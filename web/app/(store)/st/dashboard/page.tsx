'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { LayersIcon, ClipboardIcon, ExclamationIcon, PlusIcon, TruckIcon } from '../../../../components/layout/icons';

function StatCard({ label, value, sub, icon, variant = 'default' }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const iconBg = variant === 'danger'
    ? 'bg-destructive/10 text-destructive'
    : variant === 'warning'
    ? 'bg-warning/10 text-warning'
    : 'bg-primary/10 text-primary';
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className={`flex size-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[22px] font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

const incomingOrders = [
  { id: 'ORD-ST01-0001', items: '5× Samsung TV, 3× LG Monitor', status: 'dispatched', time: '1 hr ago' },
];

const activeOrders = [
  { id: 'ORD-ST01-0008', items: '10× LG Fridge', status: 'confirmed', time: '3 hr ago' },
  { id: 'ORD-ST01-0009', items: '4× Dell XPS 15', status: 'packed', time: '5 hr ago' },
];

const lowStock = [
  { name: 'LG Monitor 23"', sku: 'SKU-MON-001', available: 1 },
  { name: 'Dell XPS 15', sku: 'SKU-LAP-007', available: 0 },
  { name: 'Sony WH-1000XM5', sku: 'SKU-HDP-002', available: 2 },
];

const statusLabels: Record<string, string> = {
  draft: 'Draft', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

type ActionModal = { type: 'receive'; orderId: string } | null;

export default function StoreDashboard() {
  const [modal, setModal] = useState<ActionModal>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Store 01 · ST01</p>
        </div>
        <Link href="/st/orders/create">
          <Button size="sm">
            <PlusIcon />
            Request Items
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Items In Stock" value="12" sub="Across 6 products" icon={<LayersIcon />} />
        <StatCard label="Active Orders" value="3" sub="2 confirmed · 1 packed" icon={<ClipboardIcon />} />
        <StatCard label="On the Way" value="1" sub="Confirm when received" icon={<TruckIcon />} variant="warning" />
        <StatCard label="Low Stock" value="3" sub="Request more" icon={<ExclamationIcon />} variant="danger" />
      </div>

      {/* Action Queue — Incoming */}
      {incomingOrders.length > 0 && (
        <Card className="border-warning/40 bg-warning-subtle">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Incoming — Action Required</CardTitle>
                <p className="text-[12px] text-muted-foreground mt-0.5">Orders dispatched — confirm receipt when items arrive</p>
              </div>
              <Badge variant="warning" dot>{incomingOrders.length} incoming</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {incomingOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground">{o.id}</span>
                      <Badge variant="warning" dot>On the Way</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{o.items}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-muted-foreground">{o.time}</span>
                    <Button size="sm" onClick={() => setModal({ type: 'receive', orderId: o.id })}>
                      Confirm Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Active Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Orders</CardTitle>
              <Link href="/st/orders" className="text-[12px] font-medium text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {activeOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{o.id}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{o.items}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {statusLabels[o.status]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{o.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3">
              <Link href="/st/orders/create" className="text-[12px] font-medium text-primary hover:underline">
                + Create new order →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock — with quick request */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock</CardTitle>
              <Link href="/st/inventory" className="text-[12px] font-medium text-primary hover:underline">View inventory</Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {lowStock.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={item.available === 0 ? 'destructive' : 'warning'} dot>
                      {item.available === 0 ? 'Out' : `${item.available} left`}
                    </Badge>
                    <Link href="/st/orders/create">
                      <Button size="sm" variant="outline">Request</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modals */}
      <Dialog
        open={modal?.type === 'receive'}
        onClose={() => setModal(null)}
        title="Confirm Receipt"
        description={`Confirm that all items in ${modal?.orderId} have been received and are in good condition.`}
        confirmLabel="Confirm Receipt"
        onConfirm={() => console.log('Received', modal?.orderId)}
      />
    </div>
  );
}
