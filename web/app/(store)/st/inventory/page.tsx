'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { SearchIcon } from '../../../../components/layout/icons';
import { getToken, getUser } from '../../../../lib/auth';
import { apiInventory } from '../../../../lib/api';
import type { InventoryRow } from '../../../../lib/api';

const MOCK: InventoryRow[] = [
  { id: '1', product_id: '1', location_id: '', location_code: 'ST01', location_name: 'Store 01', sku: 'SKU-TV-001', product_title: 'Samsung 55" TV', quantity: 4, reserved: 1, available: 3, threshold: 2, updated_at: '' },
  { id: '2', product_id: '2', location_id: '', location_code: 'ST01', location_name: 'Store 01', sku: 'SKU-MON-001', product_title: 'LG Monitor 23"', quantity: 1, reserved: 0, available: 1, threshold: 2, updated_at: '' },
  { id: '3', product_id: '5', location_id: '', location_code: 'ST01', location_name: 'Store 01', sku: 'SKU-PHN-012', product_title: 'iPhone 15 Pro', quantity: 5, reserved: 0, available: 5, threshold: 3, updated_at: '' },
  { id: '4', product_id: '6', location_id: '', location_code: 'ST01', location_name: 'Store 01', sku: 'SKU-AUD-004', product_title: 'Sony WH-1000XM5', quantity: 0, reserved: 0, available: 0, threshold: 2, updated_at: '' },
  { id: '5', product_id: '4', location_id: '', location_code: 'ST01', location_name: 'Store 01', sku: 'SKU-LAP-007', product_title: 'Dell XPS 15', quantity: 3, reserved: 1, available: 2, threshold: 2, updated_at: '' },
];

function stockBadge(available: number, threshold: number) {
  if (available === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
  if (available <= threshold) return { label: 'Low Stock', variant: 'warning' as const };
  return { label: 'In Stock', variant: 'success' as const };
}

export default function StoreInventoryPage() {
  const user = getUser();
  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState<InventoryRow[]>(MOCK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    apiInventory(token, { location_id: user?.location_id ?? undefined, limit: 200 })
      .then(r => { if (!cancelled && r.data.length > 0) setInventory(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.location_id]);

  const displayed = inventory.filter(item =>
    !search || item.product_title.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description={`Stock levels at ${user?.location_name ?? user?.location_code ?? 'your store'}${loading ? ' · Loading…' : ''}`}
        breadcrumb={[{ label: 'Dashboard', href: '/st/dashboard' }, { label: 'Inventory' }]}
        actions={
          <div className="flex gap-2">
            <Link href="/st/reports">
              <Button variant="outline" size="sm">Reports</Button>
            </Link>
            <Link href="/st/orders/create">
              <Button size="sm">Request More</Button>
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input
            type="search"
            placeholder="Search product or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableEmpty colSpan={7}>No inventory found.</TableEmpty>
            ) : (
              displayed.map((item) => {
                const { label, variant } = stockBadge(item.available, item.threshold);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.product_title}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{item.available}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.reserved}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.quantity}</TableCell>
                    <TableCell><Badge variant={variant} dot>{label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href="/st/orders/create">
                          <Button size="sm" variant="outline">Request More</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
