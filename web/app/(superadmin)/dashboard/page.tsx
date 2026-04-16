import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  BoxIcon, ClipboardIcon, TruckIcon, ExclamationIcon, UsersIcon,
} from '../../../components/layout/icons';

function StatCard({ label, value, sub, icon, variant = 'default' }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const iconBg = variant === 'danger'
    ? 'bg-destructive/10 text-destructive'
    : variant === 'warning'
    ? 'bg-warning/10 text-warning'
    : 'bg-primary/10 text-primary';
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <div className={`flex size-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground leading-tight">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

const awaitingApproval = [
  { id: 'ORD-ST01-0001', store: 'Store 01', items: '5× Samsung TV, 3× LG Monitor', total: '₹84,500', time: '10 min ago' },
  { id: 'ORD-ST03-0004', store: 'Store 03', items: '1× MacBook Pro, 2× iPhone 15', total: '₹2,10,000', time: '25 min ago' },
  { id: 'ORD-ST02-0007', store: 'Store 02', items: '12× Sony Headphones', total: '₹36,000', time: '1 hr ago' },
  { id: 'ORD-ST04-0009', store: 'Store 04', items: '6× LG Fridge', total: '₹1,50,000', time: '2 hr ago' },
];

const lowStock = [
  { sku: 'SKU-TV-001', name: 'Samsung 55" TV', warehouse: 'WH01', available: 2, reorderQty: 20 },
  { sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', warehouse: 'WH01', available: 1, reorderQty: 10 },
  { sku: 'SKU-LAP-007', name: 'Dell XPS 15', warehouse: 'WH02', available: 3, reorderQty: 15 },
];

const recentActivity = [
  { id: 'ORD-ST01-0003', action: 'Dispatched to Store 01', time: '1 hr ago', status: 'dispatched' },
  { id: 'ORD-ST02-0002', action: 'Packed at WH01', time: '2 hr ago', status: 'packed' },
  { id: 'ORD-ST01-0005', action: 'Completed — Store 01 received', time: '3 hr ago', status: 'completed' },
  { id: 'ORD-ST03-0006', action: 'Confirmed by superadmin', time: '4 hr ago', status: 'confirmed' },
];

export default function SuperadminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">System-wide overview · Today</p>
        </div>
        <Link href="/orders/store-orders">
          <Button size="sm">View All Orders</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Products" value="284" sub="+12 this month" icon={<BoxIcon />} />
        <StatCard label="Awaiting Approval" value="4" sub="Orders to review" icon={<ClipboardIcon />} variant="warning" />
        <StatCard label="Dispatched Today" value="7" sub="+2 vs yesterday" icon={<TruckIcon />} />
        <StatCard label="Low Stock Alerts" value="3" sub="Needs restocking" icon={<ExclamationIcon />} variant="danger" />
      </div>

      {/* Action Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Action Queue</CardTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">Orders awaiting your approval</p>
            </div>
            <Badge variant="warning" dot>4 pending</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {awaitingApproval.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground">{o.id}</span>
                    <span className="text-[12px] text-muted-foreground">·</span>
                    <span className="text-[12px] text-muted-foreground">{o.store}</span>
                    <Badge variant="warning" dot>Awaiting Approval</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{o.items}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[13px] font-semibold text-foreground">{o.total}</span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{o.time}</span>
                  <Link href="/orders/store-orders">
                    <Button size="sm" variant="outline">Review</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link href="/orders/store-orders" className="text-[12px] font-medium text-primary hover:underline">
              View all orders →
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {lowStock.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.sku} · {item.warehouse}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="destructive" dot>{item.available} left</Badge>
                    <Link href="/inventory">
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3">
              <Link href="/inventory" className="text-[12px] font-medium text-primary hover:underline">
                View inventory →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{item.id}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{item.action}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={statusToBadgeVariant(item.status)} dot>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
