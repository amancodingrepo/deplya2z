'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { Dialog } from '../../../../../components/ui/dialog';
import { getToken } from '../../../../../lib/auth';
import {
  apiProduct,
  apiUpdateProduct,
  apiUploadProductImage,
  apiDeleteProduct,
} from '../../../../../lib/api';
import type { Product } from '../../../../../lib/api';

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
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [shortName, setShortName] = useState('');
  const [brand, setBrand] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('present');
  const [customTag, setCustomTag] = useState('default');

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load product from API
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoadError('Not authenticated.'); setLoading(false); return; }
    setLoading(true);
    apiProduct(token, id)
      .then(r => {
        const p = r.data;
        setProduct(p);
        setTitle(p.title ?? '');
        setShortName(p.shortName ?? '');
        setBrand(p.brand ?? '');
        setVendor(p.vendor ?? '');
        setModel(p.model ?? '');
        setColor(p.color ?? '');
        setCategory(p.category ?? '');
        setStatus(p.status ?? 'present');
        setCustomTag(p.customTag ?? 'default');
      })
      .catch(() => setLoadError('Failed to load product.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!title.trim() || !brand.trim() || !shortName.trim()) {
      setSaveError('Title, Short Name, and Brand are required.');
      return;
    }
    const token = getToken();
    if (!token) { setSaveError('Not authenticated.'); return; }

    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      await apiUpdateProduct(token, id, {
        title: title.trim(),
        shortName: shortName.trim(),
        brand: brand.trim(),
        vendor: vendor.trim(),
        model: model.trim(),
        color: color.trim(),
        category,
        status: status as 'present' | 'inactive' | 'discontinued',
        customTag,
      });

      if (imageFile) {
        const imgResult = await apiUploadProductImage(token, id, imageFile);
        setProduct(prev => prev ? { ...prev, image: imgResult.data.url } : prev);
        setImageFile(null);
        setImagePreview(null);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await apiDeleteProduct(token, id);
      router.push('/products');
    } catch {
      setDeleteModal(false);
      setSaveError('Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-[13px]">
        Loading product…
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-destructive text-[13px]">{loadError || 'Product not found.'}</p>
        <Link href="/products">
          <Button variant="outline">Back to Products</Button>
        </Link>
      </div>
    );
  }

  // Displayed image: new preview > existing image URL
  const displayImage = imagePreview ?? product.image ?? null;

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
              {/* Image preview */}
              {displayImage && (
                <div className="relative aspect-[16/9] max-h-52 w-full overflow-hidden rounded-lg bg-surface-raised">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt={title} className="w-full h-full object-contain max-h-52" />
                  ) : (
                    <Image src={displayImage} alt={title} fill className="object-cover" unoptimized />
                  )}
                </div>
              )}
              <div
                className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 text-[13px] text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageFile ? (
                  <span className="text-foreground">{imageFile.name}</span>
                ) : (
                  <>
                    Replace image — drop here or{' '}
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
              <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP · max 5 MB · will be converted to WebP</p>
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
                {product.customCode && <FieldRow label="Custom Code" value={product.customCode} />}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Custom code is auto-generated and cannot be changed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {saveError && (
                <p className="text-[12px] text-destructive text-center py-1">{saveError}</p>
              )}
              {saved && (
                <p className="text-[12px] text-success text-center py-1">Changes saved!</p>
              )}
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Link href="/products">
                <Button variant="outline" className="w-full" disabled={saving}>Cancel</Button>
              </Link>
              <div className="border-t border-border pt-2 mt-1">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteModal(true)}
                  disabled={saving}
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
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
