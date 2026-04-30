'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { PlusIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiProducts, apiUpdateProduct } from '../../../lib/api';
import type { Product } from '../../../lib/api';

function normalizeProduct(p: Product): Product {
  return {
    ...p,
    shortName: p.shortName ?? p.short_name ?? '',
    customTag: p.customTag ?? p.custom_style ?? 'default',
    image: p.image ?? p.image_url ?? undefined,
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [sort, setSort] = useState('created_desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'inactive' | 'discontinued'>('present');
  const [bulkSaving, setBulkSaving] = useState(false);

  async function loadProducts() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const r = await apiProducts(token, { include_stock: true, sort, limit: 300 });
      setProducts((r.data ?? []).map(normalizeProduct));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, [sort]);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort(), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const hay = `${p.title} ${p.brand} ${p.model ?? ''} ${p.sku}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status && p.status !== status) return false;
      if (category && p.category !== category) return false;
      if (brand && p.brand !== brand) return false;
      return true;
    });
  }, [products, search, status, category, brand]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) filtered.forEach((p) => n.delete(p.id));
      else filtered.forEach((p) => n.add(p.id));
      return n;
    });
  }

  async function applyBulkStatus() {
    const token = getToken();
    if (!token || selected.size === 0) return;
    setBulkSaving(true);
    try {
      for (const id of selected) {
        await apiUpdateProduct(token, id, { status: bulkStatus });
      }
      setSelected(new Set());
      await loadProducts();
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Products</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Catalogue management with bulk actions</p>
        </div>
        <Link href="/products/create"><Button size="sm"><PlusIcon /> Add Product</Button></Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, brand, model, SKU..." className="h-9 min-w-72 rounded-md border border-border bg-surface px-3 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
          <option value="">All statuses</option><option value="present">Present</option><option value="inactive">Inactive</option><option value="discontinued">Discontinued</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
          <option value="">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
          <option value="">All brands</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
          <option value="created_desc">Newest</option><option value="title_asc">Name A-Z</option><option value="title_desc">Name Z-A</option><option value="sku_asc">SKU</option>
        </select>
        <div className="ml-auto flex border border-border rounded-md overflow-hidden">
          <button onClick={() => setView('grid')} className={`h-9 px-3 text-sm ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-surface'}`}>Grid</button>
          <button onClick={() => setView('table')} className={`h-9 px-3 text-sm border-l border-border ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-surface'}`}>Table</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleSelectAllVisible} className="h-8 rounded-md border border-border bg-surface px-3 text-xs">{allVisibleSelected ? 'Unselect Visible' : 'Select Visible'}</button>
        <span className="text-xs text-muted-foreground">{selected.size} selected</span>
        <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as 'present' | 'inactive' | 'discontinued')} className="h-8 rounded-md border border-border bg-surface px-2 text-xs">
          <option value="present">Set Present</option><option value="inactive">Set Inactive</option><option value="discontinued">Set Discontinued</option>
        </select>
        <Button size="sm" onClick={applyBulkStatus} disabled={selected.size === 0 || bulkSaving}>{bulkSaving ? 'Applying...' : 'Apply Bulk Status'}</Button>
      </div>

      {view === 'table' ? (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-border bg-surface-raised"><th className="px-3 py-2" /><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">SKU</th><th className="px-3 py-2 text-left">Brand</th><th className="px-3 py-2 text-left">Category</th><th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/70">
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="px-3 py-2 font-medium">{p.title}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-2">{p.brand}</td>
                  <td className="px-3 py-2">{p.category ?? '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.available_stock ?? '-'}</td>
                  <td className="px-3 py-2"><Badge variant={p.status === 'present' ? 'success' : p.status === 'inactive' ? 'default' : 'destructive'}>{p.status}</Badge></td>
                  <td className="px-3 py-2 text-right"><Link href={`/products/${p.id}/edit`} className="text-xs text-primary hover:underline">Edit</Link></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No products found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="relative aspect-square bg-surface-raised">
                <Image src={p.image ?? 'https://placehold.co/400x400'} alt={p.title} fill className="object-cover" unoptimized />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  <Badge variant={p.status === 'present' ? 'success' : p.status === 'inactive' ? 'default' : 'destructive'}>{p.status}</Badge>
                </div>
                <p className="text-sm font-semibold mt-2 line-clamp-2">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.sku}</p>
                <Link href={`/products/${p.id}/edit`} className="text-xs text-primary hover:underline mt-2 inline-block">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
