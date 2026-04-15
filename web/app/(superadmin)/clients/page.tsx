import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';

const clients = [
  { id: '1', name: 'TechMart Retail', owner: 'Arun Mehta', email: 'arun@techmart.com', phone: '+91 98001 11222', orders: 12, status: 'active' },
  { id: '2', name: 'ElectroHub', owner: 'Sunil Verma', email: 'sunil@electrohub.com', phone: '+91 99001 22333', orders: 8, status: 'active' },
  { id: '3', name: 'GadgetWorld', owner: 'Naina Singh', email: 'naina@gadgetworld.com', phone: '+91 97001 33444', orders: 5, status: 'active' },
  { id: '4', name: 'Digital Bazaar', owner: null, email: 'info@digitalbazaar.in', phone: '+91 96001 44555', orders: 0, status: 'inactive' },
];

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Third-party stores for bulk supply orders"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]}
        actions={
          <a href="/clients/create">
            <Button size="sm"><PlusIcon /> Add Client</Button>
          </a>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input type="search" placeholder="Search clients…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableEmpty colSpan={7}>No clients found.</TableEmpty>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.owner ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.orders}</TableCell>
                  <TableCell><Badge variant={statusToBadgeVariant(c.status)} dot>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`/clients/${c.id}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
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
