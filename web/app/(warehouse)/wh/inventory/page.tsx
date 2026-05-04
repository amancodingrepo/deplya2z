'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { SearchIcon } from '../../../../components/layout/icons';
import { getToken, getUser } from '../../../../lib/auth';
import { apiInventory, apiInventoryAdjust } from '../../../../lib/api';
import type { InventoryRow } from '../../../../lib/api';

function stockBadge(available: number, threshold: number) {
  if (available === 0) return { label: 'Out', variant: 'destructive' as const };
  if (available <= threshold) return { label: 'Low', variant: 'warning' as const };
  return { label: 'OK', variant: 'success' as const };
}

type AdjustModal = { item: InventoryRow } | null;

export default function WarehouseInventoryPage() {
  const user = getUser();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [adjustModal, setAdjustModal] = useState<AdjustModal>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadInventory = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await apiInventory(token, {
        location_id: user?.location_id ?? undefined,
        search: search || undefined,
        low_stock: stockFilter === 'low' || undefined,
        limit: 200,
      });
      setInventory(r.data);
    } catch { /* keep current data */ } finally { setLoading(false); }
  }, [search, stockFilter, user?.location_id]);

  useEffect(() => { loadInventory(); }, [loadInventory, refreshKey]);

  async function submitAdjust() {
    if (!adjustModal) return;
    const token = getToken();
    if (!token) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty)) return;
    setAdjusting(true);
    try {
      await apiInventoryAdjust(token, {
        product_id: adjustModal.item.product_id,
        location_id: adjustModal.item.location_id || user?.location_id || '',
        quantity: qty,
        note: adjustNote || undefined,
      });
      setRefreshKey(k => k + 1);
    } catch { /* ignore */ } finally {
      setAdjusting(false);
      setAdjustModal(null);
      setAdjustQty('');
      setAdjustNote('');
    }
  }

  const displayed = inventory.filter(item => {
    if (stockFilter === 'out') return item.available === 0;
    if (stockFilter === 'low') return item.available > 0 && item.available <= item.threshold;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description={`${user?.location_name ?? user?.location_code ?? 'Warehouse'} stock levels${loading ? ' · Loading…' : ''}`}
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Inventory' }]}
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
        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        >
          <option value="">All stock levels</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
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
                        <Button size="sm" variant="ghost" onClick={() => { setAdjustModal({ item }); setAdjustQty(''); setAdjustNote(''); }}>
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Adjust modal */}
      <Dialog
        open={adjustModal !== null}
        onClose={() => setAdjustModal(null)}
        title={`Adjust Stock — ${adjustModal?.item.product_title ?? ''}`}
        description="Enter a positive number to add stock or negative to deduct. This creates an audit trail."
        confirmLabel={adjusting ? 'Saving…' : 'Apply Adjustment'}
        confirmVariant="primary"
        onConfirm={submitAdjust}
      >
        <div className="pt-2 flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Quantity change <span className="text-destructive">*</span></label>
            <input
              type="number"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              placeholder="e.g. +10 or -3"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={adjustNote}
              onChange={e => setAdjustNote(e.target.value)}
              placeholder="e.g. Received new shipment"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {adjustModal && (
            <p className="text-[12px] text-muted-foreground">
              Current: <span className="font-semibold text-foreground">{adjustModal.item.available}</span> available · {adjustModal.item.reserved} reserved
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
