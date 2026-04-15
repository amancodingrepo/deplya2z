import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { PlusIcon } from '../../../../components/layout/icons';

const orders = [
  { id: 'ORD-ST01-20260412-0001', items: '5× Samsung TV, 3× LG Monitor', status: 'dispatched', created: 'Apr 12, 10:30 AM' },
  { id: 'ORD-ST01-20260411-0005', items: '2× Samsung TV', status: 'completed', created: 'Apr 11, 2:00 PM' },
  { id: 'ORD-ST01-20260410-0003', items: '10× LG Fridge', status: 'draft', created: 'Apr 10, 9:00 AM' },
  { id: 'ORD-ST01-20260409-0007', items: '8× iPhone 15', status: 'completed', created: 'Apr 9, 9:00 AM' },
  { id: 'ORD-ST01-20260408-0002', items: '1× Dell XPS 15', status: 'cancelled', created: 'Apr 8, 4:00 PM' },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Warehouse Packing',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

export default function MyOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Orders"
        description="All order requests from Store 01"
        breadcrumb={[{ label: 'Dashboard', href: '/st/dashboard' }, { label: 'My Orders' }]}
        actions={
          <a href="/st/orders/create">
            <Button size="sm"><PlusIcon /> New Request</Button>
          </a>
        }
      />

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {['All', 'Active', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'All' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dispatched banner */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary-subtle px-4 py-3">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-primary">1 order</span> is on the way — confirm receipt when items arrive
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={5}>No orders yet. <a href="/st/orders/create" className="text-primary hover:underline">Create your first request</a>.</TableEmpty>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell className="text-muted-foreground">{o.items}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {statusLabels[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {o.status === 'dispatched' && (
                        <Button size="sm">Confirm Receipt</Button>
                      )}
                      {o.status === 'draft' && (
                        <Button size="sm" variant="destructive">Cancel</Button>
                      )}
                      <Button size="sm" variant="ghost">Details</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
