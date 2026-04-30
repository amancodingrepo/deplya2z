'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Tabs } from '../../../../components/ui/tabs';
import { Dialog } from '../../../../components/ui/dialog';
import { getToken, getAuth } from '../../../../lib/auth';
import { apiOrders, apiApproveOrder, apiRejectOrder, apiCancelOrder } from '../../../../lib/api';
import type { StoreOrder } from '../../../../lib/api';

const auth = getAuth();
const userRole = auth?.user?.role;
const isWarehouseManager = userRole === 'warehouse_manager';

/* ─── Mock data ──────────────────────────────────── */
const allOrders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', warehouse: 'WH01', by: 'Priya Sharma', created: 'Apr 12, 10:30 AM', status: 'draft', items: [{ name: 'Samsung 55" TV', sku: 'SKU-TV-001', qty: 5, available: 12 }, { name: 'LG Monitor 23"', sku: 'SKU-MON-001', qty: 3, available: 2 }] },
  { id: 'ORD-ST03-0004', store: 'Store 03', warehouse: 'WH01', by: 'Meera Das', created: 'Apr 12, 9:00 AM', status: 'draft', items: [{ name: 'MacBook Pro 14"', sku: 'SKU-LAP-008', qty: 1, available: 5 }, { name: 'iPhone 15 Pro', sku: 'SKU-PHN-012', qty: 2, available: 22 }] },
  { id: 'ORD-ST02-0007', store: 'Store 02', warehouse: 'WH01', by: 'Raj Patel', created: 'Apr 12, 8:30 AM', status: 'draft', items: [{ name: 'Sony Headphones', sku: 'SKU-AUD-004', qty: 12, available: 18 }] },
  { id: 'ORD-ST04-0009', store: 'Store 04', warehouse: 'WH02', by: 'Anita Roy', created: 'Apr 12, 7:15 AM', status: 'draft', items: [{ name: 'LG Fridge 23cu', sku: 'SKU-FRG-003', qty: 6, available: 1 }] },
  { id: 'ORD-ST02-0002', store: 'Store 02', warehouse: 'WH01', by: 'Raj Patel', created: 'Apr 12, 9:15 AM', status: 'confirmed', items: [{ name: 'LG Fridge 23cu', sku: 'SKU-FRG-003', qty: 2, available: 1 }] },
  { id: 'ORD-ST01-0005', store: 'Store 01', warehouse: 'WH01', by: 'Priya Sharma', created: 'Apr 11, 2:00 PM', status: 'packed', items: [{ name: 'Samsung 55" TV', sku: 'SKU-TV-001', qty: 2, available: 12 }] },
  { id: 'ORD-ST03-0006', store: 'Store 03', warehouse: 'WH01', by: 'Meera Das', created: 'Apr 11, 11:00 AM', status: 'dispatched', items: [{ name: 'Sony Headphones', sku: 'SKU-AUD-004', qty: 10, available: 18 }] },
  { id: 'ORD-ST02-0003', store: 'Store 02', warehouse: 'WH01', by: 'Raj Patel', created: 'Apr 10, 4:30 PM', status: 'store_received', items: [{ name: 'MacBook Pro 14"', sku: 'SKU-LAP-008', qty: 1, available: 5 }] },
  { id: 'ORD-ST01-0007', store: 'Store 01', warehouse: 'WH01', by: 'Priya Sharma', created: 'Apr 9, 9:00 AM', status: 'completed', items: [{ name: 'iPhone 15 Pro', sku: 'SKU-PHN-012', qty: 8, available: 22 }] },
  { id: 'ORD-ST04-0008', store: 'Store 04', warehouse: 'WH02', by: 'Anita Roy', created: 'Apr 9, 2:00 PM', status: 'cancelled', items: [{ name: 'Dell XPS 15', sku: 'SKU-LAP-007', qty: 3, available: 3 }] },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'Dispatched', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

