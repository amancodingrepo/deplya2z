'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { ClipboardIcon, TruckIcon, ExclamationIcon, BoxIcon } from '../../../../components/layout/icons';

/* ─── Mock data ──────────────────────────────────── */
const confirmedOrders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', type: 'store', items: [{ name: 'Samsung 55" TV', sku: 'SKU-TV-001', qty: 5 }, { name: 'LG Monitor 23"', sku: 'SKU-MON-001', qty: 3 }], approvedAt: '10 min ago' },
  { id: 'ORD-ST02-0002', store: 'Store 02', type: 'store', items: [{ name: 'LG Fridge 23cu', sku: 'SKU-FRG-003', qty: 2 }], approvedAt: '34 min ago' },
  { id: 'ORD-ST03-0003', store: 'Store 03', type: 'store', items: [{ name: 'Sony Headphones', sku: 'SKU-AUD-004', qty: 10 }], approvedAt: '1 hr ago' },
];

const packedOrders = [
  { id: 'ORD-ST01-0005', store: 'Store 01', items: '2× Samsung TV', packedAt: '2 hr ago' },
  { id: 'ORD-ST02-0006', store: 'Store 02', items: '8× iPhone 15 Pro', packedAt: '3 hr ago' },
];

const bulkOrders = [
  { id: 'BULK-0001', client: 'Metro Retail Chain', items: '50× Samsung TV', status: 'confirmed' },
  { id: 'BULK-0002', client: 'TechMart India', items: '200× iPhone 15', status: 'packed' },
];

const lowStock = [
  { name: 'Samsung 55" TV', sku: 'SKU-TV-001', available: 2, threshold: 5 },
  { name: 'LG Fridge 23cu', sku: 'SKU-FRG-003', available: 1, threshold: 5 },
  { name: 'iPhone 15 Pro', sku: 'SKU-PHN-012', available: 0, threshold: 10 },
];

/* ─── Sub-components ─────────────────────────────── */
function KPICard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className={`flex items-start gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs`}>
      <div className={`flex size-11 flex-shrink-0 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      <div>
        <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-[12px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Pack Modal Content ─────────────────────────── */
function PackModalContent({ orderId, items }: { orderId: string; items: typeof confirmedOrders[0]['items'] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = items.every(item => checked[item.sku]);

  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-[13px] text-muted-foreground">Verify all items are physically packed for <span className="font-mono font-semibold text-foreground">{orderId}</span>:</p>
      <div className="rounded-lg border border-border divide-y divide-border">
        {items.map((item) => (
          <label key={item.sku} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-raised">
            <input
              type="checkbox"
              className="size-4 rounded accent-primary"
              checked={!!checked[item.sku]}
              onChange={e => setChecked(prev => ({ ...prev, [item.sku]: e.target.checked }))}
            />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">{item.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{item.sku}</p>
            </div>
            <span className="text-[13px] font-semibold text-foreground">qty: {item.qty}</span>
          </label>
        ))}
      </div>
      {!allChecked && (
        <p className="text-[12px] text-warning">Please check all items before confirming.</p>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────── */
type ModalState = { type: 'pack'; order: typeof confirmedOrders[0] } | { type: 'dispatch'; orderId: string } | null;

export default function WarehouseDashboard() {
  const [modal, setModal] = useState<ModalState>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Warehouse Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Main Warehouse (WH01) · {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[12px] font-semibold text-warning">
          <span className="size-1.5 rounded-full bg-warning animate-pulse" />
          {confirmedOrders.length + packedOrders.length} orders pending action
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label="Orders to Pack" value={String(confirmedOrders.length)} sub="Approved, awaiting pack" accent="bg-primary/10 text-primary" icon={<ClipboardIcon />} />
        <KPICard label="Ready to Dispatch" value={String(packedOrders.length)} sub="Packed & waiting" accent="bg-warning/10 text-warning" icon={<TruckIcon />} />
        <KPICard label="Low Stock Items" value={String(lowStock.length)} sub="1 out of stock" accent="bg-destructive/10 text-destructive" icon={<ExclamationIcon />} />
        <KPICard label="Dispatched Today" value="7" sub="↑ 3 from yesterday" accent="bg-success/10 text-success" icon={<BoxIcon />} />
      </div>

      {/* Dispatch Queue — amber highlight, top priority */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ready to Dispatch</CardTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">Packed orders waiting for dispatch</p>
            </div>
            <Badge variant="warning" dot>{packedOrders.length} ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {packedOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 bg-warning/5 border-l-2 border-warning px-5 py-4 hover:bg-warning/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{o.id}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{o.store} · {o.items}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Packed {o.packedAt}</p>
                </div>
                <Button size="sm" onClick={() => setModal({ type: 'dispatch', orderId: o.id })}>
                  Mark Dispatched
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link href="/wh/dispatch" className="text-[12px] font-medium text-primary hover:underline">View full dispatch queue →</Link>
          </div>
        </CardContent>
      </Card>

      {/* Pack Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approved — Ready to Pack</CardTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">Confirmed orders waiting to be packed</p>
            </div>
            <Badge variant="primary" dot>{confirmedOrders.length} to pack</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {confirmedOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-raised transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold font-mono text-foreground">{o.id}</span>
                    <Badge variant="success" dot>Confirmed</Badge>
                    <span className="text-[11px] text-muted-foreground">· {o.store}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                    {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Approved {o.approvedAt}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'pack', order: o })}>
                  Mark Packed
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link href="/wh/orders/pending" className="text-[12px] font-medium text-primary hover:underline">View all pending orders →</Link>
          </div>
        </CardContent>
      </Card>

      {/* Bulk orders + Low stock */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bulk Orders</CardTitle>
              <Link href="/wh/orders/bulk" className="text-[12px] text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {bulkOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold font-mono text-foreground">{o.id}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{o.client}</p>
                    <p className="text-[11px] text-muted-foreground">{o.items}</p>
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock Alerts</CardTitle>
              <Link href="/wh/inventory" className="text-[12px] text-primary hover:underline">View inventory →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {lowStock.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{item.name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[15px] font-bold tabular-nums ${item.available === 0 ? 'text-destructive' : 'text-warning'}`}>{item.available}</span>
                    <span className="text-[11px] text-muted-foreground">/{item.threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pack Modal — with item checklist */}
      {modal?.type === 'pack' && (
        <Dialog
          open
          onClose={() => setModal(null)}
          title={`Confirm Order Packed — ${modal.order.id}`}
          confirmLabel="Confirm Packed"
          confirmVariant="primary"
          onConfirm={() => setModal(null)}
        >
          <PackModalContent orderId={modal.order.id} items={modal.order.items} />
        </Dialog>
      )}

      {/* Dispatch Modal — with notes */}
      <Dialog
        open={modal?.type === 'dispatch'}
        onClose={() => { setModal(null); setDispatchNotes(''); }}
        title={`Confirm Dispatch — ${modal?.type === 'dispatch' ? modal.orderId : ''}`}
        description="Dispatching will notify the store manager. Add optional notes below."
        confirmLabel="Confirm Dispatch"
        confirmVariant="primary"
        onConfirm={() => { setModal(null); setDispatchNotes(''); }}
      >
        <div className="pt-2">
          <label className="block text-[12px] font-medium text-foreground mb-1.5">Dispatch Notes (optional)</label>
          <textarea
            value={dispatchNotes}
            onChange={e => setDispatchNotes(e.target.value)}
            placeholder="e.g. Driver: Ravi Kumar, Vehicle: MH-01-AB-1234"
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>
      </Dialog>
    </div>
  );
}
