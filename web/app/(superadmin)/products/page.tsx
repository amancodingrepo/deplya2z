'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ChipFilter } from '../../../components/ui/chip-filter';
import { PlusIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiProducts as fetchProducts } from '../../../lib/api';
import type { Product } from '../../../lib/api';

/* ─── Data ──────────────────────────────────────── */
export const products = [
  { id: '1', sku: 'SKU-TV-001', title: 'Samsung 55" QLED TV', shortName: 'Samsung TV 55"', brand: 'Samsung', vendor: 'Samsung Electronics', category: 'Electronics', model: 'QN55Q80C', color: 'Black', status: 'present', customTag: 'featured', customCode: 'A2Z-EL-TV001', image: 'https://placehold.co/400x400/1a1a2e/4f8ef7?text=Samsung+TV' },
  { id: '2', sku: 'SKU-MON-001', title: 'LG 23" Monitor', shortName: 'LG Monitor 23"', brand: 'LG', vendor: 'LG Electronics', category: 'Monitors', model: '23MK430H', color: 'Black', status: 'present', customTag: 'catalogue_ready', customCode: 'A2Z-MO-MON001', image: 'https://placehold.co/400x400/0f2027/4f8ef7?text=LG+Monitor' },
  { id: '3', sku: 'SKU-FRG-003', title: 'LG French Door Fridge', shortName: 'LG Fridge 23cu', brand: 'LG', vendor: 'LG Appliances', category: 'Appliances', model: 'LRMVS3006S', color: 'Stainless', status: 'present', customTag: 'premium', customCode: 'A2Z-AP-FRG003', image: 'https://placehold.co/400x400/0d1b2a/4f8ef7?text=LG+Fridge' },
  { id: '4', sku: 'SKU-LAP-007', title: 'Dell XPS 15', shortName: 'Dell XPS 15', brand: 'Dell', vendor: 'Dell Technologies', category: 'Laptops', model: 'XPS-9530', color: 'Silver', status: 'present', customTag: 'featured', customCode: 'A2Z-CO-LAP007', image: 'https://placehold.co/400x400/1a1a2e/e2e8f0?text=Dell+XPS+15' },
  { id: '5', sku: 'SKU-PHN-012', title: 'iPhone 15 Pro', shortName: 'iPhone 15 Pro', brand: 'Apple', vendor: 'Apple Inc.', category: 'Phones', model: 'A3101', color: 'Titanium', status: 'inactive', customTag: 'sale', customCode: 'A2Z-PH-PHN012', image: 'https://placehold.co/400x400/1c1c1e/e2e8f0?text=iPhone+15+Pro' },
  { id: '6', sku: 'SKU-AUD-004', title: 'Sony WH-1000XM5', shortName: 'Sony Headphones', brand: 'Sony', vendor: 'Sony Corporation', category: 'Audio', model: 'WH1000XM5', color: 'Black', status: 'present', customTag: 'catalogue_ready', customCode: 'A2Z-AU-AUD004', image: 'https://placehold.co/400x400/111827/4f8ef7?text=Sony+XM5' },
  { id: '7', sku: 'SKU-TAB-002', title: 'iPad Air 5th Gen', shortName: 'iPad Air 5th', brand: 'Apple', vendor: 'Apple Inc.', category: 'Tablets', model: 'MM9D3LL', color: 'Space Gray', status: 'discontinued', customTag: 'default', customCode: 'A2Z-TB-TAB002', image: 'https://placehold.co/400x400/1c1c1e/94a3b8?text=iPad+Air' },
  { id: '8', sku: 'SKU-PHN-015', title: 'Samsung Galaxy S24 Ultra', shortName: 'Galaxy S24 Ultra', brand: 'Samsung', vendor: 'Samsung Electronics', category: 'Phones', model: 'SM-S928B', color: 'Titanium Black', status: 'present', customTag: 'premium', customCode: 'A2Z-PH-PHN015', image: 'https://placehold.co/400x400/0f2027/4f8ef7?text=Galaxy+S24' },
];

