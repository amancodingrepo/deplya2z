import { PageHeader } from '../../../../components/ui/page-header';
import { StatCard } from '../../../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { ClipboardIcon, TruckIcon, ExclamationIcon, ShoppingCartIcon } from '../../../../components/layout/icons';

const pendingOrders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', items: '5× Samsung TV, 3× LG Monitor', status: 'confirmed' },
  { id: 'ORD-ST02-0002', store: 'Store 02', items: '2× LG Fridge', status: 'confirmed' },
  { id: 'ORD-ST03-0003', store: 'Store 03', items: '10× Sony Headphones', status: 'confirmed' },
];

const dispatchQueue = [
  { id: 'ORD-ST01-0005', store: 'Store 01', items: '2× Samsung TV', status: 'packed' },
  { id: 'ORD-ST02-0006', store: 'Store 02', items: '8× iPhone 15', status: 'packed' },
];

const lowStock = [
  { name: 'Samsung 55" TV', sku: 'SKU-TV-001', available: 2 },
  { name: 'LG Fridge 23cu', sku: 'SKU-FRG-003', available: 1 },
];

export default function WarehouseDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Warehouse Main Hub — WH01" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending Orders" value="5" icon={<ClipboardIcon />} change="2 store · 3 bulk" changeType="neutral" />
        <StatCard label="Bulk Orders" value="2" icon={<ShoppingCartIcon />} change="Ready to pack" changeType="neutral" />
        <StatCard label="Dispatch Queue" value="2" icon={<TruckIcon />} change="Ready to ship" changeType="positive" />
        <StatCard label="Low Stock" value="2" icon={<ExclamationIcon />} change="Action needed" changeType="negative" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Store Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Store Orders</CardTitle>
              <a href="/wh/orders/pending" className="text-xs font-medium text-primary hover:underline">View all</a>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ul className="divide-y divide-border">
              {pendingOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.id}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.store} · {o.items}</p>
                  </div>
                  <Button size="sm" variant="outline" className="flex-shrink-0">Mark Packed</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Dispatch Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Dispatch Queue</CardTitle>
                <a href="/wh/dispatch" className="text-xs font-medium text-primary hover:underline">View all</a>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ul className="divide-y divide-border">
                {dispatchQueue.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.id}</p>
                      <p className="truncate text-xs text-muted-foreground">{o.store} · {o.items}</p>
                    </div>
                    <Button size="sm" className="flex-shrink-0">Dispatch</Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
            <CardContent className="px-0 pb-0">
              <ul className="divide-y divide-border">
                {lowStock.map((item) => (
                  <li key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <Badge variant="destructive" dot>{item.available} left</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
