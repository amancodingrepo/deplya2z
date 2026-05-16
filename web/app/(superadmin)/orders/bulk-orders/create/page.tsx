'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Card } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { getToken } from '../../../../../lib/auth';
import { apiClients, apiLocations, apiProducts, apiCreateBulkOrder } from '../../../../../lib/api';
import type { ClientStore, Location, Product } from '../../../../../lib/api';

type Line = { product_id: string; qty: number };

export default function CreateBulkOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clients, setClients] = useState<ClientStore[]>([]);
  const [warehouses, setWarehouses] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: 1 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiClients(token, { limit: 200 }),
      apiLocations(token, { type: 'warehouse' }),
      apiProducts(token, { include_stock: true, limit: 500 }),
    ]).then(([c, w, p]) => {
      setClients(c.data);
      setWarehouses(w.data);
      setProducts(p.data);
    });
  }, []);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
  const canStep2 = !!clientId && !!warehouseId;
  const canStep3 = lines.every((l) => l.product_id && l.qty > 0);

  const availabilityIssues = useMemo(() => {
    const issues: string[] = [];
    lines.forEach((line) => {
      const p = products.find((x) => x.id === line.product_id);
      const available = Number((p as any)?.available_stock ?? 0);
      if (line.product_id && line.qty > available) {
        issues.push(`${p?.title ?? line.product_id}: requested ${line.qty}, available ${available}`);
      }
    });
    return issues;
  }, [lines, products]);

  async function submit() {
    const token = getToken();
    if (!token || !clientId || !warehouseId || !canStep3 || availabilityIssues.length > 0) return;
    setSaving(true);
    try {
      await apiCreateBulkOrder(token, {
        client_id: clientId,
        warehouse_id: warehouseId,
        items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      });
      router.push('/orders/bulk-orders');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New Bulk Order"
        description="Step flow: client -> items -> review"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Bulk Orders', href: '/orders/bulk-orders' }, { label: 'New Order' }]}
      />

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => setStep(s as 1 | 2 | 3)} className={`h-8 rounded-md px-3 text-xs ${step === s ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface'}`}>
            Step {s}
          </button>
        ))}
      </div>

      {step === 1 && (
        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Select Client and Warehouse</h2>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
            <option value="">Select client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
            <option value="">Select warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
          <div className="flex gap-2">
            <Button size="sm" disabled={!canStep2} onClick={() => setStep(2)}>Next</Button>
            <Link href="/orders/bulk-orders"><Button size="sm" variant="outline">Cancel</Button></Link>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Add Products</h2>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <select value={line.product_id} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, product_id: e.target.value } : x))} className="col-span-8 h-9 rounded-md border border-border bg-surface px-3 text-sm">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.sku}) - avail {(p as any).available_stock ?? 0}</option>)}
              </select>
              <input type="number" min={1} value={line.qty} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))} className="col-span-3 h-9 rounded-md border border-border bg-surface px-3 text-sm" />
              <button onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))} className="col-span-1 h-9 rounded-md border border-border bg-surface text-xs">X</button>
            </div>
          ))}
          <button onClick={() => setLines((prev) => [...prev, { product_id: '', qty: 1 }])} className="h-8 rounded-md border border-border bg-surface px-3 text-xs w-fit">Add Line</button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button size="sm" disabled={!canStep3} onClick={() => setStep(3)}>Review</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Review</h2>
          <p className="text-xs text-muted-foreground">Client: {selectedClient?.name} | Warehouse: {selectedWarehouse?.name}</p>
          <ul className="text-sm">
            {lines.map((l, i) => {
              const p = products.find((x) => x.id === l.product_id);
              return <li key={i}>{p?.title ?? '-'} - qty {l.qty}</li>;
            })}
          </ul>
          {availabilityIssues.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {availabilityIssues.map((i) => <div key={i}>{i}</div>)}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button size="sm" disabled={saving || availabilityIssues.length > 0} onClick={submit}>{saving ? 'Creating...' : 'Create Order'}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
