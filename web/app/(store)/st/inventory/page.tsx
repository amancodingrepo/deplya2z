import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { SearchIcon } from '../../../../components/layout/icons';

const inventory = [
  { sku: 'SKU-TV-001', name: 'Samsung 55" TV', available: 3, reserved: 1, total: 4 },
  { sku: 'SKU-MON-001', name: 'LG Monitor 23"', available: 1, reserved: 0, total: 1 },
  { sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', available: 5, reserved: 0, total: 5 },
  { sku: 'SKU-AUD-004', name: 'Sony WH-1000XM5', available: 0, reserved: 0, total: 0 },
  { sku: 'SKU-LAP-007', name: 'Dell XPS 15', available: 2, reserved: 1, total: 3 },
];

function stockBadge(available: number) {
  if (available === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
  if (available <= 2) return { label: 'Low Stock', variant: 'warning' as const };
  return { label: 'In Stock', variant: 'success' as const };
}

export default function StoreInventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description="Stock levels at Store 01 (ST01)"
        breadcrumb={[{ label: 'Dashboard', href: '/st/dashboard' }, { label: 'Inventory' }]}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input type="search" placeholder="Search product or SKU…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableEmpty colSpan={7}>No inventory found.</TableEmpty>
            ) : (
              inventory.map((item) => {
                const { label, variant } = stockBadge(item.available);
                return (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{item.available}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.reserved}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{item.total}</TableCell>
                    <TableCell><Badge variant={variant} dot>{label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <a href="/st/orders/create">
                          <Button size="sm" variant="outline">Request More</Button>
                        </a>
                        <Button size="sm" variant="ghost">History</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
