'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { getToken } from '../../../../lib/auth';
import { apiInventoryMovements } from '../../../../lib/api';
import type { StockMovement } from '../../../../lib/api';

export default function MovementsPage() {
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const r = await apiInventoryMovements(token, {
        product_id: productId || undefined,
        location_id: locationId || undefined,
        limit: 300,
      });
      setRows(r.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [productId, locationId]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = rows.filter((m) => {
    if (typeFilter && m.type !== typeFilter) return false;
    if (dateFrom && new Date(m.created_at) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && new Date(m.created_at) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stock Movements"
        description="Immutable log of inventory changes across all locations"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory', href: '/inventory' }, { label: 'Movements' }]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="Filter by product ID..." className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="Filter by location ID/code..." className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
          <option value="">All movement types</option>
          {Array.from(new Set(rows.map(r => r.type))).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <button onClick={load} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">Refresh</button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableEmpty colSpan={8}>{loading ? 'Loading...' : 'No movement entries found.'}</TableEmpty>
            ) : (
              filteredRows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.product_title}</TableCell>
                  <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                  <TableCell>{m.location_code}</TableCell>
                  <TableCell><Badge>{m.type}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{m.quantity}</TableCell>
                  <TableCell>{m.actor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.created_at}</TableCell>
                  <TableCell className="text-xs text-primary">
                    <Link href={m.type.includes('order') ? '/orders/store-orders' : '/orders/bulk-orders'}>open</Link>
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
