'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { LayersIcon, ClipboardIcon, ExclamationIcon, PlusIcon, TruckIcon } from '../../../../components/layout/icons';

/* ─── Mock data ──────────────────────────────────── */
const dispatchedOrders = [
  {
    id: 'ORD-ST01-0006',
    items: [
      { name: 'Samsung 55" TV', sku: 'SKU-TV-001', qty: 5 },
      { name: 'LG Monitor 23"', sku: 'SKU-MON-001', qty: 3 },
    ],
    dispatchedAt: '1 hr ago',
    warehouse: 'WH01',
  },
];

const recentOrders = [
  { id: 'ORD-ST01-0008', items: '10× LG Fridge', status: 'confirmed', updated: '3 hr ago' },
  { id: 'ORD-ST01-0009', items: '4× Dell XPS 15', status: 'packed', updated: '5 hr ago' },
  { id: 'ORD-ST01-0007', items: '2× Sony Headphones', status: 'completed', updated: '1 day ago' },
  { id: 'ORD-ST01-0005', items: '6× iPhone 15 Pro', status: 'completed', updated: '2 days ago' },
];

const lowStock = [
  { name: 'LG Monitor 23"', sku: 'SKU-MON-001', available: 1 },
  { name: 'Dell XPS 15', sku: 'SKU-LAP-007', available: 0 },
  { name: 'Sony Headphones', sku: 'SKU-AUD-004', available: 2 },
];

const inventoryStats = { total: 6, inStock: 4, lowStock: 2, outOfStock: 1 };

const statusLabel: Record<string, string> = {
  draft: 'Draft', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

/* ─── Receive modal content with checklist ───────── */
function ReceiveModalContent({ order }: { order: typeof dispatchedOrders[0] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-[13px] text-muted-foreground">Confirm all listed items have been physically received:</p>
      <div className="rounded-lg border border-border divide-y divide-border">
        {order.items.map(item => (
          <label key={item.sku} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-raised">
            <input type="checkbox" className="size-4 rounded accent-primary"
              checked={!!checked[item.sku]}
              onChange={e => setChecked(prev => ({ ...prev, [item.sku]: e.target.checked }))} />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">{item.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{item.sku}</p>
            </div>
            <span className="text-[13px] font-semibold text-foreground">qty: {item.qty}</span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Confirming will update your store inventory automatically.</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────── */
export default function StoreDashboard() {
  const [receivingOrder, setReceivingOrder] = useState<typeof dispatchedOrders[0] | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Store Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Store 01 (ST01) · {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Link href="/st/orders/create">
          <Button size="sm"><PlusIcon /> Request Products</Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Pending Orders', value: '3', sub: '2 confirmed · 1 packed', accent: 'bg-primary/10 text-primary', icon: <ClipboardIcon /> },
          { label: 'Arriving Soon', value: String(dispatchedOrders.length), sub: 'Confirm receipt when arrived', accent: 'bg-warning/10 text-warning', icon: <TruckIcon /> },
          { label: 'Products in Store', value: String(inventoryStats.total), sub: 'Across all categories', accent: 'bg-muted text-muted-foreground', icon: <LayersIcon /> },
          { label: 'Low Stock', value: String(lowStock.length), sub: '1 out of stock', accent: 'bg-destructive/10 text-destructive', icon: <ExclamationIcon /> },
        ].map(c => (
          <div key={c.label} className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className={`flex size-11 flex-shrink-0 items-center justify-center rounded-xl ${c.accent}`}>{c.icon}</div>
            <div>
              <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">{c.value}</p>
              <p className="mt-1 text-[12px] font-medium text-foreground">{c.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dispatched / action required banner */}
      {dispatchedOrders.length > 0 && (
        <div className="rounded-xl border-2 border-warning/60 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <span className="text-warning mt-0.5">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-foreground">
                {dispatchedOrders.length === 1 ? '1 order is waiting for your confirmation' : `${dispatchedOrders.length} orders waiting for confirmation`}
              </p>
              {dispatchedOrders.map(o => (
                <p key={o.id} className="text-[13px] text-muted-foreground mt-1">
                  Order <span className="font-mono font-semibold text-foreground">{o.id}</span> was dispatched from {o.warehouse} · {o.dispatchedAt}
                </p>
              ))}
              <p className="text-[12px] text-muted-foreground mt-1">Please confirm receipt once items arrive at your store.</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {dispatchedOrders.map(o => (
                <Button key={o.id} size="sm" onClick={() => setReceivingOrder(o)}>
                  Confirm Receipt
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/st/orders" className="text-[12px] text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-surface-raised transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold font-mono text-foreground">{o.id}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{o.items}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusToBadgeVariant(o.status)} dot>{statusLabel[o.status]}</Badge>
                    <span className="text-[11px] text-muted-foreground">{o.updated}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3">
              <Link href="/st/orders/create" className="text-[12px] font-medium text-primary hover:underline">
                + Request new products →
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Inventory health */}
          <Card>
            <CardHeader><CardTitle>Inventory Health</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'In Stock', value: inventoryStats.inStock, total: inventoryStats.total, color: 'bg-success' },
                  { label: 'Low Stock', value: inventoryStats.lowStock, total: inventoryStats.total, color: 'bg-warning' },
                  { label: 'Out of Stock', value: inventoryStats.outOfStock, total: inventoryStats.total, color: 'bg-destructive' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-muted-foreground">{row.label}</span>
                      <span className="text-[12px] font-semibold text-foreground">{row.value}/{row.total}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.value / row.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/st/inventory">
                <Button variant="outline" size="sm" className="mt-4 w-full text-[12px]">View Full Inventory</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Low stock + request */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Low Stock</CardTitle>
                <Link href="/st/inventory" className="text-[12px] text-primary hover:underline">View all →</Link>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-border">
                {lowStock.map(item => (
                  <div key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{item.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.available === 0 ? 'destructive' : 'warning'} dot>
                        {item.available === 0 ? 'Out' : `${item.available} left`}
                      </Badge>
                      <Link href="/st/orders/create">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">Request</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Order CTA */}
      <div className="rounded-xl border-2 border-dashed border-border p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground">Need more products?</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">Request a restock from the warehouse — your order will be reviewed by admin.</p>
        </div>
        <Link href="/st/orders/create">
          <Button size="lg"><PlusIcon /> Request Products from Warehouse</Button>
        </Link>
      </div>

      {/* Confirm receipt modal */}
      {receivingOrder && (
        <Dialog
          open
          onClose={() => setReceivingOrder(null)}
          title={`Confirm Receipt — ${receivingOrder.id}`}
          confirmLabel="Confirm Receipt"
          confirmVariant="primary"
          onConfirm={() => setReceivingOrder(null)}
        >
          <ReceiveModalContent order={receivingOrder} />
        </Dialog>
      )}
    </div>
  );
}