const categories = ['All', 'Electronics', 'Monitors', 'Appliances', 'Laptops', 'Phones', 'Audio', 'Tablets'];

const statusBadge: Record<string, 'success' | 'default' | 'destructive'> = { present: 'success', inactive: 'default', discontinued: 'destructive' };
const statusLabel: Record<string, string> = { present: 'Active', inactive: 'Inactive', discontinued: 'Discontinued' };
const statusDot: Record<string, string> = { present: 'bg-success', inactive: 'bg-muted-foreground', discontinued: 'bg-destructive' };

/* ─── Icons ─────────────────────────────────────── */
function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
    </svg>
  );
}

export default function ProductsPage() {
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const [apiProductList, setApiProductList] = useState<Product[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiMeta, setApiMeta] = useState({ total: 0, page: 1 });

  useEffect(() => {
    const token = getToken();
    if (!token) { setApiLoading(false); return; }
    let cancelled = false;
    setApiLoading(true);
    fetchProducts(token, { search: searchQuery, page: 1, limit: 50 })
      .then(r => {
        if (!cancelled) {
          setApiProductList(r.data);
          setApiMeta({ total: r.meta.total, page: r.meta.page });
        }
      })
      .catch(() => { /* fall through to mock data */ })
      .finally(() => { if (!cancelled) setApiLoading(false); });
    return () => { cancelled = true; };
  }, [searchQuery]);

  // Use API data if available, fall back to mock data
  const sourceProducts = apiProductList.length > 0 ? apiProductList : products;

  const filtered = sourceProducts.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.sku.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (category !== 'All' && p.category !== category) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Products</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Products</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Manage your product catalogue · {apiLoading ? '…' : (apiMeta.total || sourceProducts.length)} total</p>
        </div>
        <Link href="/products/create">
          <Button size="sm"><PlusIcon /> Add Product</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search products…"
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      {/* Filters + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ChipFilter chips={categories.map(c => ({ value: c, label: c }))} active={category} onChange={setCategory} />
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          >
            <option value="all">All statuses</option>
            <option value="present">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setView('grid')} className={`flex items-center justify-center px-2.5 h-8 transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:bg-surface-raised'}`} aria-label="Grid view">
              <GridIcon />
            </button>
            <button onClick={() => setView('table')} className={`flex items-center justify-center px-2.5 h-8 transition-colors border-l border-border ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:bg-surface-raised'}`} aria-label="Table view">
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <p className="text-[14px] font-medium">No products match the filter</p>
          <p className="text-[12px]">Try clearing the filters above</p>
        </div>
      )}

      {/* Grid view — simple: image, title, short name */}
      {view === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <Link key={p.id} href={`/products/${p.id}/edit`} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface hover:border-primary/50 hover:shadow-sm transition-all">
              <div className="relative aspect-square overflow-hidden bg-surface-raised">
                <Image src={p.image ?? 'https://placehold.co/400x400/1a1a2e/4f8ef7?text=Product'} alt={p.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
                <span className={`absolute top-2 right-2 size-2.5 rounded-full ring-2 ring-surface ${statusDot[p.status]}`} />
              </div>
              <div className="flex flex-col gap-0.5 p-3">
                <p className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.shortName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.brand} · {p.category}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Table view — full detail */}
      {view === 'table' && filtered.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  {['Product', 'SKU', 'Brand', 'Category', 'Model', 'Color', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-raised transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-9 flex-shrink-0 overflow-hidden rounded-md bg-surface-raised">
                          <Image src={p.image ?? 'https://placehold.co/400x400/1a1a2e/4f8ef7?text=Product'} alt={p.title} fill className="object-cover" unoptimized />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight">{p.title}</p>
                          <p className="text-[11px] text-muted-foreground">{p.shortName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">{p.sku}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.brand}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.model}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.color}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadge[p.status]}>{statusLabel[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}/edit`}>
                        <Button size="sm" variant="outline" className="h-7 px-3 text-[11px]">Edit</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Showing {filtered.length} of {sourceProducts.length} products</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
