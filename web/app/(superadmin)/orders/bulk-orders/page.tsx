'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../../components/layout/icons';
import { getToken } from '../../../../lib/auth';
import { apiBulkOrders } from '../../../../lib/api';
import type { BulkOrder } from '../../../../lib/api';

const statusLabels: Record<string, string> = {
  draft: 'Draft', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled',
};

export default function BulkOrdersPage() {
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiBulkOrders(token)
      .then(r => setBulkOrders(r.data))
      .catch(() => {/* keep empty list on error */})
      .finally(() => setLoading(false));
  }, []);

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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
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
              {bulkOrders.length === 0 ? (
                <TableEmpty colSpan={7}>No bulk orders yet.</TableEmpty>
              ) : (
                bulkOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
                    <TableCell className="font-medium">{o.client_name}</TableCell>
                    <TableCell>{o.warehouse}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusToBadgeVariant(o.status)} dot>
                        {statusLabels[o.status] ?? o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{o.created_at}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
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
