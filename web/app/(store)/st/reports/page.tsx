'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { getToken, getUser } from '../../../../lib/auth';
import { apiInventory, apiInventoryMovements, apiOrders } from '../../../../lib/api';
import type { InventoryRow, StockMovement, StoreOrder } from '../../../../lib/api';

const movementLabel: Record<StockMovement['type'], string> = {
  adjustment: 'Adjustment',
  add: 'Added',
  order_reserve: 'Reserved',
  order_release: 'Released',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
};

export default function StoreReportsPage() {
  const user = getUser();
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      apiInventory(token, { location_id: user?.location_id ?? undefined, limit: 100 }),
      apiOrders(token, { store_id: user?.location_id ?? undefined, limit: 50 }),
      apiInventoryMovements(token, { location_id: user?.location_id ?? undefined, limit: 50 }),
    ]).then(([inv, ord, mov]) => {
      if (cancelled) return;
      if (inv.status === 'fulfilled') setInventory(inv.value.data);
      if (ord.status === 'fulfilled') setOrders(ord.value.data);
      if (mov.status === 'fulfilled') setMovements(mov.value.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.location_id]);

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.available > 0 && item.available <= item.threshold).length,
    [inventory],
  );
  const outOfStockCount = useMemo(
    () => inventory.filter((item) => item.available === 0).length,
    [inventory],
  );
  const activeOrderCount = useMemo(
    () => orders.filter((order) => ['draft', 'confirmed', 'packed', 'dispatched'].includes(order.status)).length,
    [orders],
  );
  const completedOrderCount = useMemo(
    () => orders.filter((order) => ['store_received', 'completed', 'cancelled'].includes(order.status)).length,
    [orders],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description={`Store-only reporting for ${user?.location_name ?? user?.location_code ?? 'your store'}`}
        breadcrumb={[{ label: 'Dashboard', href: '/st/dashboard' }, { label: 'Reports' }]}
        actions={
          <div className="flex gap-2">
            <Link href="/st/inventory">
              <Button variant="outline" size="sm">Inventory</Button>
            </Link>
            <Link href="/st/orders/create">
              <Button size="sm">New Request</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Inventory Rows', value: inventory.length },
          { label: 'Active Orders', value: activeOrderCount },
          { label: 'Low Stock', value: lowStockCount },
          { label: 'Out of Stock', value: outOfStockCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-[12px] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{loading ? '…' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Inventory Snapshot</h2>
                <p className="text-[12px] text-muted-foreground">Available, reserved, and total stock at this store</p>
              </div>
              <Link href="/st/inventory" className="text-[12px] font-medium text-primary hover:underline">
                View inventory
              </Link>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Avail</TableHead>
                <TableHead className="text-right">Resv</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableEmpty colSpan={5}>No inventory available.</TableEmpty>
              ) : (
                inventory.slice(0, 8).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.product_title}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.available}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.reserved}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Order History</h2>
                <p className="text-[12px] text-muted-foreground">Recent store requests and their current state</p>
              </div>
              <Link href="/st/orders" className="text-[12px] font-medium text-primary hover:underline">
                View orders
              </Link>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableEmpty colSpan={4}>No orders found.</TableEmpty>
              ) : (
                orders.slice(0, 8).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
                    <TableCell>
                      <Badge variant={statusToBadgeVariant(order.status)} dot>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {order.items.length > 0 ? order.items.map((item) => `${item.qty}× ${item.name}`).join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">{order.created}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card>
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Stock Movements</h2>
              <p className="text-[12px] text-muted-foreground">Audit trail for reserved, issued, and transfer activity</p>
            </div>
            <span className="text-[12px] text-muted-foreground">{completedOrderCount} closed orders</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableEmpty colSpan={5}>No movements recorded.</TableEmpty>
            ) : (
              movements.slice(0, 10).map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{movement.created_at}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{movement.product_title}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{movement.sku}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{movementLabel[movement.type] ?? movement.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{movement.quantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{movement.actor}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
