'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { getToken } from '../../../lib/auth';
import { apiInventory, apiInventoryAdjust, apiLocations } from '../../../lib/api';
import type { InventoryRow, Location } from '../../../lib/api';

const reasonOptions = [
  { value: 'count', label: 'Physical count correction' },
  { value: 'damage', label: 'Damage / loss' },
  { value: 'return', label: 'Return' },
  { value: 'other', label: 'Other' },
];

type GroupedProduct = {
  product_id: string;
  sku: string;
  product_title: string;
  rows: InventoryRow[];
  totalAvailable: number;
  totalReserved: number;
  totalQuantity: number;
};

function stockVariant(available: number): 'success' | 'warning' | 'destructive' {
  if (available === 0) return 'destructive';
  if (available <= 5) return 'warning';
  return 'success';
}

function stockLabel(available: number) {
  if (available === 0) return 'Out of Stock';
  if (available <= 5) return 'Low Stock';
  return 'In Stock';
}

interface AdjustState {
  product_id: string;
  product_title: string;
  location_id: string;
  location_code: string;
  current: number;
}

export default function InventoryPage() {
  const [view, setView] = useState<'product' | 'location'>('product');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<AdjustState | null>(null);

  // Adjust modal state
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState('');
  const [adjLocationId, setAdjLocationId] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [invRes, locsRes] = await Promise.all([
        apiInventory(token, { limit: 500 }),
        apiLocations(token),
      ]);
      setRows(invRes.data);
      setLocations(locsRes.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by product
  const grouped: GroupedProduct[] = [];
  const seen = new Map<string, GroupedProduct>();
  for (const row of rows) {
    if (!seen.has(row.product_id)) {
      const g: GroupedProduct = { product_id: row.product_id, sku: row.sku, product_title: row.product_title, rows: [], totalAvailable: 0, totalReserved: 0, totalQuantity: 0 };
      seen.set(row.product_id, g);
      grouped.push(g);
    }
    const g = seen.get(row.product_id)!;
    g.rows.push(row);
    g.totalAvailable += row.available;
    g.totalReserved += row.reserved;
    g.totalQuantity += row.quantity;
  }

  const filteredGrouped = grouped.filter(p => {
    if (search && !p.product_title.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'in_stock' && stockVariant(p.totalAvailable) !== 'success') return false;
    if (statusFilter === 'low_stock' && stockVariant(p.totalAvailable) !== 'warning') return false;
    if (statusFilter === 'out_of_stock' && stockVariant(p.totalAvailable) !== 'destructive') return false;
    return true;
  });

  // Group by location for location view
  const byLocation = locations.map(loc => {
    const locRows = rows.filter(r => r.location_id === loc.id);
    return {
      ...loc,
      products: locRows.length,
      stock: locRows.reduce((s, r) => s + r.quantity, 0),
      reserved: locRows.reduce((s, r) => s + r.reserved, 0),
      lowStock: locRows.filter(r => r.available <= r.threshold && r.available > 0).length,
    };
  });

  function openAdjust(p: GroupedProduct) {
    const firstRow = p.rows[0];
    setAdjusting({
      product_id: p.product_id,
      product_title: p.product_title,
      location_id: firstRow.location_id,
      location_code: firstRow.location_code,
      current: firstRow.available,
    });
    setAdjLocationId(firstRow.location_id);
    setAdjQty('');
    setAdjReason('');
    setAdjNotes('');
    setAdjError('');
  }

  async function handleAdjustConfirm() {
    if (!adjusting) return;
    const qty = parseInt(adjQty);
    if (!adjQty || isNaN(qty) || qty < 0) { setAdjError('Enter a valid quantity.'); return; }
    if (!adjReason) { setAdjError('Select a reason.'); return; }
    if (!adjLocationId) { setAdjError('Select a location.'); return; }
    const token = getToken();
    if (!token) return;
    setAdjSaving(true); setAdjError('');
    try {
      await apiInventoryAdjust(token, {
        product_id: adjusting.product_id,
        location_id: adjLocationId,
        quantity: qty,
        note: adjReason === 'other' ? adjNotes : adjReason,
      });
      setAdjusting(null);
      load();
    } catch (e: any) {
      setAdjError(e.message ?? 'Adjustment failed.');
    } finally {
      setAdjSaving(false);
    }
  }

  const adjProductRows = adjusting ? (seen.get(adjusting.product_id)?.rows ?? []) : [];
  const adjLocationOptions = adjProductRows.map(r => ({ value: r.location_id, label: `${r.location_code} — ${r.location_name} (avail: ${r.available})` }));
  const adjCurrentRow = adjProductRows.find(r => r.location_id === adjLocationId);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Inventory</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Inventory</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Stock levels across all locations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:bg-surface-raised transition-colors">↻ Refresh</button>
          <Link href="/inventory/movements">
            <Button variant="outline" size="sm">View Movements</Button>
          </Link>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised p-1 w-fit">
        {(['product', 'location'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors ${view === v ? 'bg-surface text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}>
            {v === 'product' ? 'By Product' : 'By Location'}
          </button>
        ))}
      </div>

      {/* By Product view */}
      {view === 'product' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or SKU..."
                className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
              <option value="all">All statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-surface-raised">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">SKU</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Available</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reserved</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Locations</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Loading…
                      </div>
                    </td></tr>
                  )}
                  {!loading && filteredGrouped.map(p => (
                    <tr key={p.product_id} className="border-b border-border last:border-0 hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{p.product_title}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">{p.sku}</td>
                      <td className="px-3 py-3 text-center font-mono text-[12px]">
                        <span className={`font-bold ${stockVariant(p.totalAvailable) === 'destructive' ? 'text-destructive' : stockVariant(p.totalAvailable) === 'warning' ? 'text-warning' : 'text-success'}`}>
                          {p.totalAvailable}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-[12px] text-muted-foreground">{p.totalReserved}</td>
                      <td className="px-3 py-3 text-center font-mono text-[12px] text-muted-foreground">{p.totalQuantity}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-muted-foreground">{p.rows.length}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={stockVariant(p.totalAvailable)}>{stockLabel(p.totalAvailable)}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                          onClick={() => openAdjust(p)}>Adjust</Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredGrouped.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-[13px] text-muted-foreground">No products match the filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {!loading && (
              <div className="border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
                Showing {filteredGrouped.length} of {grouped.length} products
              </div>
            )}
          </div>
        </>
      )}

      {/* By Location view */}
      {view === 'location' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <p className="text-[13px] text-muted-foreground">Loading…</p>}
          {!loading && byLocation.map(loc => (
            <Card key={loc.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{loc.name}</CardTitle>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{loc.code}</p>
                  </div>
                  <Badge variant={loc.type === 'warehouse' ? 'primary' : 'default'}>{loc.type === 'warehouse' ? 'WH' : 'ST'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: 'Products', value: loc.products },
                    { label: 'Total Stock', value: loc.stock.toLocaleString() },
                    { label: 'Reserved', value: loc.reserved },
                    { label: 'Low Stock', value: loc.lowStock, warn: loc.lowStock > 0 },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg border border-border p-2.5">
                      <p className={`text-[18px] font-bold tabular-nums ${stat.warn ? 'text-warning' : 'text-foreground'}`}>{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="mt-3 w-full text-[12px]" onClick={() => setView('product')}>View Inventory</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stock adjustment modal */}
      {adjusting && (
        <Dialog
          open
          onClose={() => setAdjusting(null)}
          title={`Adjust Stock — ${adjusting.product_title}`}
          confirmLabel={adjSaving ? 'Saving…' : 'Save Adjustment'}
          confirmVariant="primary"
          onConfirm={handleAdjustConfirm}
        >
          <div className="flex flex-col gap-4 pt-2">
            <Select
              label="Location"
              options={adjLocationOptions}
              value={adjLocationId}
              onChange={e => {
                setAdjLocationId(e.target.value);
                setAdjQty('');
              }}
            />
            {adjCurrentRow && (
              <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
                <p className="text-[12px] text-muted-foreground">Current available at {adjCurrentRow.location_code}</p>
                <p className="text-[20px] font-bold text-foreground tabular-nums">{adjCurrentRow.available}</p>
              </div>
            )}
            <Input
              label="New Quantity (total available)"
              type="number"
              min="0"
              value={adjQty}
              onChange={e => setAdjQty(e.target.value)}
              placeholder="Enter new total quantity"
            />
            <Select label="Reason" options={reasonOptions} value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Select reason" />
            {adjReason === 'other' && (
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Notes</label>
                <textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} rows={3}
                  placeholder="Describe the reason..."
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
            )}
            {adjError && <p className="text-[12px] text-destructive">{adjError}</p>}
          </div>
        </Dialog>
      )}
    </div>
  );
}
