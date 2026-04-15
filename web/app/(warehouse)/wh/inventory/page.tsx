import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { SearchIcon } from '../../../../components/layout/icons';

const inventory = [
  { sku: 'SKU-TV-001', name: 'Samsung 55" TV', available: 2, reserved: 5, total: 7 },
  { sku: 'SKU-MON-001', name: 'LG Monitor 23"', available: 15, reserved: 3, total: 18 },
  { sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', available: 1, reserved: 2, total: 3 },
  { sku: 'SKU-LAP-007', name: 'Dell XPS 15', available: 3, reserved: 0, total: 3 },
  { sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', available: 22, reserved: 8, total: 30 },
  { sku: 'SKU-AUD-004', name: 'Sony WH-1000XM5', available: 10, reserved: 0, total: 10 },
];

function stockBadge(available: number) {
  if (available === 0) return { label: 'Out', variant: 'destructive' as const };
  if (available <= 3) return { label: 'Low', variant: 'warning' as const };
  return { label: 'OK', variant: 'success' as const };
}

export default function WarehouseInventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventory"
        description="Warehouse WH01 stock levels"
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Inventory' }]}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input type="search" placeholder="Search product or SKU…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All stock levels</option>
          <option value="low">Low (≤ 3)</option>
          <option value="out">Out of Stock</option>
        </select>
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
              <TableHead className="text-right">History</TableHead>
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
                      <Button size="sm" variant="ghost">History</Button>
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
