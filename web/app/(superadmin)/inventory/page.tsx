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
import { apiInventory, apiLocations } from '../../../lib/api';
import type { InventoryRow, Location } from '../../../lib/api';

const reasonOptions = [
  { value: 'count', label: 'Physical count correction' },
  { value: 'damage', label: 'Damage / loss' },
  { value: 'return', label: 'Return' },
  { value: 'other', label: 'Other' },
];

/* ─── Types ──────────────────────────────────────── */
type StockCell = { a: number; r: number; t: number };

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  brand: string;
  cells: Record<string, StockCell>;
  rawRow: InventoryRow;
}

interface LocationSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  products: number;
  stock: number;
  reserved: number;
  lowStock: number;
}

function CellValue({ cell }: { cell: StockCell }) {
  const color = cell.a === 0 ? 'text-destructive' : cell.a <= 3 ? 'text-warning' : 'text-success';
  if (cell.t === 0) return <span className="text-muted-foreground text-[12px]">—</span>;
  return (
    <span className="font-mono text-[12px]">
      <span className={`font-bold ${color}`}>{cell.a}</span>
      <span className="text-muted-foreground">/{cell.r}/{cell.t}</span>
    </span>
  );
}

function stockStatus(row: ProductRow, locationCodes: string[]) {
  const totalAvail = locationCodes.reduce((s, code) => s + (row.cells[code]?.a ?? 0), 0);
  if (totalAvail === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
  if (totalAvail <= 5) return { label: 'Low Stock', variant: 'warning' as const };
  return { label: 'In Stock', variant: 'success' as const };
}

/* ─── Adjust Stock Modal Content ─────────────────── */
function AdjustModalContent({ name, currentStock }: { name: string; currentStock: number }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
        <p className="text-[12px] text-muted-foreground">Current stock</p>
        <p className="text-[20px] font-bold text-foreground tabular-nums">{currentStock}</p>
        <p className="text-[12px] font-medium text-foreground">{name}</p>
      </div>
      <Input label="New Quantity" type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter new total quantity" />
      <Select label="Reason" options={reasonOptions} value={reason} onChange={e => setReason(e.target.value)} placeholder="Select reason" />
      {reason === 'other' && (
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Describe the reason..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────── */
export default function InventoryPage() {
  const [view, setView] = useState<'product' | 'location'>('product');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRow | null>(null);

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [invRes, locRes] = await Promise.allSettled([
        apiInventory(token, { limit: 500 }),
        apiLocations(token),
      ]);
      if (invRes.status === 'fulfilled') setInventory(invRes.value.data);
      if (locRes.status === 'fulfilled') setLocations(locRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build unique location codes from inventory rows (to use as columns)
  const locationCodes = Array.from(new Set(inventory.map(r => r.location_code))).sort();

  // Group inventory rows by product (sku)
  const productMap = new Map<string, ProductRow>();
  for (const row of inventory) {
    if (!productMap.has(row.sku)) {
      productMap.set(row.sku, {
        id: row.product_id,
        sku: row.sku,
        name: row.product_title,
        brand: '',
        cells: {},
        rawRow: row,
      });
    }
    const entry = productMap.get(row.sku)!;
    entry.cells[row.location_code] = { a: row.available, r: row.reserved, t: row.quantity };
  }
  const products = Array.from(productMap.values());

  // Build location summaries
  const locationSummaries: LocationSummary[] = locations.map(loc => {
    const rows = inventory.filter(r => r.location_id === loc.id);
    const lowStock = rows.filter(r => r.available > 0 && r.available <= r.threshold).length
      + rows.filter(r => r.available === 0).length;
    return {
      id: loc.id,
      code: loc.code,
      name: `${loc.name} (${loc.code})`,
      type: loc.type === 'warehouse' ? 'Warehouse' : 'Store',
      products: rows.length,
      stock: rows.reduce((s, r) => s + r.quantity, 0),
      reserved: rows.reduce((s, r) => s + r.reserved, 0),
      lowStock,
    };
  });

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    const s = stockStatus(p, locationCodes);
    if (statusFilter === 'in_stock' && s.variant !== 'success') return false;
    if (statusFilter === 'low_stock' && s.variant !== 'warning') return false;
    if (statusFilter === 'out_of_stock' && s.variant !== 'destructive') return false;
    return true;
  });

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
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Stock levels across all locations
            {loading && <span className="ml-1 animate-pulse text-[11px]">· Loading…</span>}
          </p>
        </div>
        <Link href="/inventory/movements">
          <Button variant="outline" size="sm">View Movements</Button>
        </Link>
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
                    {locationCodes.map(code => (
                      <th key={code} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{code}</th>
                    ))}
                    <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={locationCodes.length + 4} className="px-4 py-10 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</td></tr>
                  ) : filtered.map(p => {
                    const s = stockStatus(p, locationCodes);
                    return (
                      <tr key={p.sku} className="border-b border-border last:border-0 hover:bg-surface-raised transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{p.name}</p>
                          {p.brand && <p className="text-[11px] text-muted-foreground">{p.brand}</p>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">{p.sku}</td>
                        {locationCodes.map(code => (
                          <td key={code} className="px-3 py-3 text-center">
                            <CellValue cell={p.cells[code] ?? { a: 0, r: 0, t: 0 }} />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                            onClick={() => setAdjustingProduct(p)}>Adjust</Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={locationCodes.length + 4} className="px-4 py-10 text-center text-[13px] text-muted-foreground">No products match the filter</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
              <span className="text-[11px] font-mono">avail / reserved / total</span>
              <span className="mx-2">·</span>
              <span className="text-success font-semibold">green</span> = healthy · <span className="text-warning font-semibold">amber</span> = low · <span className="text-destructive font-semibold">red</span> = zero
            </div>
          </div>
        </>
      )}

      {/* By Location view */}
      {view === 'location' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locationSummaries.map(loc => (
              <Card key={loc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{loc.name}</CardTitle>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{loc.type}</p>
                    </div>
                    <Badge variant={loc.type === 'Warehouse' ? 'primary' : 'default'}>{loc.type === 'Warehouse' ? 'WH' : 'ST'}</Badge>
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
        )
      )}

      {/* Stock adjustment modal */}
      {adjustingProduct && (
        <Dialog
          open
          onClose={() => setAdjustingProduct(null)}
          title={`Adjust Stock — ${adjustingProduct.name}`}
          confirmLabel="Save Adjustment"
          confirmVariant="primary"
          onConfirm={() => setAdjustingProduct(null)}
        >
          <AdjustModalContent
            name={adjustingProduct.name}
            currentStock={adjustingProduct.rawRow.quantity}
          />
        </Dialog>
      )}
    </div>
  );
}
