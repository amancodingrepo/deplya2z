'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Card } from '../../../../../components/ui/card';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../../components/ui/table';
import { getToken } from '../../../../../lib/auth';
import { apiBulkOrders, apiPackBulkOrder } from '../../../../../lib/api';
import type { BulkOrder } from '../../../../../lib/api';

export default function BulkOrdersWarehousePage() {
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [packingId, setPackingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await apiBulkOrders(token, { status: 'confirmed', limit: 100 });
      setOrders(r.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handlePack(orderId: string) {
    const token = getToken();
    if (!token) return;
    setPackingId(orderId);
    try {
      await apiPackBulkOrder(token, orderId);
      await loadOrders();
    } finally {
      setPackingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk Orders"
        description="Third-party bulk orders confirmed for packing"
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Orders' }, { label: 'Bulk' }]}
      />

      <div className="flex items-center gap-2">
        <Badge variant="primary" dot>{orders.length} bulk orders to pack</Badge>
        {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={6}>No bulk orders pending.</TableEmpty>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.client_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.created_at}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" disabled={packingId === o.id} onClick={() => handlePack(o.id)}>
                      {packingId === o.id ? 'Packing...' : 'Mark Packed'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
