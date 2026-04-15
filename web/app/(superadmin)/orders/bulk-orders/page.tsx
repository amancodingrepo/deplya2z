import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../../components/layout/icons';

const bulkOrders = [
  { id: 'BULK-WH01-20260412-0007', client: 'TechMart Retail', warehouse: 'WH01', items: '20× Samsung TV', status: 'confirmed', created: 'Apr 12, 8:00 AM' },
  { id: 'BULK-WH01-20260411-0005', client: 'ElectroHub', warehouse: 'WH01', items: '50× LG Monitor, 10× Dell XPS', status: 'packed', created: 'Apr 11, 2:00 PM' },
  { id: 'BULK-WH01-20260410-0003', client: 'GadgetWorld', warehouse: 'WH01', items: '30× iPhone 15', status: 'dispatched', created: 'Apr 10, 10:00 AM' },
  { id: 'BULK-WH01-20260409-0001', client: 'TechMart Retail', warehouse: 'WH01', items: '15× Sony Headphones', status: 'completed', created: 'Apr 9, 9:00 AM' },
];

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmed', packed: 'Packed', dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled',
};

export default function BulkOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk Orders"
        description="Manage third-party bulk supply orders"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Orders' }, { label: 'Bulk Orders' }]}
        actions={
          <a href="/orders/bulk-orders/create">
            <Button size="sm"><PlusIcon /> New Bulk Order</Button>
          </a>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input type="search" placeholder="Search by order ID or client…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulkOrders.length === 0 ? (
              <TableEmpty colSpan={7}>No bulk orders yet.</TableEmpty>
            ) : (
              bulkOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.client}</TableCell>
                  <TableCell>{o.warehouse}</TableCell>
                  <TableCell className="text-muted-foreground">{o.items}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {statusLabels[o.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost">View</Button>
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
