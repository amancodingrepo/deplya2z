'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../../../components/ui/card';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { Tabs } from '../../../../../components/ui/tabs';
import { Dialog } from '../../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../../components/ui/table';

const orders = [
  { id: 'ORD-ST01-0001', store: 'Store 01', items: '5× Samsung TV, 3× LG Monitor', qty: 8, approved: 'Alex Johnson', created: 'Apr 12, 10:30 AM', priority: 'high' },
  { id: 'ORD-ST02-0002', store: 'Store 02', items: '2× LG Fridge', qty: 2, approved: 'Alex Johnson', created: 'Apr 12, 9:15 AM', priority: 'normal' },
  { id: 'ORD-ST03-0006', store: 'Store 03', items: '10× Sony Headphones', qty: 10, approved: 'Alex Johnson', created: 'Apr 11, 11:00 AM', priority: 'normal' },
  { id: 'ORD-ST01-0007', store: 'Store 01', items: '1× MacBook Pro', qty: 1, approved: 'Alex Johnson', created: 'Apr 11, 10:00 AM', priority: 'normal' },
  { id: 'ORD-ST02-0004', store: 'Store 02', items: '4× Dell XPS 15', qty: 4, approved: 'Alex Johnson', created: 'Apr 10, 3:00 PM', priority: 'normal' },
];

type TabValue = 'store' | 'bulk';
type ModalState = { orderId: string } | null;

export default function PendingOrdersPage() {
  const [tab, setTab] = useState<TabValue>('store');
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/wh/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Pending Orders</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Pending Orders</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Confirmed orders ready to pack — WH01</p>
        </div>
        <Badge variant="warning" dot>{orders.length} to pack</Badge>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'store', label: 'Store Orders', count: orders.length },
          { value: 'bulk', label: 'Bulk Orders', count: 2 },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'store' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-[12px] font-medium">
                    <div className="flex items-center gap-2">
                      {o.id}
                      {o.priority === 'high' && <Badge variant="destructive" dot>Priority</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{o.store}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate">{o.items}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.qty}</TableCell>
                  <TableCell className="text-muted-foreground text-[12px]">{o.approved}</TableCell>
                  <TableCell className="text-muted-foreground text-[12px] whitespace-nowrap">{o.created}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setModal({ orderId: o.id })}>
                      Mark Packed
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'bulk' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-[12px] font-medium">BULK-0001</TableCell>
                <TableCell>Metro Retail Chain</TableCell>
                <TableCell className="text-muted-foreground">50× Samsung TV</TableCell>
                <TableCell className="text-right tabular-nums">50</TableCell>
                <TableCell className="text-muted-foreground text-[12px]">Apr 12, 9:00 AM</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => setModal({ orderId: 'BULK-0001' })}>
                    Mark Packed
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-[12px] font-medium">BULK-0002</TableCell>
                <TableCell>TechMart India</TableCell>
                <TableCell className="text-muted-foreground">200× iPhone 15</TableCell>
                <TableCell className="text-right tabular-nums">200</TableCell>
                <TableCell className="text-muted-foreground text-[12px]">Apr 11, 3:00 PM</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => setModal({ orderId: 'BULK-0002' })}>
                    Mark Packed
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal */}
      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        title="Mark Order as Packed"
        description={`Confirm that all items in ${modal?.orderId} have been packed and are ready for dispatch.`}
        confirmLabel="Mark Packed"
        onConfirm={() => console.log('Packed', modal?.orderId)}
      />
    </div>
  );
}
