import { PageHeader } from '../../../../components/ui/page-header';
import { StatCard } from '../../../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { LayersIcon, ClipboardIcon, ExclamationIcon, PlusIcon } from '../../../../components/layout/icons';

const myOrders = [
  { id: 'ORD-ST01-0001', items: '5× Samsung TV, 3× LG Monitor', status: 'dispatched', time: '1 hr ago' },
  { id: 'ORD-ST01-0005', items: '2× Samsung TV', status: 'completed', time: '2 days ago' },
  { id: 'ORD-ST01-0008', items: '10× LG Fridge', status: 'draft', time: '3 hr ago' },
];

const lowStock = [
  { name: 'LG Monitor 23"', sku: 'SKU-MON-001', available: 1 },
  { name: 'Dell XPS 15', sku: 'SKU-LAP-007', available: 0 },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

export default function StoreDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Store 01 (ST01) — Your inventory overview"
        actions={
          <a href="/st/orders/create">
            <Button size="sm"><PlusIcon /> Request Items</Button>
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Items In Stock" value="12" icon={<LayersIcon />} change="Across 6 products" changeType="neutral" />
        <StatCard label="Active Orders" value="2" icon={<ClipboardIcon />} change="1 on the way" changeType="neutral" />
        <StatCard label="Low Stock" value="2" icon={<ExclamationIcon />} change="Request more" changeType="negative" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* My Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Orders</CardTitle>
              <a href="/st/orders" className="text-xs font-medium text-primary hover:underline">View all</a>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ul className="divide-y divide-border">
              {myOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.id}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.items}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={statusToBadgeVariant(o.status)} dot>{statusLabels[o.status]}</Badge>
                    {o.status === 'dispatched' && (
                      <Button size="sm" variant="outline" className="text-xs h-7">Confirm Receipt</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock</CardTitle>
              <a href="/st/inventory" className="text-xs font-medium text-primary hover:underline">View inventory</a>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ul className="divide-y divide-border">
              {lowStock.map((item) => (
                <li key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={item.available === 0 ? 'destructive' : 'warning'} dot>
                      {item.available === 0 ? 'Out' : `${item.available} left`}
                    </Badge>
                    <a href="/st/orders/create">
                      <Button size="sm" variant="outline" className="h-7 text-xs">Request</Button>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
