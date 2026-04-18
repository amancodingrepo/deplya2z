'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '../../../../../components/ui/card';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { Tabs } from '../../../../../components/ui/tabs';
import { Dialog } from '../../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../../../../components/ui/table';
import { getToken } from '../../../../../lib/auth';
import { apiOrders, apiBulkOrders, apiPackOrder, apiPackBulkOrder } from '../../../../../lib/api';
import type { StoreOrder, BulkOrder } from '../../../../../lib/api';

/* ─── Fallback mock data ─────────────────────────── */
const MOCK_STORE: StoreOrder[] = [
  { id: 'ORD-ST01-0001', store: 'Store 01', store_id: '', warehouse: 'WH01', warehouse_id: '', by: 'Alex Johnson', created: 'Apr 12, 10:30 AM', status: 'confirmed', items: [{ id: '1', product_id: '1', sku: 'SKU-TV-001', name: 'Samsung TV', qty: 5 }, { id: '2', product_id: '2', sku: 'SKU-MON-001', name: 'LG Monitor', qty: 3 }] },
  { id: 'ORD-ST02-0002', store: 'Store 02', store_id: '', warehouse: 'WH01', warehouse_id: '', by: 'Alex Johnson', created: 'Apr 12, 9:15 AM', status: 'confirmed', items: [{ id: '3', product_id: '3', sku: 'SKU-FRG-003', name: 'LG Fridge', qty: 2 }] },
  { id: 'ORD-ST03-0006', store: 'Store 03', store_id: '', warehouse: 'WH01', warehouse_id: '', by: 'Alex Johnson', created: 'Apr 11, 11:00 AM', status: 'confirmed', items: [{ id: '4', product_id: '4', sku: 'SKU-AUD-004', name: 'Sony Headphones', qty: 10 }] },
];
const MOCK_BULK: BulkOrder[] = [
  { id: 'BULK-0001', client_id: '', client_name: 'Metro Retail Chain', warehouse_id: '', warehouse: 'WH01', status: 'confirmed', items: [{ id: 'b1', product_id: '1', sku: 'SKU-TV-001', name: '50× Samsung TV', qty: 50 }], created_at: 'Apr 12, 9:00 AM', updated_at: '' },
  { id: 'BULK-0002', client_id: '', client_name: 'TechMart India', warehouse_id: '', warehouse: 'WH01', status: 'confirmed', items: [{ id: 'b2', product_id: '5', sku: 'SKU-PHN-012', name: '200× iPhone 15', qty: 200 }], created_at: 'Apr 11, 3:00 PM', updated_at: '' },
];

type TabValue = 'store' | 'bulk';
type ModalState = { orderId: string; type: 'store' | 'bulk' } | null;

export default function PendingOrdersPage() {
  const [tab, setTab] = useState<TabValue>('store');
  const [modal, setModal] = useState<ModalState>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>(MOCK_STORE);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>(MOCK_BULK);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [store, bulk] = await Promise.allSettled([
        apiOrders(token, { status: 'confirmed', limit: 100 }),
        apiBulkOrders(token, { status: 'confirmed', limit: 50 }),
      ]);
      if (store.status === 'fulfilled') setStoreOrders(store.value.data.length > 0 ? store.value.data : MOCK_STORE);
      if (bulk.status === 'fulfilled') setBulkOrders(bulk.value.data.length > 0 ? bulk.value.data : MOCK_BULK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders, refreshKey]);

  async function confirmPacked() {
    if (!modal) return;
    const token = getToken();
    if (!token) return;
    try {
      if (modal.type === 'store') await apiPackOrder(token, modal.orderId);
      else await apiPackBulkOrder(token, modal.orderId);
    } catch { /* ignore */ }
    setRefreshKey(k => k + 1);
    setModal(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/wh/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Pending Orders</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Pending Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Confirmed orders ready to pack
            {loading && <span className="ml-1 text-[11px] animate-pulse">· Loading…</span>}
          </p>
        </div>
        <Badge variant="warning" dot>{storeOrders.length} to pack</Badge>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'store', label: 'Store Orders', count: storeOrders.length },
          { value: 'bulk', label: 'Bulk Orders', count: bulkOrders.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'store' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-muted-foreground">No orders to pack</td></tr>
              ) : storeOrders.map((o) => {
                const totalQty = o.items.reduce((s, i) => s + i.qty, 0);
                const itemsSummary = o.items.map(i => `${i.qty}× ${i.name}`).join(', ');
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-[12px] font-medium">
                      <div className="flex items-center gap-2">
                        {o.id}
                      </div>
                    </TableCell>
                    <TableCell>{o.store}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[220px] truncate">{itemsSummary}</TableCell>
                    <TableCell className="text-right tabular-nums">{totalQty}</TableCell>
                    <TableCell className="text-muted-foreground text-[12px]">{o.by || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-[12px] whitespace-nowrap">{o.created}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setModal({ orderId: o.id, type: 'store' })}>
                        Mark Packed
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'bulk' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulkOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-muted-foreground">No bulk orders to pack</td></tr>
              ) : bulkOrders.map((o) => {
                const totalQty = o.items.reduce((s, i) => s + i.qty, 0);
                const itemsSummary = o.items.map(i => `${i.qty}× ${i.name}`).join(', ');
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-[12px] font-medium">{o.id}</TableCell>
                    <TableCell>{o.client_name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{itemsSummary}</TableCell>
                    <TableCell className="text-right tabular-nums">{totalQty}</TableCell>
                    <TableCell className="text-muted-foreground text-[12px]">{o.created_at}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setModal({ orderId: o.id, type: 'bulk' })}>
                        Mark Packed
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal */}
      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        title="Mark Order as Packed"
        description={`Confirm that all items in ${modal?.orderId} have been packed and are ready for dispatch.`}
        confirmLabel="Mark Packed"
        confirmVariant="primary"
        onConfirm={confirmPacked}
      />
    </div>
  );
}
