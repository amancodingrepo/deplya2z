'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { getToken } from '../../../../lib/auth';
import { apiOrders, apiDispatchOrder } from '../../../../lib/api';
import type { StoreOrder } from '../../../../lib/api';

/* ─── Fallback mock ──────────────────────────────── */
const MOCK: StoreOrder[] = [
  { id: 'ORD-ST01-0005', store: 'Store 01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 12, 11:00 AM', status: 'packed', items: [{ id: '1', product_id: '1', sku: 'SKU-TV-001', name: 'Samsung TV', qty: 2 }] },
  { id: 'ORD-ST02-0006', store: 'Store 02', store_id: '', warehouse: 'WH01', warehouse_id: '', by: '', created: 'Apr 12, 10:45 AM', status: 'packed', items: [{ id: '2', product_id: '5', sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', qty: 8 }] },
];

type ModalState = { orderId: string; dest: string } | null;

export default function DispatchQueuePage() {
  const [modal, setModal] = useState<ModalState>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [orders, setOrders] = useState<StoreOrder[]>(MOCK);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await apiOrders(token, { status: 'packed', limit: 100 });
      setOrders(r.data.length > 0 ? r.data : MOCK);
    } catch { /* keep mock */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders, refreshKey]);

  async function handleDispatch() {
    if (!modal) return;
    const token = getToken();
    if (!token) return;
    try { await apiDispatchOrder(token, modal.orderId); } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
    setModal(null);
    setDispatchNotes('');
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/wh/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Dispatch Queue</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Dispatch Queue</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Packed orders ready for shipment
            {loading && <span className="ml-1 text-[11px] animate-pulse">· Loading…</span>}
          </p>
        </div>
        <Badge variant="success" dot>{orders.length} ready to dispatch</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Packed At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={5}>No orders in dispatch queue.</TableEmpty>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-[12px] font-medium">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.store}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => setModal({ orderId: o.id, dest: o.store })}>
                        Dispatch
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={modal !== null}
        onClose={() => { setModal(null); setDispatchNotes(''); }}
        title="Confirm Dispatch"
        description={`Dispatch ${modal?.orderId} to ${modal?.dest}? The store manager will be notified.`}
        confirmLabel="Dispatch"
        confirmVariant="primary"
        onConfirm={handleDispatch}
      >
        <div className="pt-2">
          <label className="block text-[12px] font-medium text-foreground mb-1.5">Dispatch Notes (optional)</label>
          <textarea
            value={dispatchNotes}
            onChange={e => setDispatchNotes(e.target.value)}
            placeholder="e.g. Driver: Ravi Kumar, Vehicle: MH-01-AB-1234"
            rows={2}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>
      </Dialog>
    </div>
  );
}
