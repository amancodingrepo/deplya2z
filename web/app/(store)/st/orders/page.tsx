'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Tabs } from '../../../../components/ui/tabs';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { PlusIcon } from '../../../../components/layout/icons';
import { getToken, getUser } from '../../../../lib/auth';
import { apiOrders, apiConfirmReceive, apiCancelOrder } from '../../../../lib/api';
import type { StoreOrder } from '../../../../lib/api';

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Being Packed',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

type TabValue = 'active' | 'all' | 'completed';
type ModalState = { type: 'receive' | 'cancel' | 'details'; order: StoreOrder; cancelReason?: string } | null;

const activeStatuses = ['draft', 'confirmed', 'packed', 'dispatched', 'store_received'];

export default function MyOrdersPage() {
  const user = getUser();
  const [tab, setTab] = useState<TabValue>('active');
  const [modal, setModal] = useState<ModalState>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await apiOrders(token, { limit: 100 });
      setOrders(r.data);
    } catch { /* keep existing data */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders, refreshKey]);

  async function handleReceive(order: StoreOrder) {
    const token = getToken();
    if (!token) return;
    try { await apiConfirmReceive(token, order.id); } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
    setModal(null);
  }

   async function handleCancel(order: StoreOrder) {
    const token = getToken();
    if (!token) return;
    const reason = modal?.cancelReason?.trim();
    if (!reason) return;
    try { await apiCancelOrder(token, order.id, reason); } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
    setModal(null);
  }

  const activeCount = orders.filter(o => activeStatuses.includes(o.status)).length;
  const completedCount = orders.filter(o => ['completed', 'cancelled'].includes(o.status)).length;
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length;

  const filtered = orders.filter((o) => {
    if (tab === 'active') return activeStatuses.includes(o.status);
    if (tab === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  function summaryText(o: StoreOrder) {
    if (o.items.length === 0) return '—';
    return o.items.map(i => `${i.qty}× ${i.name}`).join(', ');
  }

  function orderStatusLabel(status: StoreOrder['status']) {
    return statusLabels[status] ?? status;
  }

  function statusStepIndex(status: StoreOrder['status']) {
    switch (status) {
      case 'draft':
        return 0;
      case 'confirmed':
        return 1;
      case 'packed':
        return 2;
      case 'dispatched':
        return 3;
      case 'store_received':
        return 4;
      case 'completed':
        return 5;
      case 'cancelled':
        return -1;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/st/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">My Orders</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">My Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            All order requests from {user?.location_name ?? user?.location_code ?? 'your store'}
            {loading && <span className="ml-1 text-[11px] animate-pulse">· Loading…</span>}
          </p>
        </div>
        <Link href="/st/orders/create">
          <Button size="sm"><PlusIcon /> New Request</Button>
        </Link>
      </div>

      {/* Incoming banner */}
      {dispatchedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="primary" dot>{dispatchedCount} order{dispatchedCount > 1 ? 's' : ''} on the way</Badge>
            <span className="text-[13px] text-foreground">Confirm receipt when items arrive</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'active', label: 'Active', count: activeCount },
          { value: 'completed', label: 'Completed', count: completedCount },
          { value: 'all', label: 'All Orders', count: orders.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={5}>
                  No orders yet.{' '}
                  <Link href="/st/orders/create" className="text-primary hover:underline">
                    Create your first request
                  </Link>
                </TableEmpty>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-[12px] font-medium text-foreground">{o.id}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[240px] truncate">{summaryText(o)}</TableCell>
                    <TableCell>
                      <Badge variant={statusToBadgeVariant(o.status)} dot>{statusLabels[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{o.created}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {o.status === 'dispatched' && (
                          <Button size="sm" onClick={() => setModal({ type: 'receive', order: o })}>
                            Confirm Receipt
                          </Button>
                        )}
                        {o.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => setModal({ type: 'cancel', order: o })}>
                            Cancel
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">Details</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="text-[12px] text-muted-foreground">
        Showing {filtered.length} of {orders.length} orders
      </div>

      {/* Receive Modal */}
      <Dialog
        open={modal?.type === 'receive'}
        onClose={() => setModal(null)}
        title="Confirm Receipt"
        description={`Confirm that all items in ${modal?.order.id} have been received and are in good condition.`}
        confirmLabel="Confirm Receipt"
        confirmVariant="primary"
        onConfirm={() => { if (modal?.type === 'receive') handleReceive(modal.order); }}
      />

      {/* Cancel Modal */}
      {modal?.type === 'cancel' && (
        <Dialog
          open
          onClose={() => setModal(null)}
          title={`Cancel ${modal.order.id}`}
          description="Cancellation reason is required."
          confirmLabel="Cancel Order"
          confirmVariant="destructive"
          onConfirm={() => { if (modal?.type === 'cancel') handleCancel(modal.order); }}
        >
          <div className="pt-2">
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Cancellation Reason <span className="text-destructive">*</span></label>
            <textarea
              value={modal.cancelReason ?? ''}
              onChange={e => setModal(prev => prev ? { ...prev, cancelReason: e.target.value } : null)}
              rows={3}
              placeholder="e.g. Requested quantities no longer needed..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </Dialog>
      )}

      {/* Details Modal */}
      {modal?.type === 'details' && (
        <Dialog
          open
          onClose={() => setModal(null)}
          title={`Order Details — ${modal.order.id}`}
          description="Review the current order state, items, and next action."
          size="lg"
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              {[
                { label: 'Store', value: modal.order.store },
                { label: 'Warehouse', value: modal.order.warehouse },
                { label: 'Created', value: modal.order.created },
                { label: 'Status', value: orderStatusLabel(modal.order.status) },
              ].map((row) => (
                <div key={row.label} className="rounded-lg border border-border bg-surface-raised px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">{row.label}</p>
                  <p className="mt-0.5 font-medium text-foreground">{row.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-surface-raised">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">SKU</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modal.order.items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-[13px] text-muted-foreground">No line items found.</td>
                      </tr>
                    ) : (
                      modal.order.items.map((item) => (
                        <tr key={item.sku} className="border-t border-border">
                          <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{item.sku}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{item.qty}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Fulfillment</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {['Created', 'Approved', 'Packed', 'Dispatched', 'Received', 'Completed'].map((step, index) => {
                  const current = statusStepIndex(modal.order.status);
                  const done = current >= 0 && index < current;
                  const active = current === index;
                  const cancelled = modal.order.status === 'cancelled';

                  return (
                    <div
                      key={step}
                      className={[
                        'rounded-lg border px-3 py-2 text-[12px]',
                        cancelled
                          ? 'border-destructive/20 bg-destructive/5 text-destructive'
                          : active
                            ? 'border-primary/30 bg-primary-subtle/20 text-foreground'
                            : done
                              ? 'border-success/20 bg-success-subtle/20 text-foreground'
                              : 'border-border bg-surface-raised text-muted-foreground',
                      ].join(' ')}
                    >
                      <p className="font-medium">{step}</p>
                      <p className="mt-0.5 text-[11px]">
                        {cancelled ? 'Cancelled' : active ? 'Current step' : done ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[12px] text-muted-foreground">
                {modal.order.status === 'dispatched' && 'Receive the order once the physical items arrive.'}
                {modal.order.status === 'draft' && 'Draft orders can still be cancelled before approval.'}
                {!['draft', 'dispatched'].includes(modal.order.status) && 'No action required for this status.'}
              </p>
              <div className="flex gap-2">
                {modal.order.status === 'dispatched' && (
                  <Button size="sm" onClick={() => handleReceive(modal.order)}>
                    Confirm Receipt
                  </Button>
                )}
                {modal.order.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => handleCancel(modal.order)}>
                    Cancel Order
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setModal(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