const TIMELINE_STEPS = ['Created', 'Approved', 'Packed', 'Dispatched', 'Store Received', 'Completed'];
const STATUS_TO_STEP: Record<string, number> = {
  draft: 0, confirmed: 1, packed: 2, dispatched: 3, store_received: 4, completed: 5, cancelled: -1,
};

type TabValue = 'all' | 'draft' | 'confirmed' | 'packed' | 'dispatched' | 'completed' | 'cancelled';
type Order = typeof allOrders[0];

const draftCount = allOrders.filter(o => o.status === 'draft').length;
const confirmedCount = allOrders.filter(o => o.status === 'confirmed').length;
const packedCount = allOrders.filter(o => o.status === 'packed').length;
const dispatchedCount = allOrders.filter(o => o.status === 'dispatched').length;
const completedCount = allOrders.filter(o => ['completed', 'cancelled'].includes(o.status)).length;

/* ─── Order Detail Drawer ────────────────────────── */
function OrderDrawer({ order, onClose, onApprove, onReject }: {
  order: Order; onClose: () => void;
  onApprove?: () => void; onReject?: () => void;
}) {
  const stepIndex = STATUS_TO_STEP[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-[480px] max-w-[95vw] bg-surface shadow-2xl flex flex-col overflow-hidden border-l border-border">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
          <div>
            <p className="font-mono text-[15px] font-bold text-foreground">{order.id}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusToBadgeVariant(order.status)} dot>{statusLabels[order.status]}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" aria-label="Close">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Order info */}
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            {[
              { label: 'Store', value: order.store },
              { label: 'Warehouse', value: order.warehouse },
              { label: 'Requested by', value: order.by },
              { label: 'Created', value: order.created },
            ].map(row => (
              <div key={row.label} className="rounded-lg border border-border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{row.label}</p>
                <p className="font-medium text-foreground mt-0.5">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Order Items</p>
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              <div className="grid grid-cols-12 px-3 py-2 bg-surface-raised text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="col-span-6">Product</span>
                <span className="col-span-3">SKU</span>
                <span className="col-span-3 text-right">Qty</span>
              </div>
              {order.items.map(item => (
                <div key={item.sku} className="grid grid-cols-12 px-3 py-3 text-[13px]">
                  <span className="col-span-6 font-medium text-foreground">{item.name}</span>
                  <span className="col-span-3 font-mono text-muted-foreground text-[11px]">{item.sku}</span>
                  <span className="col-span-3 text-right font-semibold text-foreground">{item.qty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status timeline */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Status Timeline</p>
            <ol className="space-y-3">
              {TIMELINE_STEPS.map((step, i) => {
                const done = !isCancelled && i < stepIndex;
                const current = !isCancelled && i === stepIndex;
                const pending = isCancelled || i > stepIndex;
                return (
                  <li key={step} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done ? 'bg-success text-success-foreground' : current ? 'bg-primary text-primary-foreground' : 'border-2 border-border text-muted-foreground'
                    }`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <div>
                      <p className={`text-[13px] font-medium ${done || current ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</p>
                      {done && <p className="text-[11px] text-muted-foreground">Completed</p>}
                      {current && <p className="text-[11px] text-primary font-medium">Current status</p>}
                      {pending && !isCancelled && <p className="text-[11px] text-muted-foreground">Pending</p>}
                    </div>
                  </li>
                );
              })}
              {isCancelled && (
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">✗</span>
                  <p className="text-[13px] font-medium text-destructive">Cancelled</p>
                </li>
              )}
            </ol>
          </div>
        </div>

        {/* Footer actions */}
        {order.status === 'draft' && onApprove && onReject && (
          <div className="border-t border-border px-6 py-4 flex gap-3">
            <Button className="flex-1" onClick={onApprove}>Approve Order</Button>
            <Button variant="destructive" className="flex-1" onClick={onReject}>Reject</Button>
          </div>
        )}
        {order.status !== 'draft' && (
          <div className="border-t border-border px-6 py-4">
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Approve Modal Content ──────────────────────── */
function ApproveModalContent({ order }: { order: Order }) {
  const hasInsufficient = order.items.some(i => i.qty > i.available);
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-[13px] text-muted-foreground">Stock availability check for <span className="font-mono font-semibold text-foreground">{order.id}</span>:</p>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-4 px-3 py-2 bg-surface-raised text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="col-span-2">Product</span><span className="text-center">Req</span><span className="text-center">Avail</span>
        </div>
        {order.items.map(item => {
          const ok = item.qty <= item.available;
          return (
            <div key={item.sku} className="grid grid-cols-4 px-3 py-3 border-t border-border text-[13px]">
              <span className="col-span-2 font-medium text-foreground">{item.name}</span>
              <span className="text-center tabular-nums">{item.qty}</span>
              <span className={`text-center tabular-nums font-semibold ${ok ? 'text-success' : 'text-destructive'}`}>
                {item.available} {ok ? '✓' : '✗'}
              </span>
            </div>
          );
        })}
      </div>
      {hasInsufficient && (
        <p className="text-[12px] font-semibold text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          Insufficient stock for {order.items.filter(i => i.qty > i.available).length} item(s). Cannot approve.
        </p>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────── */
export default function StoreOrdersPage() {
  const [tab, setTab] = useState<TabValue>('draft');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approveModal, setApproveModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [search, setSearch] = useState('');

  const [liveOrders, setLiveOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { setOrdersLoading(false); return; }
    setOrdersLoading(true);
    const statusParam = tab === 'all' ? undefined : tab;
    try {
      const r = await apiOrders(token, { status: statusParam, limit: 100 });
      setLiveOrders(r.data);
    } catch { /* keep mock data */ } finally { setOrdersLoading(false); }
  }, [tab]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Merge API data with mock data: prefer API if we have results
  const sourceOrders: Order[] = liveOrders.length > 0
    ? liveOrders.map(o => ({
        id: o.id,
        store: o.store,
        warehouse: o.warehouse,
        by: o.by,
        created: o.created,
        status: o.status,
        items: o.items.map(i => ({ name: i.name, sku: i.sku, qty: i.qty, available: i.available ?? 0 })),
      }))
    : allOrders;

  const filtered = sourceOrders.filter(o => {
    if (!(tab === 'all' ? true : o.status === tab)) return false;
    if (!search.trim()) return true;
    return o.id.toLowerCase().includes(search.trim().toLowerCase());
  });

  const liveDraftCount = sourceOrders.filter(o => o.status === 'draft').length;
  const liveConfirmedCount = sourceOrders.filter(o => o.status === 'confirmed').length;
  const livePackedCount = sourceOrders.filter(o => o.status === 'packed').length;
  const liveDispatchedCount = sourceOrders.filter(o => o.status === 'dispatched').length;
  const liveCompletedCount = sourceOrders.filter(o => ['completed', 'cancelled'].includes(o.status)).length;

  function summaryLabel(o: Order) {
    return `${o.items.reduce((s, i) => s + i.qty, 0)} units · ${o.items.length} item type${o.items.length > 1 ? 's' : ''}`;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Store Orders</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Store Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Review and approve store refill requests</p>
        </div>
        {liveDraftCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[12px] font-semibold text-warning">
            <span className="size-1.5 rounded-full bg-warning animate-pulse" />
            {liveDraftCount} awaiting approval
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'all', label: 'All', count: sourceOrders.length },
          { value: 'draft', label: 'Awaiting Approval', count: liveDraftCount },
          { value: 'confirmed', label: 'Confirmed', count: liveConfirmedCount },
          { value: 'packed', label: 'Packed', count: livePackedCount },
          { value: 'dispatched', label: 'Dispatched', count: liveDispatchedCount },
          { value: 'completed', label: 'Completed', count: liveCompletedCount },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="max-w-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID..."
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                {['Order ID', 'Store', 'WH', 'Items', 'Status', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No orders in this category</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className={`border-b border-border last:border-0 hover:bg-surface-raised transition-colors cursor-pointer ${o.status === 'draft' ? 'bg-primary-subtle/20' : ''}`}
                  onClick={() => setSelectedOrder(o)}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-foreground text-[12px]">{o.id}</p>
                    <p className="text-[11px] text-muted-foreground">{o.by}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.store}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[12px]">{o.warehouse}</td>
                  <td className="px-4 py-3">
                    <p className="text-muted-foreground truncate max-w-[180px]">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                    <p className="text-[11px] text-muted-foreground">{summaryLabel(o)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusToBadgeVariant(o.status)} dot>{statusLabels[o.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[12px] whitespace-nowrap">{o.created}</td>
                   <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                     <div className="flex items-center justify-end gap-1.5">
                       {o.status === 'draft' && isWarehouseManager && (
                         <>
                           <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => { setSelectedOrder(o); setApproveModal(true); }}>Approve</Button>
                           <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => { setSelectedOrder(o); setRejectModal(true); }}>Reject</Button>
                         </>
                       )}
                       {o.status !== 'draft' && (
                         <>
                           {isWarehouseManager && (o.status === 'confirmed' || o.status === 'packed') && (
                             <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => { setSelectedOrder(o); setCancelModal(true); }}>
                               Cancel
                             </Button>
                           )}
                           <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setSelectedOrder(o)}>View</Button>
                         </>
                       )}
                     </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
          {ordersLoading ? 'Loading…' : `Showing ${filtered.length} of ${sourceOrders.length} orders · Click any row to view details`}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedOrder && !approveModal && !rejectModal && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onApprove={isWarehouseManager ? () => setApproveModal(true) : undefined}
          onReject={isWarehouseManager ? () => setRejectModal(true) : undefined}
        />
      )}

      {/* Approve modal */}
      {selectedOrder && (
        <Dialog
          open={approveModal}
          onClose={() => setApproveModal(false)}
          title={`Approve ${selectedOrder.id}`}
          confirmLabel="Confirm Approval"
          confirmVariant="primary"
          onConfirm={async () => {
            const token = getToken();
            if (token && selectedOrder) {
              try { await apiApproveOrder(token, selectedOrder.id); } catch { /* ignore */ }
              loadOrders();
            }
            setApproveModal(false);
            setSelectedOrder(null);
          }}
        >
          <ApproveModalContent order={selectedOrder} />
        </Dialog>
      )}

      {/* Reject modal */}
      <Dialog
        open={rejectModal}
        onClose={() => { setRejectModal(false); setRejectReason(''); }}
        title={`Reject ${selectedOrder?.id ?? ''}`}
        description="The store manager will be notified with your reason."
        confirmLabel="Reject Order"
        confirmVariant="destructive"
        onConfirm={async () => {
          const token = getToken();
          if (token && selectedOrder) {
            try { await apiRejectOrder(token, selectedOrder.id, rejectReason); } catch { /* ignore */ }
            loadOrders();
          }
          setRejectModal(false);
          setRejectReason('');
          setSelectedOrder(null);
        }}
      >
        <div className="pt-2">
          <label className="block text-[12px] font-medium text-foreground mb-1.5">Rejection Reason <span className="text-destructive">*</span></label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            placeholder="e.g. Insufficient stock for requested items..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
        </div>
      </Dialog>

      <Dialog
        open={cancelModal}
        onClose={() => { setCancelModal(false); setCancelReason(''); }}
        title={`Cancel ${selectedOrder?.id ?? ''}`}
        description="Cancellation reason is required."
        confirmLabel="Cancel Order"
        confirmVariant="destructive"
        onConfirm={async () => {
          const token = getToken();
          if (token && selectedOrder) {
            try { await apiCancelOrder(token, selectedOrder.id, cancelReason); } catch { /* ignore */ }
            loadOrders();
          }
          setCancelModal(false);
          setCancelReason('');
          setSelectedOrder(null);
        }}
      >
        <div className="pt-2">
          <label className="block text-[12px] font-medium text-foreground mb-1.5">Cancellation Reason <span className="text-destructive">*</span></label>
          <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
            placeholder="e.g. Requested quantities no longer needed..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
        </div>
      </Dialog>
    </div>
  );
}
