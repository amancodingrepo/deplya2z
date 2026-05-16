'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiLocations } from '../../../lib/api';
import type { Location } from '../../../lib/api';

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiLocations(token)
      .then(r => setLocations(r.data))
      .catch(() => {/* keep empty list on error */})
      .finally(() => setLoading(false));
  }, []);

  const total = locations.length;
  const warehouses = locations.filter(l => l.type === 'warehouse').length;
  const stores = locations.filter(l => l.type === 'store').length;
  const active = locations.filter(l => l.status === 'active').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locations"
        description="Manage warehouses and stores"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Locations' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:bg-surface-raised transition-colors">↻ Refresh</button>
            <a href="/locations/create">
              <Button size="sm"><PlusIcon /> Add Location</Button>
            </a>
          </div>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Locations', value: total },
          { label: 'Warehouses', value: warehouses },
          { label: 'Stores', value: stores },
          { label: 'Active', value: active },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{loading ? '…' : s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableEmpty colSpan={6}>No locations found.</TableEmpty>
              ) : (
                locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs font-semibold">{l.code}</TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>
                      <Badge variant={l.type === 'warehouse' ? 'primary' : 'default'}>
                        {l.type === 'warehouse' ? 'Warehouse' : 'Store'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.address ?? '—'}</TableCell>
                    <TableCell><Badge variant={statusToBadgeVariant(l.status)} dot>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</Badge></TableCell>
                    <TableCell className="text-right">
                      <a href={`/locations/${l.id}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
