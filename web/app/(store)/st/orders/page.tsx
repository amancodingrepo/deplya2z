'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Tabs } from '../../../../components/ui/tabs';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';
import { PlusIcon } from '../../../../components/layout/icons';

const allOrders = [
  { id: 'ORD-ST01-0001', items: '5× Samsung TV, 3× LG Monitor', status: 'dispatched', created: 'Apr 12, 10:30 AM' },
  { id: 'ORD-ST01-0008', items: '10× LG Fridge', status: 'confirmed', created: 'Apr 12, 8:00 AM' },
  { id: 'ORD-ST01-0009', items: '4× Dell XPS 15', status: 'packed', created: 'Apr 11, 5:00 PM' },
  { id: 'ORD-ST01-0010', items: '6× Sony Headphones', status: 'draft', created: 'Apr 11, 3:00 PM' },
  { id: 'ORD-ST01-0005', items: '2× Samsung TV', status: 'completed', created: 'Apr 10, 2:00 PM' },
  { id: 'ORD-ST01-0007', items: '8× iPhone 15', status: 'completed', created: 'Apr 9, 9:00 AM' },
  { id: 'ORD-ST01-0002', items: '1× Dell XPS 15', status: 'cancelled', created: 'Apr 8, 4:00 PM' },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Being Packed',
  dispatched: 'On the Way', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

type TabValue = 'active' | 'all' | 'completed';
type ModalState = { type: 'receive' | 'cancel'; orderId: string } | null;

const activeStatuses = ['draft', 'confirmed', 'packed', 'dispatched', 'store_received'];

export default function MyOrdersPage() {
  const [tab, setTab] = useState<TabValue>('active');
  const [modal, setModal] = useState<ModalState>(null);

  const activeCount = allOrders.filter(o => activeStatuses.includes(o.status)).length;
  const completedCount = allOrders.filter(o => ['completed', 'cancelled'].includes(o.status)).length;
  const dispatchedCount = allOrders.filter(o => o.status === 'dispatched').length;

  const filtered = allOrders.filter((o) => {
    if (tab === 'active') return activeStatuses.includes(o.status);
    if (tab === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/st/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">My Orders</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">My Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">All order requests from Store 01</p>
        </div>
        <Link href="/st/orders/create">
          <Button size="sm"><PlusIcon /> New Request</Button>
        </Link>
      </div>

      {/* Incoming banner */}
      {dispatchedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="primary" dot>{dispatchedCount} order on the way</Badge>
            <span className="text-[13px] text-foreground">Confirm receipt when items arrive</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'active', label: 'Active', count: activeCount },
          { value: 'completed', label: 'Completed', count: completedCount },
          { value: 'all', label: 'All Orders', count: allOrders.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={5}>
                No orders yet.{' '}
                <Link href="/st/orders/create" className="text-primary hover:underline">
                  Create your first request
                </Link>
              </TableEmpty>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-[12px] font-medium text-foreground">{o.id}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[240px] truncate">{o.items}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>{statusLabels[o.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {o.status === 'dispatched' && (
                        <Button size="sm" onClick={() => setModal({ type: 'receive', orderId: o.id })}>
                          Confirm Receipt
                        </Button>
                      )}
                      {o.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => setModal({ type: 'cancel', orderId: o.id })}>
                          Cancel
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">Details</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="text-[12px] text-muted-foreground">
        Showing {filtered.length} of {allOrders.length} orders
      </div>

      {/* Modals */}
      <Dialog
        open={modal?.type === 'receive'}
        onClose={() => setModal(null)}
        title="Confirm Receipt"
        description={`Confirm that all items in ${modal?.orderId} have been received and are in good condition.`}
        confirmLabel="Confirm Receipt"
        onConfirm={() => console.log('Received', modal?.orderId)}
      />
      <Dialog
        open={modal?.type === 'cancel'}
        onClose={() => setModal(null)}
        title="Cancel Order"
        description={`Cancel ${modal?.orderId}? This cannot be undone.`}
        confirmLabel="Cancel Order"
        confirmVariant="destructive"
        onConfirm={() => console.log('Cancelled', modal?.orderId)}
      />
    </div>
  );
}
