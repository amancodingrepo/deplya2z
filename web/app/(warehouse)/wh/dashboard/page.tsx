'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { ClipboardIcon, TruckIcon, ExclamationIcon, ShoppingCartIcon } from '../../../../components/layout/icons';

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

const confirmedOrders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', items: '5× Samsung TV, 3× LG Monitor', time: '10 min ago' },
  { id: 'ORD-ST02-0002', store: 'Store 02', items: '2× LG Fridge', time: '34 min ago' },
  { id: 'ORD-ST03-0003', store: 'Store 03', items: '10× Sony Headphones', time: '1 hr ago' },
];

const packedOrders = [
  { id: 'ORD-ST01-0005', store: 'Store 01', items: '2× Samsung TV', time: '2 hr ago' },
  { id: 'ORD-ST02-0006', store: 'Store 02', items: '8× iPhone 15', time: '3 hr ago' },
];

const bulkOrders = [
  { id: 'BULK-0001', client: 'Metro Retail Chain', items: '50× Samsung TV', status: 'confirmed' },
  { id: 'BULK-0002', client: 'TechMart India', items: '200× iPhone 15', status: 'draft' },
];

const lowStock = [
  { name: 'Samsung 55" TV', sku: 'SKU-TV-001', available: 2 },
  { name: 'LG Fridge 23cu', sku: 'SKU-FRG-003', available: 1 },
];

type ActionModal = { type: 'pack' | 'dispatch'; orderId: string } | null;

export default function WarehouseDashboard() {
  const [modal, setModal] = useState<ActionModal>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Main Warehouse · WH01</p>
        </div>
        <Link href="/wh/orders/pending">
          <Button size="sm">View All Orders</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending Orders" value="5" sub="3 store · 2 bulk" icon={<ClipboardIcon />} variant="warning" />
        <StatCard label="Bulk Orders" value="2" sub="Ready to pack" icon={<ShoppingCartIcon />} />
        <StatCard label="Ready to Dispatch" value="2" sub="Packed & waiting" icon={<TruckIcon />} />
        <StatCard label="Low Stock" value="2" sub="Needs restocking" icon={<ExclamationIcon />} variant="danger" />
      </div>

      {/* Pack Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pack Queue</CardTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">Confirmed orders ready to pack</p>
            </div>
            <Badge variant="warning" dot>3 to pack</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {confirmedOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground">{o.id}</span>
                    <span className="text-[12px] text-muted-foreground">·</span>
                    <span className="text-[12px] text-muted-foreground">{o.store}</span>
                    <Badge variant="primary" dot>Confirmed</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{o.items}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-muted-foreground">{o.time}</span>
                  <Button size="sm" onClick={() => setModal({ type: 'pack', orderId: o.id })}>
                    Mark Packed
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link href="/wh/orders/pending" className="text-[12px] font-medium text-primary hover:underline">
              View all pending orders →
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Dispatch Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Dispatch Queue</CardTitle>
                <p className="text-[12px] text-muted-foreground mt-0.5">Packed orders ready to ship</p>
              </div>
              <Badge variant="success" dot>2 ready</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {packedOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{o.id}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{o.store} · {o.items}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-muted-foreground">{o.time}</span>
                    <Button size="sm" onClick={() => setModal({ type: 'dispatch', orderId: o.id })}>
                      Dispatch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3">
              <Link href="/wh/dispatch" className="text-[12px] font-medium text-primary hover:underline">
                View dispatch queue →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Bulk + Low Stock */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bulk Orders</CardTitle>
                <Link href="/wh/orders/bulk" className="text-[12px] font-medium text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-border">
                {bulkOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{o.id}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{o.client} · {o.items}</p>
                    </div>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-border">
                {lowStock.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.sku}</p>
                    </div>
                    <Badge variant="destructive" dot>{item.available} left</Badge>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-5 py-3">
                <Link href="/wh/inventory" className="text-[12px] font-medium text-primary hover:underline">
                  View inventory →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modals */}
      <Dialog
        open={modal?.type === 'pack'}
        onClose={() => setModal(null)}
        title="Mark Order as Packed"
        description={`Confirm that ${modal?.orderId} has been fully packed and is ready for dispatch.`}
        confirmLabel="Mark Packed"
        onConfirm={() => console.log('Packed', modal?.orderId)}
      />
      <Dialog
        open={modal?.type === 'dispatch'}
        onClose={() => setModal(null)}
        title="Dispatch Order"
        description={`Confirm dispatch of ${modal?.orderId}. The store will be notified.`}
        confirmLabel="Dispatch"
        onConfirm={() => console.log('Dispatched', modal?.orderId)}
      />
    </div>
  );
}
