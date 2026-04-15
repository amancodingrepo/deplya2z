import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { SearchIcon } from '../../../../components/layout/icons';

const orders = [
  { id: 'ORD-ST01-20260412-0001', store: 'Store 01', warehouse: 'WH01', items: '5× Samsung TV, 3× LG Monitor', reserved: 8, status: 'draft', created: 'Apr 12, 10:30 AM', createdBy: 'Priya Sharma' },
  { id: 'ORD-ST02-20260412-0002', store: 'Store 02', warehouse: 'WH01', items: '2× LG Fridge', reserved: 2, status: 'confirmed', created: 'Apr 12, 9:15 AM', createdBy: 'Raj Patel' },
  { id: 'ORD-ST01-20260411-0005', store: 'Store 01', warehouse: 'WH01', items: '2× Samsung TV', reserved: 2, status: 'packed', created: 'Apr 11, 2:00 PM', createdBy: 'Priya Sharma' },
  { id: 'ORD-ST03-20260411-0006', store: 'Store 03', warehouse: 'WH01', items: '10× Sony Headphones', reserved: 10, status: 'dispatched', created: 'Apr 11, 11:00 AM', createdBy: 'Meera Das' },
  { id: 'ORD-ST02-20260410-0003', store: 'Store 02', warehouse: 'WH01', items: '1× MacBook Pro', reserved: 1, status: 'store_received', created: 'Apr 10, 4:30 PM', createdBy: 'Raj Patel' },
  { id: 'ORD-ST01-20260409-0007', store: 'Store 01', warehouse: 'WH01', items: '8× iPhone 15', reserved: 8, status: 'completed', created: 'Apr 9, 9:00 AM', createdBy: 'Priya Sharma' },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'Dispatched', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

export default function StoreOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Store Orders"
        description="Review and approve store refill requests"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Orders' }, { label: 'Store Orders' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input type="search" placeholder="Search by order ID or store…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All statuses</option>
          <option value="draft">Awaiting Approval</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Pending approval banner */}
      <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          <span className="font-semibold text-warning-foreground dark:text-warning">1 order</span> awaiting your approval
        </p>
        <Button size="sm" variant="outline">Review Drafts</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={7}>No orders found.</TableEmpty>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell>{o.store}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{o.items}</TableCell>
                  <TableCell className="tabular-nums">{o.reserved}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {statusLabels[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {o.status === 'draft' && (
                        <Button size="sm" variant="primary">Approve</Button>
                      )}
                      <Button size="sm" variant="ghost">View</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 6 of 6 orders</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
