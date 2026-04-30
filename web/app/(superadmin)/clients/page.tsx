'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiClients, apiClientStatus, apiBulkOrders } from '../../../lib/api';
import type { ClientStore, BulkOrder } from '../../../lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientStore[]>([]);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [historyClient, setHistoryClient] = useState<ClientStore | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [res, bulk] = await Promise.all([
        apiClients(token, { limit: 100 }),
        apiBulkOrders(token, { limit: 500 }),
      ]);
      setClients(res.data);
      setBulkOrders(bulk.data ?? []);
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
      const newStatus = c.status === 'active' ? 'blocked' : 'active';
      await apiClientStatus(token, c.id, newStatus);
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
    } catch (e: any) {
      alert(e.message ?? 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  function statsForClient(c: ClientStore) {
    const orders = bulkOrders.filter((o) => o.client_name === c.name);
    const units = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);
    return { orders: orders.length, units, history: orders };
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
            <button onClick={load} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:bg-surface-raised transition-colors">Refresh</button>
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
            placeholder="Search clients..."
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
          <option value="blocked">Blocked</option>
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
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={8}>Loading...</TableEmpty>
            ) : filtered.length === 0 ? (
              <TableEmpty colSpan={8}>No clients found.</TableEmpty>
            ) : (
              filtered.map((c) => {
                const stats = statsForClient(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.contact_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.contact_email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.contact_phone ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{stats.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{stats.units}</TableCell>
                    <TableCell>
                      <Badge variant={statusToBadgeVariant(c.status)} dot>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setHistoryClient(c)} className="text-xs font-medium text-primary hover:underline">History</button>
                        <a href={`/clients/${c.id}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          disabled={togglingId === c.id}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          {togglingId === c.id ? '...' : c.status === 'active' ? 'Block' : 'Activate'}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={historyClient !== null}
        onClose={() => setHistoryClient(null)}
        title={`Bulk Order History - ${historyClient?.name ?? ''}`}
        confirmLabel="Close"
        confirmVariant="primary"
        onConfirm={() => setHistoryClient(null)}
      >
        <div className="pt-2 max-h-[420px] overflow-y-auto">
          {historyClient && statsForClient(historyClient).history.length === 0 && (
            <p className="text-sm text-muted-foreground">No bulk orders for this client.</p>
          )}
          {historyClient && statsForClient(historyClient).history.map((o) => (
            <div key={o.id} className="rounded-md border border-border p-3 mb-2">
              <p className="font-mono text-xs text-primary">{o.id}</p>
              <p className="text-xs text-muted-foreground">{o.status} | {o.created_at}</p>
              <p className="text-sm">{o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}</p>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
