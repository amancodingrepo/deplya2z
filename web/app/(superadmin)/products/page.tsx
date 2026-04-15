'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ChipFilter } from '../../../components/ui/chip-filter';
import { Card } from '../../../components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon } from '../../../components/layout/icons';

function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

const products = [
  { id: '1', sku: 'SKU-TV-001', title: 'Samsung 55" QLED TV', shortName: 'Samsung TV 55"', brand: 'Samsung', category: 'Electronics', model: 'QN55Q80C', color: 'Black', status: 'present', image: 'https://placehold.co/400x300/1a1a2e/4f8ef7?text=Samsung+TV' },
  { id: '2', sku: 'SKU-MON-001', title: 'LG 23" Monitor', shortName: 'LG Monitor 23"', brand: 'LG', category: 'Monitors', model: '23MK430H', color: 'Black', status: 'present', image: 'https://placehold.co/400x300/0f2027/4f8ef7?text=LG+Monitor' },
  { id: '3', sku: 'SKU-FRG-003', title: 'LG French Door Fridge', shortName: 'LG Fridge 23cu', brand: 'LG', category: 'Appliances', model: 'LRMVS3006S', color: 'Stainless', status: 'present', image: 'https://placehold.co/400x300/0d1b2a/4f8ef7?text=LG+Fridge' },
  { id: '4', sku: 'SKU-LAP-007', title: 'Dell XPS 15', shortName: 'Dell XPS 15', brand: 'Dell', category: 'Laptops', model: 'XPS-9530', color: 'Silver', status: 'present', image: 'https://placehold.co/400x300/1a1a2e/e2e8f0?text=Dell+XPS+15' },
  { id: '5', sku: 'SKU-PHN-012', title: 'iPhone 15 Pro', shortName: 'iPhone 15 Pro', brand: 'Apple', category: 'Phones', model: 'A3101', color: 'Titanium', status: 'inactive', image: 'https://placehold.co/400x300/1c1c1e/e2e8f0?text=iPhone+15+Pro' },
  { id: '6', sku: 'SKU-AUD-004', title: 'Sony WH-1000XM5', shortName: 'Sony Headphones', brand: 'Sony', category: 'Audio', model: 'WH1000XM5', color: 'Black', status: 'present', image: 'https://placehold.co/400x300/111827/4f8ef7?text=Sony+WH-1000XM5' },
  { id: '7', sku: 'SKU-TAB-002', title: 'iPad Air 5th Gen', shortName: 'iPad Air 5th', brand: 'Apple', category: 'Tablets', model: 'MM9D3LL', color: 'Space Gray', status: 'discontinued', image: 'https://placehold.co/400x300/1c1c1e/94a3b8?text=iPad+Air' },
  { id: '8', sku: 'SKU-PHN-015', title: 'Samsung Galaxy S24 Ultra', shortName: 'Galaxy S24 Ultra', brand: 'Samsung', category: 'Phones', model: 'SM-S928B', color: 'Titanium Black', status: 'present', image: 'https://placehold.co/400x300/0f2027/4f8ef7?text=Galaxy+S24' },
];

const categories = ['All', 'Electronics', 'Monitors', 'Appliances', 'Laptops', 'Phones', 'Audio', 'Tablets'];
const statusBadge: Record<string, 'success' | 'default' | 'destructive'> = {
  present: 'success',
  inactive: 'default',
  discontinued: 'destructive',
};

export default function ProductsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = products.filter((p) => {
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
          <p className="text-[13px] text-muted-foreground mt-0.5">Manage your product catalogue · {products.length} total</p>
        </div>
        <Link href="/products/create">
          <Button size="sm"><PlusIcon /> Add Product</Button>
        </Link>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ChipFilter
          chips={categories.map(c => ({ value: c, label: c }))}
          active={category}
          onChange={setCategory}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
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
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`flex size-8 items-center justify-center transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:text-foreground'}`}
              aria-label="Grid view"
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex size-8 items-center justify-center transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:text-foreground'}`}
              aria-label="List view"
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <div key={p.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface hover:border-border-strong transition-colors">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-raised">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute top-2 left-2">
                  <Badge variant={statusBadge[p.status]} dot>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </Badge>
                </div>
              </div>
              {/* Info */}
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">{p.brand} · {p.sku}</p>
                <p className="text-[11px] text-muted-foreground">{p.category} · {p.color}</p>
                <div className="mt-auto pt-2 flex items-center gap-1.5">
                  <Link href={`/products/${p.id}/edit`} className="flex-1">
                    <button className="w-full h-7 rounded-md border border-border bg-surface text-[12px] font-medium text-foreground hover:bg-surface-raised transition-colors">
                      Edit
                    </button>
                  </Link>
                  <button className="h-7 w-7 rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors flex items-center justify-center text-[13px]">
                    ···
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={6}>No products match the filter.</TableEmpty>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-9 flex-shrink-0 overflow-hidden rounded-md bg-surface-raised">
                          <Image src={p.image} alt={p.title} fill className="object-cover" unoptimized />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{p.title}</p>
                          <p className="text-[11px] text-muted-foreground">{p.model} · {p.color}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">{p.sku}</TableCell>
                    <TableCell>{p.brand}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge[p.status]} dot>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/products/${p.id}/edit`} className="text-[12px] font-medium text-primary hover:underline">
                        Edit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Showing {filtered.length} of {products.length} products</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
