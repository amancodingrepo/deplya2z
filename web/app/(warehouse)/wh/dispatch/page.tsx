'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../../components/ui/table';

const dispatchOrders = [
  { id: 'ORD-ST01-0005', type: 'store', dest: 'Store 01', items: '2× Samsung TV', packed: 'Apr 12, 11:00 AM' },
  { id: 'ORD-ST02-0006', type: 'store', dest: 'Store 02', items: '8× iPhone 15', packed: 'Apr 12, 10:45 AM' },
  { id: 'BULK-0004', type: 'bulk', dest: 'ElectroHub', items: '50× LG Monitor', packed: 'Apr 11, 4:00 PM' },
];

type ModalState = { orderId: string; dest: string } | null;

export default function DispatchQueuePage() {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/wh/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Dispatch Queue</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Dispatch Queue</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Packed orders ready for shipment</p>
        </div>
        <Badge variant="success" dot>{dispatchOrders.length} ready to dispatch</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Packed At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispatchOrders.length === 0 ? (
              <TableEmpty colSpan={6}>No orders in dispatch queue.</TableEmpty>
            ) : (
              dispatchOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-[12px] font-medium">{o.id}</TableCell>
                  <TableCell>
                    <Badge variant={o.type === 'store' ? 'default' : 'primary'}>
                      {o.type === 'store' ? 'Store' : 'Bulk'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{o.dest}</TableCell>
                  <TableCell className="text-muted-foreground">{o.items}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{o.packed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => setModal({ orderId: o.id, dest: o.dest })}>
                        Dispatch
                      </Button>
                      <Button size="sm" variant="ghost">Print Label</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        title="Confirm Dispatch"
        description={`Dispatch ${modal?.orderId} to ${modal?.dest}? The recipient will be notified.`}
        confirmLabel="Dispatch"
        onConfirm={() => console.log('Dispatched', modal?.orderId)}
      />
    </div>
  );
}
