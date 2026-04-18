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

/* ─── Fallback mock data ─────────────────────────── */
const MOCK_ORDERS: StoreOrder[] = [
  { id: 'ORD-ST01-0001', store: 'ST01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 12, 10:30 AM', status: 'dispatched', items: [] },
  { id: 'ORD-ST01-0008', store: 'ST01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 12, 8:00 AM', status: 'confirmed', items: [] },
  { id: 'ORD-ST01-0009', store: 'ST01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 11, 5:00 PM', status: 'packed', items: [] },
  { id: 'ORD-ST01-0010', store: 'ST01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 11, 3:00 PM', status: 'draft', items: [] },
  { id: 'ORD-ST01-0005', store: 'ST01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 10, 2:00 PM', status: 'completed', items: [] },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Being Packed',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

type TabValue = 'active' | 'all' | 'completed';
type ModalState = { type: 'receive' | 'cancel'; order: StoreOrder } | null;

const activeStatuses = ['draft', 'confirmed', 'packed', 'dispatched', 'store_received'];

export default function MyOrdersPage() {
  const user = getUser();
  const [tab, setTab] = useState<TabValue>('active');
  const [modal, setModal] = useState<ModalState>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<StoreOrder[]>(MOCK_ORDERS);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await apiOrders(token, { limit: 100 });
      if (r.data.length > 0) setOrders(r.data);
    } catch { /* keep mock data */ } finally { setLoading(false); }
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
    try { await apiCancelOrder(token, order.id); } catch { /* ignore */ }
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
      <Dialog
        open={modal?.type === 'cancel'}
        onClose={() => setModal(null)}
        title="Cancel Order"
        description={`Cancel ${modal?.order.id}? This cannot be undone.`}
        confirmLabel="Cancel Order"
        confirmVariant="destructive"
        onConfirm={() => { if (modal?.type === 'cancel') handleCancel(modal.order); }}
      />
    </div>
  );
}
