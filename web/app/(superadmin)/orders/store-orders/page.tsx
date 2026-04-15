'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Tabs } from '../../../../components/ui/tabs';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';

const allOrders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', warehouse: 'WH01', items: '5× Samsung TV, 3× LG Monitor', qty: 8, status: 'draft', created: 'Apr 12, 10:30 AM', by: 'Priya Sharma' },
  { id: 'ORD-ST03-0004', store: 'Store 03', warehouse: 'WH01', items: '1× MacBook Pro, 2× iPhone 15', qty: 3, status: 'draft', created: 'Apr 12, 9:00 AM', by: 'Meera Das' },
  { id: 'ORD-ST02-0007', store: 'Store 02', warehouse: 'WH01', items: '12× Sony Headphones', qty: 12, status: 'draft', created: 'Apr 12, 8:30 AM', by: 'Raj Patel' },
  { id: 'ORD-ST04-0009', store: 'Store 04', warehouse: 'WH02', items: '6× LG Fridge', qty: 6, status: 'draft', created: 'Apr 12, 7:15 AM', by: 'Anita Roy' },
  { id: 'ORD-ST02-0002', store: 'Store 02', warehouse: 'WH01', items: '2× LG Fridge', qty: 2, status: 'confirmed', created: 'Apr 12, 9:15 AM', by: 'Raj Patel' },
  { id: 'ORD-ST01-0005', store: 'Store 01', warehouse: 'WH01', items: '2× Samsung TV', qty: 2, status: 'packed', created: 'Apr 11, 2:00 PM', by: 'Priya Sharma' },
  { id: 'ORD-ST03-0006', store: 'Store 03', warehouse: 'WH01', items: '10× Sony Headphones', qty: 10, status: 'dispatched', created: 'Apr 11, 11:00 AM', by: 'Meera Das' },
  { id: 'ORD-ST02-0003', store: 'Store 02', warehouse: 'WH01', items: '1× MacBook Pro', qty: 1, status: 'store_received', created: 'Apr 10, 4:30 PM', by: 'Raj Patel' },
  { id: 'ORD-ST01-0007', store: 'Store 01', warehouse: 'WH01', items: '8× iPhone 15', qty: 8, status: 'completed', created: 'Apr 9, 9:00 AM', by: 'Priya Sharma' },
];

const statusLabels: Record<string, string> = {
  draft: 'Awaiting Approval', confirmed: 'Confirmed', packed: 'Packed',
  dispatched: 'Dispatched', store_received: 'Received', completed: 'Completed', cancelled: 'Cancelled',
};

type TabValue = 'all' | 'pending' | 'active' | 'completed';
type ModalState = { type: 'approve' | 'reject'; orderId: string } | null;

const draftCount = allOrders.filter(o => o.status === 'draft').length;
const activeCount = allOrders.filter(o => ['confirmed', 'packed', 'dispatched', 'store_received'].includes(o.status)).length;
const completedCount = allOrders.filter(o => ['completed', 'cancelled'].includes(o.status)).length;

export default function StoreOrdersPage() {
  const [tab, setTab] = useState<TabValue>('pending');
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = allOrders.filter((o) => {
    if (tab === 'pending') return o.status === 'draft';
    if (tab === 'active') return ['confirmed', 'packed', 'dispatched', 'store_received'].includes(o.status);
    if (tab === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>Orders<span className="mx-1.5">·</span>
            <span className="text-foreground">Store Orders</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Store Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Review and approve store refill requests</p>
        </div>
        {draftCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-2.5">
            <Badge variant="warning" dot>{draftCount} awaiting approval</Badge>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'all', label: 'All Orders', count: allOrders.length },
          { value: 'pending', label: 'Awaiting Approval', count: draftCount },
          { value: 'active', label: 'Active', count: activeCount },
          { value: 'completed', label: 'Completed', count: completedCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={7}>No orders in this category.</TableEmpty>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-[12px] font-medium text-foreground">{o.id}</TableCell>
                  <TableCell>{o.store}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate">{o.items}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.qty}</TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(o.status)} dot>{statusLabels[o.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[12px] whitespace-nowrap">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {o.status === 'draft' && (
                        <>
                          <Button size="sm" onClick={() => setModal({ type: 'approve', orderId: o.id })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setModal({ type: 'reject', orderId: o.id })}>
                            Reject
                          </Button>
                        </>
                      )}
                      {o.status !== 'draft' && (
                        <Button size="sm" variant="ghost">View</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Showing {filtered.length} of {allOrders.length} orders</span>
      </div>

      {/* Modals */}
      <Dialog
        open={modal?.type === 'approve'}
        onClose={() => setModal(null)}
        title="Approve Order"
        description={`Approve ${modal?.orderId}? The warehouse will be notified to start packing.`}
        confirmLabel="Approve"
        onConfirm={() => console.log('Approved', modal?.orderId)}
      />
      <Dialog
        open={modal?.type === 'reject'}
        onClose={() => setModal(null)}
        title="Reject Order"
        description={`Reject ${modal?.orderId}? The store manager will be notified.`}
        confirmLabel="Reject"
        confirmVariant="destructive"
        onConfirm={() => console.log('Rejected', modal?.orderId)}
      />
    </div>
  );
}
