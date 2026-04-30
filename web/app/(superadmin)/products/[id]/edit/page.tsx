'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { Dialog } from '../../../../../components/ui/dialog';
import { getToken } from '../../../../../lib/auth';
import { apiProduct, apiUpdateProduct, apiDeleteProduct, apiUploadProductImage } from '../../../../../lib/api';
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
  present: 'success', inactive: 'default', discontinued: 'destructive',
};
const statusLabel: Record<string, string> = {
  present: 'Active', inactive: 'Inactive', discontinued: 'Discontinued',
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
  const router = useRouter();
  const id = String(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [shortName, setShortName] = useState('');
  const [brand, setBrand] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('present');
  const [customTag, setCustomTag] = useState('default');

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    apiProduct(token, id)
      .then(res => {
        const p = res.data;
        setProduct(p);
        setTitle(p.title ?? '');
        setShortName((p as any).shortName ?? (p as any).short_name ?? '');
        setBrand(p.brand ?? '');
        setVendor((p as any).vendor ?? '');
        setModel(p.model ?? '');
        setColor(p.color ?? '');
        setCategory(p.category ?? '');
        setStatus(p.status ?? 'present');
        setCustomTag((p as any).customTag ?? (p as any).custom_style ?? 'default');
      })
      .catch(err => setLoadError(err.message ?? 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setSaving(true);
    setSaveError('');
    setSaveMsg('');
    try {
      const updated = await apiUpdateProduct(token, id, {
        title, short_name: shortName, brand, model, color, category,
        status: status as Product['status'],
        custom_style: customTag,
      } as any);
      setProduct({ ...updated.data, shortName } as Product);
      setSaveMsg('Changes saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setDeleting(true);
    try {
      await apiDeleteProduct(token, id);
      router.push('/products');
    } catch (err: any) {
      setSaveError(err.message ?? 'Delete failed.');
      setDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-[14px] text-destructive">{loadError || 'Product not found.'}</p>
        <Link href="/products"><Button variant="outline">Back to Products</Button></Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
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

      {saveError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: form */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Product Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Samsung 55″ QLED TV" required />
              <Input label="Short Name" value={shortName} onChange={e => setShortName(e.target.value)} placeholder="e.g. Samsung TV 55" hint="Used in compact views and order lists" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Samsung" required />
                <Input label="Vendor / Supplier" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Samsung Electronics" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Model" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. QN55Q80C" />
                <Input label="Color / Finish" value={color} onChange={e => setColor(e.target.value)} placeholder="e.g. Black" />
              </div>
              <Select label="Category" options={categoryOptions} value={category} onChange={e => setCategory(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Media</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {product.image && (
                <div className="relative h-40 w-full overflow-hidden rounded-lg bg-surface-raised">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={title} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 text-[13px] text-muted-foreground">
                Drop image here or{' '}
                <label className="ml-1 cursor-pointer text-primary hover:underline">
                  browse
                  <input type="file" accept="image/*" className="sr-only" aria-label="Upload product image" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const token = getToken();
                    if (!token) return;
                    try {
                      const res = await apiUploadProductImage(token, id, file);
                      setProduct(p => p ? { ...p, image: res.data.url, image_url: res.data.url } as Product : p);
                    } catch { /* ignore upload error */ }
                  }} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Status & Tags</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select label="Status" options={statusOptions} value={status} onChange={e => setStatus(e.target.value)} />
              <Select label="Custom Tag" options={tagOptions} value={customTag} onChange={e => setCustomTag(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Product Codes</CardTitle></CardHeader>
            <CardContent>
              <FieldRow label="SKU" value={product.sku} />
              {product.customCode && <FieldRow label="Custom Code" value={product.customCode} />}
              <p className="mt-3 text-[11px] text-muted-foreground">SKU and custom code cannot be changed after creation.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {saveMsg && <p className="text-[12px] text-success text-center py-1">{saveMsg}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Link href="/products">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </Link>
              <div className="border-t border-border pt-2 mt-1">
                <Button type="button" variant="destructive" className="w-full" onClick={() => setDeleteModal(true)}>
                  Delete Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Product"
        description={`Delete "${product.title}" (${product.sku})? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </form>
  );
}
