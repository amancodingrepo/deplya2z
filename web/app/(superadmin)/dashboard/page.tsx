import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import {
  BoxIcon, ClipboardIcon, TruckIcon, ExclamationIcon,
} from '../../../components/layout/icons';

const recentOrders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', items: '5× Samsung TV, 3× LG Monitor', status: 'confirmed', time: '10 min ago' },
  { id: 'ORD-ST02-0002', store: 'Store 02', items: '2× LG Fridge', status: 'packed', time: '34 min ago' },
  { id: 'ORD-ST01-0003', store: 'Store 01', items: '10× Sony Headphones', status: 'dispatched', time: '1 hr ago' },
  { id: 'ORD-ST03-0004', store: 'Store 03', items: '1× MacBook Pro', status: 'store_received', time: '2 hr ago' },
  { id: 'ORD-ST02-0005', store: 'Store 02', items: '8× iPhone 15', status: 'draft', time: '3 hr ago' },
];

const lowStock = [
  { sku: 'SKU-TV-001', name: 'Samsung 55" TV', location: 'WH01', available: 2 },
  { sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', location: 'WH01', available: 1 },
  { sku: 'SKU-LAP-007', name: 'Dell XPS 15', location: 'WH01', available: 3 },
];

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  packed: 'Packed',
  dispatched: 'Dispatched',
  store_received: 'Received',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function SuperadminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="System-wide overview for today"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Products" value="284" icon={<BoxIcon />} change="+12 this month" changeType="positive" />
        <StatCard label="Pending Orders" value="4" icon={<ClipboardIcon />} change="Needs approval" changeType="neutral" />
        <StatCard label="Dispatched Today" value="7" icon={<TruckIcon />} change="+2 vs yesterday" changeType="positive" />
        <StatCard label="Low Stock Alerts" value="3" icon={<ExclamationIcon />} change="Action required" changeType="negative" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Store Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{order.id}</p>
                    <p className="truncate text-xs text-muted-foreground">{order.store} · {order.items}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={statusToBadgeVariant(order.status)} dot>
                      {statusLabels[order.status]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{order.time}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-3">
              <a href="/orders/store-orders" className="text-xs font-medium text-primary hover:underline">
                View all orders →
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <ul className="divide-y divide-border">
              {lowStock.map((item) => (
                <li key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku} · {item.location}</p>
                  </div>
                  <Badge variant="destructive" dot className="flex-shrink-0">
                    {item.available} left
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-3">
              <a href="/inventory" className="text-xs font-medium text-primary hover:underline">
                View inventory →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
