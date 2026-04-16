import { PageHeader } from '../../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { Textarea } from '../../../../../components/ui/textarea';

const clientOptions = [
  { value: 'c1', label: 'TechMart Retail' },
  { value: 'c2', label: 'ElectroHub' },
  { value: 'c3', label: 'GadgetWorld' },
];

const warehouseOptions = [
  { value: 'wh01', label: 'Main Warehouse (WH01)' },
  { value: 'wh02', label: 'North Warehouse (WH02)' },
];

const productOptions = [
  { value: 'p1', label: 'Samsung 55" TV (SKU-TV-001)' },
  { value: 'p2', label: 'LG Monitor 23" (SKU-MON-001)' },
  { value: 'p3', label: 'Dell XPS 15 (SKU-LAP-007)' },
  { value: 'p4', label: 'iPhone 15 Pro (SKU-PHN-012)' },
];

export default function CreateBulkOrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New Bulk Order"
        description="Create a bulk supply order for a third-party client"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Bulk Orders', href: '/orders/bulk-orders' },
          { label: 'New Order' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select label="Client" options={clientOptions} placeholder="Select a client" required />
              <Select label="Fulfilling Warehouse" options={warehouseOptions} required />
              <Textarea label="Dispatch Notes" placeholder="Optional notes for warehouse…" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Items</CardTitle>
                <Button size="sm" variant="outline">+ Add Item</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Select label={i === 1 ? 'Product' : undefined} options={productOptions} placeholder="Select product" />
                    </div>
                    <div className="w-24">
                      <Input label={i === 1 ? 'Qty' : undefined} type="number" min={1} defaultValue={1} />
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Remove item" className="mb-0.5 text-muted-foreground hover:text-destructive">
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium tabular-nums">2 lines</span>
              </div>
              <div className="border-t border-border pt-3 flex flex-col gap-2">
                <Button className="w-full">Create Order</Button>
                <a href="/orders/bulk-orders">
                  <Button variant="outline" className="w-full">Cancel</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
