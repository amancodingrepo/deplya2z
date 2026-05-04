'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { ClipboardIcon, TruckIcon, ExclamationIcon, BoxIcon } from '../../../../components/layout/icons';
import { getToken, getUser } from '../../../../lib/auth';
import {
  apiOrders, apiBulkOrders, apiInventoryLowStock,
  apiPackOrder, apiDispatchOrder,
} from '../../../../lib/api';
import type { StoreOrder, BulkOrder, LowStockAlert } from '../../../../lib/api';

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

function PackModalContent({ orderId, items }: { orderId: string; items: StoreOrder['items'] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = items.every(item => checked[item.sku]);
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-[13px] text-muted-foreground">Verify all items are physically packed for <span className="font-mono font-semibold text-foreground">{orderId}</span>:</p>
      <div className="rounded-lg border border-border divide-y divide-border">
        {items.map((item) => (
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
      {!allChecked && <p className="text-[12px] text-warning">Please check all items before confirming.</p>}
    </div>
  );
}

type ModalState =
  | { type: 'pack'; order: StoreOrder }
  | { type: 'dispatch'; orderId: string }
  | null;

export default function WarehouseDashboard() {
  const user = getUser();
  const locationName = user?.location_name ?? user?.location_code ?? 'Warehouse';

  const [modal, setModal] = useState<ModalState>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [confirmedOrders, setConfirmedOrders] = useState<StoreOrder[]>([]);
  const [packedOrders, setPackedOrders] = useState<StoreOrder[]>([]);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [confirmed, packed, bulk, ls] = await Promise.allSettled([
        apiOrders(token, { status: 'confirmed', limit: 50 }),
        apiOrders(token, { status: 'packed', limit: 50 }),
        apiBulkOrders(token, { status: 'confirmed', limit: 20 }),
        apiInventoryLowStock(token),
      ]);
      if (confirmed.status === 'fulfilled') setConfirmedOrders(confirmed.value.data);
      if (packed.status === 'fulfilled') setPackedOrders(packed.value.data);
      if (bulk.status === 'fulfilled') setBulkOrders(bulk.value.data);
      if (ls.status === 'fulfilled') setLowStock(ls.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  async function handlePack(order: StoreOrder) {
    const token = getToken();
    if (!token) return;
    try { await apiPackOrder(token, order.id); } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
    setModal(null);
  }

  async function handleDispatch(orderId: string) {
    const token = getToken();
    if (!token) return;
    try { await apiDispatchOrder(token, orderId); } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
    setModal(null);
    setDispatchNotes('');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Warehouse Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {locationName} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            {loading && <span className="ml-2 text-[11px] text-muted-foreground animate-pulse">Refreshing…</span>}
          </p>
        </div>
        {(confirmedOrders.length + packedOrders.length) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[12px] font-semibold text-warning">
            <span className="size-1.5 rounded-full bg-warning animate-pulse" />
            {confirmedOrders.length + packedOrders.length} orders pending action
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label="Orders to Pack" value={String(confirmedOrders.length)} sub="Approved, awaiting pack" accent="bg-primary/10 text-primary" icon={<ClipboardIcon />} />
        <KPICard label="Ready to Dispatch" value={String(packedOrders.length)} sub="Packed & waiting" accent="bg-warning/10 text-warning" icon={<TruckIcon />} />
        <KPICard label="Low Stock Items" value={String(lowStock.length)} sub={lowStock.some(i => i.available === 0) ? '1 out of stock' : 'Monitor closely'} accent="bg-destructive/10 text-destructive" icon={<ExclamationIcon />} />
        <KPICard label="Dispatched Today" value="—" sub="Check reports for full view" accent="bg-success/10 text-success" icon={<BoxIcon />} />
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
          {loading ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
          ) : packedOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No orders ready to dispatch</p>
          ) : (
            <div className="divide-y divide-border">
              {packedOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-4 bg-warning/5 border-l-2 border-warning px-5 py-4 hover:bg-warning/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{o.id}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{o.store} · {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                  </div>
                  <Button size="sm" onClick={() => setModal({ type: 'dispatch', orderId: o.id })}>
                    Mark Dispatched
                  </Button>
                </div>
              ))}
            </div>
          )}
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
          {loading ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
          ) : confirmedOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No orders to pack right now</p>
          ) : (
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
                    <p className="text-[11px] text-muted-foreground">by {o.by}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'pack', order: o })}>
                    Mark Packed
                  </Button>
                </div>
              ))}
            </div>
          )}
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
            {loading ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
            ) : bulkOrders.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">No active bulk orders</p>
            ) : (
              <div className="divide-y divide-border">
                {bulkOrders.slice(0, 4).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold font-mono text-foreground">{o.id}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{o.client_name}</p>
                      <p className="text-[11px] text-muted-foreground">{o.items.reduce((s, i) => s + i.qty, 0)} units</p>
                    </div>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
            {loading ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
            ) : lowStock.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">All stock levels look good</p>
            ) : (
              <div className="divide-y divide-border">
                {lowStock.slice(0, 5).map((item) => (
                  <div key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{item.product_title}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[15px] font-bold tabular-nums ${item.available === 0 ? 'text-destructive' : 'text-warning'}`}>{item.available}</span>
                      <span className="text-[11px] text-muted-foreground">/{item.threshold}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pack Modal */}
      {modal?.type === 'pack' && (
        <Dialog
          open
          onClose={() => setModal(null)}
          title={`Confirm Order Packed — ${modal.order.id}`}
          confirmLabel="Confirm Packed"
          confirmVariant="primary"
          onConfirm={() => handlePack(modal.order)}
        >
          <PackModalContent orderId={modal.order.id} items={modal.order.items} />
        </Dialog>
      )}

      {/* Dispatch Modal */}
      <Dialog
        open={modal?.type === 'dispatch'}
        onClose={() => { setModal(null); setDispatchNotes(''); }}
        title={`Confirm Dispatch — ${modal?.type === 'dispatch' ? modal.orderId : ''}`}
        description="Dispatching will notify the store manager. Add optional notes below."
        confirmLabel="Confirm Dispatch"
        confirmVariant="primary"
        onConfirm={() => { if (modal?.type === 'dispatch') handleDispatch(modal.orderId); }}
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
