import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';

const dispatchOrders = [
  { id: 'ORD-ST01-20260412-0005', type: 'store', dest: 'Store 01', items: '2× Samsung TV', packed: 'Apr 12, 11:00 AM' },
  { id: 'ORD-ST02-20260412-0006', type: 'store', dest: 'Store 02', items: '8× iPhone 15', packed: 'Apr 12, 10:45 AM' },
  { id: 'BULK-WH01-20260411-0004', type: 'bulk', dest: 'ElectroHub', items: '50× LG Monitor', packed: 'Apr 11, 4:00 PM' },
];

export default function DispatchQueuePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dispatch Queue"
        description="Packed orders ready for shipment"
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Dispatch Queue' }]}
      />

      <div className="flex items-center gap-2">
        <Badge variant="warning" dot>{dispatchOrders.length} orders ready to dispatch</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Packed At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispatchOrders.length === 0 ? (
              <TableEmpty colSpan={6}>No orders in dispatch queue.</TableEmpty>
            ) : (
              dispatchOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell>
                    <Badge variant={o.type === 'store' ? 'default' : 'primary'}>
                      {o.type === 'store' ? 'Store Order' : 'Bulk Order'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{o.dest}</TableCell>
                  <TableCell className="text-muted-foreground">{o.items}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.packed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm">Mark Dispatched</Button>
                      <Button size="sm" variant="ghost">Print Label</Button>
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
