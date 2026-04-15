'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Dialog } from '../../../../../components/ui/dialog';
import { ChipFilter } from '../../../../../components/ui/chip-filter';

const products = [
  { id: 'p1', sku: 'SKU-TV-001', name: 'Samsung 55" TV', brand: 'Samsung', category: 'Electronics', stock: 2, lowStock: true, image: 'https://placehold.co/80x80/1a1a2e/4f8ef7?text=TV' },
  { id: 'p2', sku: 'SKU-MON-001', name: 'LG Monitor 23"', brand: 'LG', category: 'Electronics', stock: 15, lowStock: false, image: 'https://placehold.co/80x80/0f2027/4f8ef7?text=MON' },
  { id: 'p3', sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', brand: 'LG', category: 'Appliances', stock: 1, lowStock: true, image: 'https://placehold.co/80x80/0d1b2a/4f8ef7?text=FRG' },
  { id: 'p4', sku: 'SKU-LAP-007', name: 'Dell XPS 15', brand: 'Dell', category: 'Computers', stock: 3, lowStock: false, image: 'https://placehold.co/80x80/1a1a2e/e2e8f0?text=LAP' },
  { id: 'p5', sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', brand: 'Apple', category: 'Phones', stock: 22, lowStock: false, image: 'https://placehold.co/80x80/1c1c1e/e2e8f0?text=PHN' },
  { id: 'p6', sku: 'SKU-HDP-002', name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Electronics', stock: 8, lowStock: false, image: 'https://placehold.co/80x80/111827/4f8ef7?text=AUD' },
  { id: 'p7', sku: 'SKU-TAB-005', name: 'iPad Pro 12.9"', brand: 'Apple', category: 'Tablets', stock: 5, lowStock: false, image: 'https://placehold.co/80x80/1c1c1e/94a3b8?text=TAB' },
];

const categories = ['All', 'Electronics', 'Appliances', 'Computers', 'Phones', 'Tablets'];

type ModalState = 'confirm' | null;

export default function CreateOrderPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('All');
  const [confirmModal, setConfirmModal] = useState<ModalState>(null);

  const filteredProducts = category === 'All' ? products : products.filter(p => p.category === category);
  const selectedItems = products.filter(p => (quantities[p.id] ?? 0) > 0);
  const totalItems = selectedItems.reduce((sum, p) => sum + (quantities[p.id] ?? 0), 0);

  function setQty(id: string, delta: number, max: number) {
    setQuantities(prev => {
      const next = Math.max(0, Math.min(max, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

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
        <p className="text-[13px] text-muted-foreground mt-0.5">Select items to request from warehouse WH01</p>
      </div>

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
                {filteredProducts.map((p) => {
                  const qty = quantities[p.id] ?? 0;
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
                          {p.lowStock && <Badge variant="warning">Low Stock</Badge>}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{p.brand} · {p.sku}</p>
                        <p className="text-[11px] text-muted-foreground">{p.stock} available in warehouse</p>
                      </div>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setQty(p.id, -1, p.stock)}
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
                          onClick={() => setQty(p.id, 1, p.stock)}
                          disabled={qty >= p.stock}
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
                  <span className="font-medium">WH01 · Main Warehouse</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">ST01 · Store 01</span>
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
                        <span className="text-primary font-semibold tabular-nums flex-shrink-0">×{quantities[p.id]}</span>
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
                  disabled={selectedItems.length === 0}
                  onClick={() => setConfirmModal('confirm')}
                >
                  Submit Request
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
        open={confirmModal === 'confirm'}
        onClose={() => setConfirmModal(null)}
        title="Submit Order Request"
        description={`Submit request for ${totalItems} item${totalItems !== 1 ? 's' : ''} from WH01? A superadmin will review and approve.`}
        confirmLabel="Submit Request"
        onConfirm={() => console.log('Order submitted', quantities)}
      />
    </div>
  );
}
