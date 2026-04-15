import { PageHeader } from '../../../../../components/ui/page-header';
import { Card } from '../../../../../components/ui/card';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../../components/ui/table';

const bulkOrders = [
  { id: 'BULK-WH01-20260412-0007', client: 'TechMart Retail', items: '20× Samsung TV', reserved: 20, created: 'Apr 12, 8:00 AM' },
  { id: 'BULK-WH01-20260411-0005', client: 'ElectroHub', items: '50× LG Monitor, 10× Dell XPS', reserved: 60, created: 'Apr 11, 2:00 PM' },
];

export default function BulkOrdersWarehousePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk Orders"
        description="Third-party bulk orders confirmed for packing"
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Orders' }, { label: 'Bulk' }]}
      />

      <div className="flex items-center gap-2">
        <Badge variant="primary" dot>{bulkOrders.length} bulk orders to pack</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulkOrders.length === 0 ? (
              <TableEmpty colSpan={6}>No bulk orders pending.</TableEmpty>
            ) : (
              bulkOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.client}</TableCell>
                  <TableCell className="text-muted-foreground">{o.items}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.reserved}</TableCell>
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
