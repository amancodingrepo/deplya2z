'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../../components/layout/icons';
import { getToken } from '../../../../lib/auth';
import { apiBulkOrders, apiCancelBulkOrder } from '../../../../lib/api';
import type { BulkOrder } from '../../../../lib/api';

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  packed: 'Packed',
  dispatched: 'Dispatched',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function BulkOrdersPage() {
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cancelTarget, setCancelTarget] = useState<BulkOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadOrders = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await apiBulkOrders(token, { status: status || undefined, limit: 200 });
      setOrders(r.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function onCancel() {
    if (!cancelTarget || !cancelReason.trim()) return;
    const token = getToken();
    if (!token) return;
    setCancelling(true);
    try {
      await apiCancelBulkOrder(token, cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason('');
      await loadOrders();
    } finally {
      setCancelling(false);
    }
  }

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return o.id.toLowerCase().includes(q) || o.client_name.toLowerCase().includes(q);
      }),
    [orders, search],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bulk Orders"
        description="Manage third-party bulk supply orders"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Orders' }, { label: 'Bulk Orders' }]}
        actions={
          <Link href="/orders/bulk-orders/create">
            <Button size="sm"><PlusIcon /> New Bulk Order</Button>
          </Link>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or client..."
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={7}>{loading ? 'Loading...' : 'No bulk orders found.'}</TableEmpty>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                  <TableCell className="font-medium">{o.client_name}</TableCell>
                  <TableCell>{o.warehouse}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>
                      {statusLabels[o.status] ?? o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.created_at}</TableCell>
                  <TableCell className="text-right">
                    {['confirmed', 'packed'].includes(o.status) ? (
                      <Button size="sm" variant="outline" onClick={() => setCancelTarget(o)}>Cancel</Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>View</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={cancelTarget !== null}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        title={`Cancel ${cancelTarget?.id ?? ''}`}
        description="Reason is required. Reserved stock will be released."
        confirmLabel={cancelling ? 'Cancelling...' : 'Cancel Order'}
        confirmVariant="destructive"
        onConfirm={onCancel}
      >
        <div className="pt-2">
          <label className="block text-[12px] font-medium text-foreground mb-1.5">Reason <span className="text-destructive">*</span></label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            placeholder="Enter cancellation reason..."
          />
        </div>
      </Dialog>
    </div>
  );
}
