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
import { apiCreateProduct, apiInventory, apiInventoryAddStock } from '../../../../lib/api';
import type { InventoryRow } from '../../../../lib/api';

/* ─── Mock fallback ──────────────────────────────── */
const MOCK: InventoryRow[] = [
  { id: '1', product_id: '1', location_id: '', location_code: 'WH01', location_name: 'Main Warehouse', sku: 'SKU-TV-001', product_title: 'Samsung 55" TV', quantity: 7, reserved: 5, available: 2, threshold: 5, updated_at: '' },
  { id: '2', product_id: '2', location_id: '', location_code: 'WH01', location_name: 'Main Warehouse', sku: 'SKU-MON-001', product_title: 'LG Monitor 23"', quantity: 18, reserved: 3, available: 15, threshold: 5, updated_at: '' },
  { id: '3', product_id: '3', location_id: '', location_code: 'WH01', location_name: 'Main Warehouse', sku: 'SKU-FRG-003', product_title: 'LG Fridge 23cu', quantity: 3, reserved: 2, available: 1, threshold: 5, updated_at: '' },
  { id: '4', product_id: '4', location_id: '', location_code: 'WH01', location_name: 'Main Warehouse', sku: 'SKU-LAP-007', product_title: 'Dell XPS 15', quantity: 3, reserved: 0, available: 3, threshold: 5, updated_at: '' },
  { id: '5', product_id: '5', location_id: '', location_code: 'WH01', location_name: 'Main Warehouse', sku: 'SKU-PHN-012', product_title: 'iPhone 15 Pro', quantity: 30, reserved: 8, available: 22, threshold: 10, updated_at: '' },
  { id: '6', product_id: '6', location_id: '', location_code: 'WH01', location_name: 'Main Warehouse', sku: 'SKU-AUD-004', product_title: 'Sony WH-1000XM5', quantity: 10, reserved: 0, available: 10, threshold: 4, updated_at: '' },
];

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

  const [inventory, setInventory] = useState<InventoryRow[]>(MOCK);
  const [loading, setLoading] = useState(true);

  const [adjustModal, setAdjustModal] = useState<AdjustModal>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newQty, setNewQty] = useState('0');

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
      if (r.data.length > 0) setInventory(r.data);
      else if (!search && !stockFilter) setInventory(MOCK);
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
      if (qty <= 0) return;
      await apiInventoryAddStock(token, {
        product_id: adjustModal.item.product_id,
        quantity_to_add: qty,
        reason: adjustNote?.trim() || 'Manual stock add',
        notes: adjustNote?.trim() || undefined,
      });
      setRefreshKey(k => k + 1);
    } catch { /* ignore */ } finally {
      setAdjusting(false);
      setAdjustModal(null);
      setAdjustQty('');
      setAdjustNote('');
    }
  }

  async function submitCreate() {
    const token = getToken();
    if (!token) return;
    const qty = parseInt(newQty, 10);
    if (!newSku.trim() || !newTitle.trim() || !newBrand.trim() || isNaN(qty) || qty < 0) return;
    setCreating(true);
    try {
      await apiCreateProduct(token, {
        sku: newSku.trim(),
        title: newTitle.trim(),
        brand: newBrand.trim(),
        category: newCategory.trim() || 'General',
        model: newModel.trim() || undefined,
        color: newColor.trim() || undefined,
        status: 'present',
        initial_stock: qty,
        initial_stock_reason: 'Initial stock from warehouse web',
      } as any);
      setCreateOpen(false);
      setNewSku('');
      setNewTitle('');
      setNewBrand('');
      setNewCategory('');
      setNewModel('');
      setNewColor('');
      setNewQty('0');
      setRefreshKey((k) => k + 1);
    } finally {
      setCreating(false);
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
        <Button size="sm" onClick={() => setCreateOpen(true)}>Add Item</Button>
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
      </Card>

      {/* Adjust modal */}
      <Dialog
        open={adjustModal !== null}
        onClose={() => setAdjustModal(null)}
        title={`Adjust Stock — ${adjustModal?.item.product_title ?? ''}`}
        description="Enter quantity to add. This creates an audit trail."
        confirmLabel={adjusting ? 'Saving…' : 'Apply Adjustment'}
        confirmVariant="primary"
        onConfirm={submitAdjust}
      >
        <div className="pt-2 flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Quantity to add <span className="text-destructive">*</span></label>
            <input
              type="number"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              placeholder="e.g. 10"
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

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Inventory Item"
        description="Create a new product and add initial stock to this warehouse."
        confirmLabel={creating ? 'Creating...' : 'Create Item'}
        confirmVariant="primary"
        onConfirm={submitCreate}
      >
        <div className="pt-2 grid grid-cols-1 gap-3">
          <input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="SKU *" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Product title *" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
          <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Brand *" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
          <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Model (optional)" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
          <input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Color (optional)" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
          <input type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Initial stock" className="h-9 rounded-md border border-border bg-surface px-3 text-[13px]" />
        </div>
      </Dialog>
    </div>
  );
}
