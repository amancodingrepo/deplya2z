'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { getToken } from '../../../lib/auth';
import { apiTransfers, apiCreateTransfer, apiLocations, apiProducts } from '../../../lib/api';
import type { Transfer, Location, Product } from '../../../lib/api';

const statusBadge: Record<string, 'default' | 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  in_transit: 'default',
  completed: 'success',
  rejected: 'destructive',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  in_transit: 'In Transit',
  completed: 'Completed',
  rejected: 'Rejected',
};

function fmtDate(ts: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
  } catch { return ts; }
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProductList] = useState<Product[]>([]);

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async (pg: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiTransfers(token, { page: pg, limit: 20 });
      setTransfers(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
      setPage(pg);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
    const token = getToken();
    if (!token) return;
    apiLocations(token).then(r => setLocations(r.data)).catch(() => {});
    apiProducts(token, { limit: 100 }).then(r => setProductList(r.data)).catch(() => {});
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!fromLocation || !toLocation || !productId || !quantity) {
      setCreateError('All fields except note are required.');
      return;
    }
    if (fromLocation === toLocation) {
      setCreateError('From and To locations must be different.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) { setCreateError('Quantity must be a positive number.'); return; }
    const token = getToken();
    if (!token) return;
    setCreating(true);
    setCreateError('');
    try {
      await apiCreateTransfer(token, {
        from_location_id: fromLocation,
        to_location_id: toLocation,
        product_id: productId,
        quantity: qty,
        note: note || undefined,
      });
      setShowCreate(false);
      setFromLocation(''); setToLocation(''); setProductId(''); setQuantity(''); setNote('');
      load(1);
    } catch (err: any) {
      setCreateError(err.message ?? 'Transfer creation failed.');
    } finally {
      setCreating(false);
    }
  }

  const locationOptions = locations.map(l => ({ value: l.id, label: `${l.name} (${l.code})` }));
  const productOptions = products.map(p => ({ value: p.id, label: `${p.title} — ${p.sku}` }));

  const pending = transfers.filter(t => t.status === 'pending').length;
  const completed = transfers.filter(t => t.status === 'completed').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Transfers</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Stock Transfers</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Move inventory between warehouses and stores</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          + New Transfer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-foreground' },
          { label: 'Pending', value: pending, color: 'text-warning' },
          { label: 'Completed', value: completed, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4 text-center shadow-xs">
            <p className={`text-[28px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Transfer Sheet */}
      {showCreate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>New Transfer</CardTitle>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground text-[18px] leading-none">×</button>
            </div>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="From Location"
                  options={locationOptions}
                  placeholder="Select source"
                  value={fromLocation}
                  onChange={e => setFromLocation(e.target.value)}
                  required
                />
                <Select
                  label="To Location"
                  options={locationOptions}
                  placeholder="Select destination"
                  value={toLocation}
                  onChange={e => setToLocation(e.target.value)}
                  required
                />
              </div>
              <Select
                label="Product"
                options={productOptions}
                placeholder="Select product"
                value={productId}
                onChange={e => setProductId(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Units to transfer"
                  required
                />
                <Input
                  label="Note (optional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason or note"
                />
              </div>
              {createError && <p className="text-[12px] text-destructive">{createError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Transfer'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                {['Product', 'From', 'To', 'Qty', 'Status', 'Date'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading…
                  </div>
                </td></tr>
              )}
              {!loading && transfers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No transfers found. Create one above.</td></tr>
              )}
              {!loading && transfers.map(t => (
                <tr key={t.id} className="border-b border-border hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-[13px]">{t.product_title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{t.sku}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{t.from_location_code}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{t.to_location_code}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold tabular-nums">{t.quantity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadge[t.status] ?? 'default'} dot>
                      {statusLabel[t.status] ?? t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          <span>{total} transfer{total !== 1 ? 's' : ''} total</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1 || loading} onClick={() => load(page - 1)}
              className="rounded-md border border-border px-3 py-1 text-[12px] hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => load(page + 1)}
              className="rounded-md border border-border px-3 py-1 text-[12px] hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
