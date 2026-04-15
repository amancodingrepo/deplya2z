import { PageHeader } from '../../../components/ui/page-header';
import { Button } from '../../../components/ui/button';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';

const products = [
  { id: '1', sku: 'SKU-TV-001', title: 'Samsung 55" QLED TV', brand: 'Samsung', category: 'Electronics', model: 'QN55Q80C', status: 'present' },
  { id: '2', sku: 'SKU-MON-001', title: 'LG 23" Monitor', brand: 'LG', category: 'Monitors', model: '23MK430H', status: 'present' },
  { id: '3', sku: 'SKU-FRG-003', title: 'LG French Door Fridge', brand: 'LG', category: 'Appliances', model: 'LRMVS3006S', status: 'present' },
  { id: '4', sku: 'SKU-LAP-007', title: 'Dell XPS 15', brand: 'Dell', category: 'Laptops', model: 'XPS-9530', status: 'present' },
  { id: '5', sku: 'SKU-PHN-012', title: 'iPhone 15 Pro', brand: 'Apple', category: 'Phones', model: 'A3101', status: 'inactive' },
  { id: '6', sku: 'SKU-AUD-004', title: 'Sony WH-1000XM5', brand: 'Sony', category: 'Audio', model: 'WH1000XM5', status: 'present' },
  { id: '7', sku: 'SKU-TAB-002', title: 'iPad Air 5th Gen', brand: 'Apple', category: 'Tablets', model: 'MM9D3LL', status: 'discontinued' },
];

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Manage your product catalogue"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Products' }]}
        actions={
          <a href="/products/create">
            <Button size="sm">
              <PlusIcon /> Add Product
            </Button>
          </a>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search products…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All categories</option>
          <option>Electronics</option>
          <option>Appliances</option>
          <option>Laptops</option>
          <option>Phones</option>
          <option>Audio</option>
          <option>Monitors</option>
          <option>Tablets</option>
        </select>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All statuses</option>
          <option value="present">Active</option>
          <option value="inactive">Inactive</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableEmpty colSpan={7}>No products found.</TableEmpty>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell className="text-muted-foreground">{p.model}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(p.status)} dot>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <a href={`/products/${p.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                      Edit
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing 7 of 284 products</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
