'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiClients, apiClientStatus } from '../../../lib/api';
import type { ClientStore } from '../../../lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiClients(token, { limit: 100 });
      setClients(res.data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleStatus(c: ClientStore) {
    const token = getToken();
    if (!token) return;
    setTogglingId(c.id);
    try {
      const newStatus = c.status === 'active' ? 'inactive' : 'active';
      await apiClientStatus(token, c.id, newStatus);
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
    } catch (e: any) {
      alert(e.message ?? 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.contact_email.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Third-party stores for bulk supply orders"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:bg-surface-raised transition-colors">↻ Refresh</button>
            <a href="/clients/create">
              <Button size="sm"><PlusIcon /> Add Client</Button>
            </a>
          </div>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input
            type="search"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={6}>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading…
                </div>
              </TableEmpty>
            ) : filtered.length === 0 ? (
              <TableEmpty colSpan={6}>No clients found.</TableEmpty>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(c.status)} dot>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`/clients/${c.id}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={togglingId === c.id}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {togglingId === c.id ? '…' : c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && (
          <div className="border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
            Showing {filtered.length} of {clients.length} clients
          </div>
        )}
      </Card>
    </div>
  );
}
