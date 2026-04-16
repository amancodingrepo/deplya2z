'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { Dialog } from '../../../../../components/ui/dialog';
import { products } from '../../page';

const categoryOptions = [
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Monitors', label: 'Monitors' },
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Laptops', label: 'Laptops' },
  { value: 'Phones', label: 'Phones' },
  { value: 'Audio', label: 'Audio' },
  { value: 'Tablets', label: 'Tablets' },
];

const statusOptions = [
  { value: 'present', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
];

const tagOptions = [
  { value: 'default', label: 'Default' },
  { value: 'featured', label: 'Featured' },
  { value: 'premium', label: 'Premium' },
  { value: 'sale', label: 'Sale' },
  { value: 'catalogue_ready', label: 'Catalogue Ready' },
];

const statusBadge: Record<string, 'success' | 'default' | 'destructive'> = {
  present: 'success',
  inactive: 'default',
  discontinued: 'destructive',
};

const statusLabel: Record<string, string> = {
  present: 'Active',
  inactive: 'Inactive',
  discontinued: 'Discontinued',
};

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-[12px] font-medium text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-[13px] text-foreground text-right break-all">{value}</span>
    </div>
  );
}

export default function ProductEditPage() {
  const params = useParams();
  const id = params.id as string;

  const product = products.find(p => p.id === id) ?? products[0];

  const [title, setTitle] = useState(product.title);
  const [shortName, setShortName] = useState(product.shortName);
  const [brand, setBrand] = useState(product.brand);
  const [vendor, setVendor] = useState(product.vendor);
  const [model, setModel] = useState(product.model);
  const [color, setColor] = useState(product.color);
  const [category, setCategory] = useState(product.category);
  const [status, setStatus] = useState(product.status);
  const [customTag, setCustomTag] = useState(product.customTag);
  const [imageUrl, setImageUrl] = useState(product.image);
  const [saved, setSaved] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Edit Product</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">{product.title}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{product.sku} · {product.shortName}</p>
        </div>
        <Badge variant={statusBadge[status]} dot>{statusLabel[status]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: form */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                label="Product Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Samsung 55″ QLED TV"
                required
              />
              <Input
                label="Short Name"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Samsung TV 55"
                hint="Used in compact views and order lists"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Samsung"
                  required
                />
                <Input
                  label="Vendor / Supplier"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Samsung Electronics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. QN55Q80C"
                />
                <Input
                  label="Color / Finish"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Black"
                />
              </div>
              <Select
                label="Category"
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Media</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Current image preview */}
              <div className="relative aspect-[16/9] max-h-52 w-full overflow-hidden rounded-lg bg-surface-raised">
                <Image src={imageUrl} alt={title} fill className="object-cover" unoptimized />
              </div>
              <div className="flex items-center gap-3">
                <Input
                  label="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
              </div>
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 text-[13px] text-muted-foreground">
                Drop image here or{' '}
                <label className="ml-1 cursor-pointer text-primary hover:underline">
                  browse
                  <input type="file" accept="image/*" className="sr-only" aria-label="Upload product image" />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: visibility + codes */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Status & Tags</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <Select
                label="Custom Tag"
                options={tagOptions}
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Product Codes</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <FieldRow label="SKU" value={product.sku} />
                <FieldRow label="Custom Code" value={product.customCode} />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Custom code is auto-generated and cannot be changed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {saved && (
                <p className="text-[12px] text-success text-center py-1">Changes saved!</p>
              )}
              <Button className="w-full" onClick={handleSave}>Save Changes</Button>
              <Link href="/products">
                <Button variant="outline" className="w-full">Cancel</Button>
              </Link>
              <div className="border-t border-border pt-2 mt-1">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteModal(true)}
                >
                  Delete Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirm modal */}
      <Dialog
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Product"
        description={`Delete "${product.title}" (${product.sku})? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          setDeleteModal(false);
          window.location.href = '/products';
        }}
      />
    </div>
  );
}
