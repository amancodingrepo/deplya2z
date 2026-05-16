'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiClients } from '../../../lib/api';
import type { ClientStore } from '../../../lib/api';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiClients(token)
      .then(r => setClients(r.data))
      .catch(() => {/* keep empty list on error */})
      .finally(() => setLoading(false));
  }, []);

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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
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
              {clients.length === 0 ? (
                <TableEmpty colSpan={6}>No clients found.</TableEmpty>
              ) : (
                clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.contact_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.contact_email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.contact_phone ?? '—'}</TableCell>
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
        )}
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
