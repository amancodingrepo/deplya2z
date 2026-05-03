'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { getToken } from '../../../../lib/auth';
import { apiCreateProduct, apiUploadProductImage } from '../../../../lib/api';

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

const categoryPrefix: Record<string, string> = {
  Electronics: 'EL',
  Monitors: 'MO',
  Appliances: 'AP',
  Laptops: 'CO',
  Phones: 'PH',
  Audio: 'AU',
  Tablets: 'TB',
};

function generateCustomCode(sku: string, category: string): string {
  if (!sku) return '';
  const prefix = categoryPrefix[category] ?? 'XX';
  const suffix = sku.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
  return `A2Z-${prefix}-${suffix}`;
}

export default function CreateProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [shortName, setShortName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('present');
  const [customTag, setCustomTag] = useState('default');
  const [customCode, setCustomCode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCustomCode(generateCustomCode(sku, category));
  }, [sku, category]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!title.trim() || !sku.trim() || !brand.trim() || !shortName.trim()) {
      setError('Title, Short Name, SKU, and Brand are required.');
      return;
    }
    const token = getToken();
    if (!token) { setError('Not authenticated.'); return; }

    setSaving(true);
    setError('');
    try {
      // 1 — Create product
      const created = await apiCreateProduct(token, {
        title: title.trim(),
        shortName: shortName.trim(),
        sku: sku.trim(),
        brand: brand.trim(),
        vendor: vendor.trim(),
        model: model.trim(),
        color: color.trim(),
        category,
        status: status as 'present' | 'inactive' | 'discontinued',
        customTag,
        customCode,
      });

      const productId = created.data.id;

      // 2 — Upload image if provided
      if (imageFile) {
        await apiUploadProductImage(token, productId, imageFile);
      }

      router.push('/products');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-[12px] text-muted-foreground mb-1">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="mx-1.5">·</span>
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          <span className="mx-1.5">·</span>
          <span className="text-foreground">Add Product</span>
        </p>
        <h1 className="text-[20px] font-semibold text-foreground">Add Product</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Create a new product in the catalogue</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main form */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                label="Product Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Samsung 55″ QLED TV"
                required
              />
              <Input
                label="Short Name"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
                placeholder="e.g. Samsung TV 55"
                hint="Used in compact views and order lists"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="SKU-TV-001"
                  required
                />
                <Input
                  label="Brand"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="e.g. Samsung"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Vendor / Supplier"
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  placeholder="e.g. Samsung Electronics"
                />
                <Input
                  label="Model"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="e.g. QN55Q80C"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Color / Finish"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="e.g. Black"
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  placeholder="Select category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Media</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {imagePreview && (
                <div className="relative w-full max-h-52 overflow-hidden rounded-lg bg-surface-raised">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full object-contain max-h-52" />
                </div>
              )}
              <div
                className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 text-[13px] text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageFile ? (
                  <span className="text-foreground">{imageFile.name}</span>
                ) : (
                  <>
                    Drop image here or{' '}
                    <span className="ml-1 text-primary hover:underline">browse</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Upload product image"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP · max {5} MB · will be converted to WebP</p>
            </CardContent>
          </Card>
        </div>

        {/* Side */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Status & Tags</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={e => setStatus(e.target.value)}
              />
              <Select
                label="Custom Tag"
                options={tagOptions}
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Auto-generated custom code preview */}
          <Card>
            <CardHeader><CardTitle>Product Code</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-center">
                {customCode ? (
                  <>
                    <p className="font-mono text-[15px] font-bold text-foreground tracking-wider">{customCode}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Auto-generated · read-only</p>
                  </>
                ) : (
                  <p className="text-[12px] text-muted-foreground">Enter SKU and category to generate code</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {error && (
                <p className="text-[12px] text-destructive text-center py-1">{error}</p>
              )}
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Product'}
              </Button>
              <Link href="/products">
                <Button variant="outline" className="w-full" disabled={saving}>Cancel</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
