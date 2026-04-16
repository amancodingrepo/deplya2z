import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon } from '../../../components/layout/icons';

const locations = [
  { code: 'WH01', name: 'Main Warehouse', type: 'warehouse', address: '12 Industrial Area, Delhi', users: 2, status: 'active' },
  { code: 'WH02', name: 'North Warehouse', type: 'warehouse', address: '45 Sector 18, Noida', users: 1, status: 'active' },
  { code: 'ST01', name: 'Store 01', type: 'store', address: 'Shop 3, CP Mall, Delhi', users: 1, status: 'active' },
  { code: 'ST02', name: 'Store 02', type: 'store', address: '78 MG Road, Gurgaon', users: 1, status: 'active' },
  { code: 'ST03', name: 'Store 03', type: 'store', address: '22 Park Street, Kolkata', users: 1, status: 'inactive' },
];

export default function LocationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locations"
        description="Manage warehouses and stores"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Locations' }]}
        actions={
          <a href="/locations/create">
            <Button size="sm"><PlusIcon /> Add Location</Button>
          </a>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Locations', value: 5 },
          { label: 'Warehouses', value: 2 },
          { label: 'Stores', value: 3 },
          { label: 'Active', value: 4 },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableEmpty colSpan={7}>No locations found.</TableEmpty>
            ) : (
              locations.map((l) => (
                <TableRow key={l.code}>
                  <TableCell className="font-mono text-xs font-semibold">{l.code}</TableCell>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>
                    <Badge variant={l.type === 'warehouse' ? 'primary' : 'default'}>
                      {l.type === 'warehouse' ? 'Warehouse' : 'Store'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.address}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.users}</TableCell>
                  <TableCell><Badge variant={statusToBadgeVariant(l.status)} dot>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <a href={`/locations/${l.code}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
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
