'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Dialog } from '../../../../../components/ui/dialog';
import { ChipFilter } from '../../../../../components/ui/chip-filter';
import { getToken, getUser } from '../../../../../lib/auth';
import { apiInventory, apiLocations, apiCreateOrder, ApiError } from '../../../../../lib/api';
import type { InventoryRow, Location } from '../../../../../lib/api';

/* ─── Fallback products (shown until API loads) ───── */
const MOCK_PRODUCTS = [
  { id: 'p1', product_id: 'p1', sku: 'SKU-TV-001', name: 'Samsung 55" TV', brand: 'Samsung', category: 'Electronics', available: 2, threshold: 5, image: 'https://placehold.co/80x80/1a1a2e/4f8ef7?text=TV' },
  { id: 'p2', product_id: 'p2', sku: 'SKU-MON-001', name: 'LG Monitor 23"', brand: 'LG', category: 'Electronics', available: 15, threshold: 5, image: 'https://placehold.co/80x80/0f2027/4f8ef7?text=MON' },
  { id: 'p3', product_id: 'p3', sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', brand: 'LG', category: 'Appliances', available: 1, threshold: 5, image: 'https://placehold.co/80x80/0d1b2a/4f8ef7?text=FRG' },
  { id: 'p4', product_id: 'p4', sku: 'SKU-LAP-007', name: 'Dell XPS 15', brand: 'Dell', category: 'Computers', available: 3, threshold: 5, image: 'https://placehold.co/80x80/1a1a2e/e2e8f0?text=LAP' },
  { id: 'p5', product_id: 'p5', sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', brand: 'Apple', category: 'Phones', available: 22, threshold: 10, image: 'https://placehold.co/80x80/1c1c1e/e2e8f0?text=PHN' },
  { id: 'p6', product_id: 'p6', sku: 'SKU-HDP-002', name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Electronics', available: 8, threshold: 4, image: 'https://placehold.co/80x80/111827/4f8ef7?text=AUD' },
];

interface ProductRow {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  available: number;
  threshold: number;
  image: string;
}

function toProductRow(inv: InventoryRow): ProductRow {
  return {
    id: inv.id,
    product_id: inv.product_id,
    sku: inv.sku,
    name: inv.product_title,
    brand: '',
    category: '',
    available: inv.available,
    threshold: inv.threshold,
    image: `https://placehold.co/80x80/1a1a2e/4f8ef7?text=${encodeURIComponent(inv.sku)}`,
  };
}

export default function CreateOrderPage() {
  const router = useRouter();
  const user = getUser();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('All');
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [products, setProducts] = useState<ProductRow[]>(MOCK_PRODUCTS);
  const [warehouses, setWarehouses] = useState<Location[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    Promise.allSettled([
      apiInventory(token, { limit: 200 }),
      apiLocations(token, { type: 'warehouse' }),
    ]).then(([inv, locs]) => {
      if (cancelled) return;
      if (inv.status === 'fulfilled' && inv.value.data.length > 0) {
        setProducts(inv.value.data.map(toProductRow));
      }
      if (locs.status === 'fulfilled' && locs.value.data.length > 0) {
        setWarehouses(locs.value.data);
        setSelectedWarehouseId(locs.value.data[0]?.id ?? '');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filteredProducts = category === 'All' ? products : products.filter(p => p.category === category);
  const selectedItems = products.filter(p => (quantities[p.product_id] ?? 0) > 0);
  const totalItems = selectedItems.reduce((sum, p) => sum + (quantities[p.product_id] ?? 0), 0);

  function setQty(productId: string, delta: number, max: number) {
    setQuantities(prev => {
      const next = Math.max(0, Math.min(max, (prev[productId] ?? 0) + delta));
      return { ...prev, [productId]: next };
    });
  }

  async function submitOrder() {
    const token = getToken();
    if (!token || !user?.location_id || !selectedWarehouseId) {
      setSubmitError('Missing location data. Please log out and back in.');
      return;
    }
    if (selectedItems.length === 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      await apiCreateOrder(token, {
        store_id: user.location_id,
        warehouse_id: selectedWarehouseId,
        items: selectedItems.map(p => ({
          product_id: p.product_id,
          qty: quantities[p.product_id] ?? 0,
        })),
      });
      router.push('/st/orders');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message ?? 'Failed to submit order. Please try again.');
      } else {
        setSubmitError('Failed to submit order. Check your connection.');
      }
    } finally {
      setSubmitting(false);
      setConfirmModal(false);
    }
  }

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-[12px] text-muted-foreground mb-1">
          <Link href="/st/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="mx-1.5">·</span>
          <Link href="/st/orders" className="hover:text-foreground transition-colors">My Orders</Link>
          <span className="mx-1.5">·</span>
          <span className="text-foreground">New Request</span>
        </p>
        <h1 className="text-[20px] font-semibold text-foreground">New Order Request</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Select items to request from warehouse
          {loading && <span className="ml-1 text-[11px] animate-pulse">· Loading products…</span>}
        </p>
      </div>

      {/* Warehouse selector (if multiple) */}
      {warehouses.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-[12px] font-semibold text-foreground">Request from:</label>
          <select
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.code} · {w.name}</option>
            ))}
          </select>
        </div>
      )}

      {submitError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Product Picker */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Category chips */}
          <ChipFilter
            chips={categories.map(c => ({ value: c, label: c }))}
            active={category}
            onChange={setCategory}
          />

          <Card>
            <CardContent className="px-0 py-0">
              <ul className="divide-y divide-border">
                {filteredProducts.length === 0 && (
                  <li className="px-5 py-10 text-center text-[13px] text-muted-foreground">No products available</li>
                )}
                {filteredProducts.map((p) => {
                  const qty = quantities[p.product_id] ?? 0;
                  const isLow = p.available > 0 && p.available <= p.threshold;
                  return (
                    <li key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                      {/* Product image */}
                      <div className="relative size-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface-raised">
                        <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
                      </div>
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                          {p.available === 0 && <Badge variant="destructive">Out of Stock</Badge>}
                          {isLow && <Badge variant="warning">Low Stock</Badge>}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{p.sku}{p.brand ? ` · ${p.brand}` : ''}</p>
                        <p className="text-[11px] text-muted-foreground">{p.available} available in warehouse</p>
                      </div>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setQty(p.product_id, -1, p.available)}
                          disabled={qty === 0}
                          className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-raised disabled:opacity-30 transition-colors text-[15px] font-medium"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className={`w-8 text-center text-[13px] tabular-nums font-semibold ${qty > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {qty}
                        </span>
                        <button
                          onClick={() => setQty(p.product_id, 1, p.available)}
                          disabled={qty >= p.available || p.available === 0}
                          className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-raised disabled:opacity-30 transition-colors text-[15px] font-medium"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">
                    {selectedWarehouse ? `${selectedWarehouse.code} · ${selectedWarehouse.name}` : 'Warehouse'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">
                    {user?.location_code ? `${user.location_code} · ${user.location_name ?? 'Store'}` : 'Your Store'}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                {selectedItems.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-2">
                    Use + to add items above
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {selectedItems.map(p => (
                      <li key={p.id} className="flex items-center justify-between text-[13px]">
                        <span className="text-foreground truncate flex-1 mr-2">{p.name}</span>
                        <span className="text-primary font-semibold tabular-nums flex-shrink-0">×{quantities[p.product_id]}</span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between text-[12px] border-t border-border pt-2 mt-1">
                      <span className="text-muted-foreground">Total items</span>
                      <span className="font-bold text-foreground tabular-nums">{totalItems}</span>
                    </li>
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <Button
                  className="w-full"
                  disabled={selectedItems.length === 0 || submitting}
                  onClick={() => setConfirmModal(true)}
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
                <Link href="/st/orders">
                  <Button variant="outline" className="w-full">Cancel</Button>
                </Link>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Sent for superadmin approval
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Modal */}
      <Dialog
        open={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Submit Order Request"
        description={`Submit request for ${totalItems} item${totalItems !== 1 ? 's' : ''} from ${selectedWarehouse?.code ?? 'warehouse'}? A superadmin will review and approve.`}
        confirmLabel={submitting ? 'Submitting…' : 'Submit Request'}
        confirmVariant="primary"
        onConfirm={submitOrder}
      />
    </div>
  );
}
