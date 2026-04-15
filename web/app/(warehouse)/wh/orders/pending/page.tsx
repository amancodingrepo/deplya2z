import { PageHeader } from '../../../../../components/ui/page-header';
import { Card } from '../../../../../components/ui/card';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../../components/ui/table';

const orders = [
  { id: 'ORD-ST01-20260412-0001', store: 'Store 01', items: '5× Samsung TV, 3× LG Monitor', reserved: 8, created: 'Apr 12, 10:30 AM', approvedBy: 'Alex Johnson' },
  { id: 'ORD-ST02-20260412-0002', store: 'Store 02', items: '2× LG Fridge', reserved: 2, created: 'Apr 12, 9:15 AM', approvedBy: 'Alex Johnson' },
  { id: 'ORD-ST03-20260411-0006', store: 'Store 03', items: '10× Sony Headphones', reserved: 10, created: 'Apr 11, 11:00 AM', approvedBy: 'Alex Johnson' },
  { id: 'ORD-ST01-20260411-0007', store: 'Store 01', items: '1× MacBook Pro', reserved: 1, created: 'Apr 11, 10:00 AM', approvedBy: 'Alex Johnson' },
  { id: 'ORD-ST02-20260410-0004', store: 'Store 02', items: '4× Dell XPS 15', reserved: 4, created: 'Apr 10, 3:00 PM', approvedBy: 'Alex Johnson' },
];

export default function PendingOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pending Orders"
        description="Store orders confirmed and ready to pack"
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Orders' }, { label: 'Pending' }]}
      />

      <div className="flex items-center gap-2">
        <Badge variant="primary" dot>{orders.length} orders to pack</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableEmpty colSpan={7}>No pending orders. All caught up!</TableEmpty>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell>{o.store}</TableCell>
                  <TableCell className="text-muted-foreground">{o.items}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.reserved}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.approvedBy}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm">Mark Packed</Button>
                      <Button size="sm" variant="ghost">View</Button>
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
