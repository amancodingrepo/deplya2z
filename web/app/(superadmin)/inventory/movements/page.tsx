import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';

const movements = [
  { id: '1', product: 'Samsung 55" TV', from: 'WH01', to: 'ST01', qty: 5, type: 'order_issued', ref: 'ORD-ST01-0001', actor: 'Sam Park', date: 'Apr 12, 10:45 AM' },
  { id: '2', product: 'LG Monitor 23"', from: 'WH01', to: 'ST01', qty: 3, type: 'order_issued', ref: 'ORD-ST01-0001', actor: 'Sam Park', date: 'Apr 12, 10:45 AM' },
  { id: '3', product: 'LG Fridge', from: null, to: 'WH01', qty: 20, type: 'manual_adjustment', ref: 'MANUAL', actor: 'Alex Johnson', date: 'Apr 11, 3:00 PM' },
  { id: '4', product: 'iPhone 15 Pro', from: 'WH01', to: 'ST02', qty: 8, type: 'order_issued', ref: 'ORD-ST02-0002', actor: 'Sam Park', date: 'Apr 11, 1:30 PM' },
  { id: '5', product: 'Dell XPS 15', from: 'WH01', to: 'ST03', qty: 2, type: 'transfer', ref: 'TRANS-001', actor: 'Alex Johnson', date: 'Apr 10, 9:00 AM' },
];

const typeLabels: Record<string, string> = {
  order_reserved: 'Reserved', order_deducted: 'Deducted', order_issued: 'Issued',
  transfer: 'Transfer', manual_adjustment: 'Manual Adj.',
};

const typeVariants: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  order_reserved: 'warning', order_deducted: 'default', order_issued: 'success',
  transfer: 'primary', manual_adjustment: 'default',
};

export default function MovementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stock Movements"
        description="Immutable log of all inventory changes"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory', href: '/inventory' }, { label: 'Movements' }]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>Today</option>
          <option>Custom range</option>
        </select>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All locations</option>
          <option>WH01</option>
          <option>ST01</option>
          <option>ST02</option>
        </select>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All types</option>
          <option value="order_issued">Issued</option>
          <option value="transfer">Transfer</option>
          <option value="manual_adjustment">Manual</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableEmpty colSpan={8}>No movements found.</TableEmpty>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.product}</TableCell>
                  <TableCell className="text-muted-foreground">{m.from ?? '—'}</TableCell>
                  <TableCell>{m.to}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">+{m.qty}</TableCell>
                  <TableCell><Badge variant={typeVariants[m.type]}>{typeLabels[m.type]}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.ref}</TableCell>
                  <TableCell>{m.actor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.date}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
