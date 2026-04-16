import { PageHeader } from '../../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const auditLogs = [
  { actor: 'Alex Johnson', action: 'ORDER_APPROVED', entity: 'ORD-ST01-0001', ip: '192.168.1.10', time: 'Apr 12, 10:31 AM', success: true },
  { actor: 'Sam Park', action: 'ORDER_DISPATCHED', entity: 'ORD-ST02-0002', ip: '192.168.1.11', time: 'Apr 12, 9:45 AM', success: true },
  { actor: 'Priya Sharma', action: 'ORDER_CREATED', entity: 'ORD-ST01-0003', ip: '192.168.1.12', time: 'Apr 12, 9:10 AM', success: true },
  { actor: 'Unknown', action: 'LOGIN_FAILED', entity: 'unknown@a2z.com', ip: '203.0.113.42', time: 'Apr 12, 8:55 AM', success: false },
  { actor: 'Alex Johnson', action: 'USER_CREATED', entity: 'Meera Das', ip: '192.168.1.10', time: 'Apr 11, 5:00 PM', success: true },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports & Audit"
        description="Analytics, audit logs, and system activity"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]}
        actions={
          <Button variant="outline" size="sm">Export CSV</Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Orders This Month', value: '48' },
          { label: 'Items Dispatched', value: '312' },
          { label: 'Stock Movements', value: '124' },
          { label: 'Active Users', value: '4' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Report links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Inventory Report', desc: 'Current stock levels across all locations', href: '/inventory' },
          { title: 'Order Fulfillment', desc: 'Order cycle times and completion rates', href: '#' },
          { title: 'Stock Movements', desc: 'All movements with actors and timestamps', href: '/inventory/movements' },
          { title: 'Low Stock Report', desc: 'Products below threshold at any location', href: '/inventory' },
          { title: 'User Activity', desc: 'Login history and user actions', href: '#' },
          { title: 'Bulk Order Summary', desc: 'Third-party orders and dispatch status', href: '/orders/bulk-orders' },
        ].map((r) => (
          <a key={r.title} href={r.href} className="group rounded-lg border border-border bg-surface p-4 hover:border-primary/50 hover:bg-primary-subtle transition-colors">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary">{r.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
          </a>
        ))}
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Log</CardTitle>
            <select className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ul className="divide-y divide-border">
            {auditLogs.map((log, idx) => (
              <li key={idx} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{log.actor}</span>
                    <Badge variant={log.success ? 'default' : 'destructive'} className="text-[10px]">
                      {log.action}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.entity} · IP {log.ip}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-muted-foreground">{log.time}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-5 py-3">
            <Button variant="ghost" size="sm" className="text-primary">Load more</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
