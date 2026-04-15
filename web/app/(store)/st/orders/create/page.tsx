import { PageHeader } from '../../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Badge } from '../../../../../components/ui/badge';
import { Input } from '../../../../../components/ui/input';
import { SearchIcon } from '../../../../../components/layout/icons';

const products = [
  { id: 'p1', sku: 'SKU-TV-001', name: 'Samsung 55" TV', brand: 'Samsung', warehouseStock: 2, status: 'low' },
  { id: 'p2', sku: 'SKU-MON-001', name: 'LG Monitor 23"', brand: 'LG', warehouseStock: 15, status: 'ok' },
  { id: 'p3', sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', brand: 'LG', warehouseStock: 1, status: 'low' },
  { id: 'p4', sku: 'SKU-LAP-007', name: 'Dell XPS 15', brand: 'Dell', warehouseStock: 3, status: 'ok' },
  { id: 'p5', sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', brand: 'Apple', warehouseStock: 22, status: 'ok' },
];

export default function CreateOrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create Order Request"
        description="Request items to be restocked from the warehouse"
        breadcrumb={[{ label: 'Dashboard', href: '/st/dashboard' }, { label: 'Orders', href: '/st/orders' }, { label: 'Create Request' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Product selector */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
              <div className="mt-2 relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
                <input type="search" placeholder="Search products…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ul className="divide-y divide-border">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.status === 'low' && <Badge variant="warning" className="text-[10px]">Low Stock</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.brand} · {p.sku}</p>
                      <p className="text-xs text-muted-foreground">Warehouse: {p.warehouseStock} available</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button aria-label="Decrease quantity" className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-muted transition-colors text-sm font-semibold">−</button>
                      <input type="number" min={0} max={p.warehouseStock} defaultValue={0} aria-label={`Quantity for ${p.name}`} className="w-12 h-7 rounded-md border border-border bg-surface text-center text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <button aria-label="Increase quantity" className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-muted transition-colors text-sm font-semibold">+</button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">WH01 - Main</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium">ST01 - Store 01</span>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">Selected items will appear here</p>
                <div className="rounded-md bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                  No items selected yet
                </div>
              </div>
              <div className="border-t border-border pt-3 flex flex-col gap-2">
                <Button className="w-full" disabled>Submit Request</Button>
                <a href="/st/orders">
                  <Button variant="outline" className="w-full">Cancel</Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Request will be sent for superadmin approval
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
