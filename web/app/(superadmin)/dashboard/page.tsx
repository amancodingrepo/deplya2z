'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { OrdersBarChart } from '../../../components/charts/orders-bar-chart';
import { InventoryDonutChart } from '../../../components/charts/inventory-donut-chart';
import {
  BoxIcon, ClipboardIcon, TruckIcon, ExclamationIcon,
} from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiDashboard, apiApproveOrder, apiRejectOrder, apiOrders, apiInventoryLowStock, apiAuditLog } from '../../../lib/api';
import type { StoreOrder } from '../../../lib/api';

/* ─── Mock data ─────────────────────────────────── */
const pendingApprovals = [
  { id: 'ORD-ST01-0001', store: 'Store 01', warehouse: 'WH01', items: '5× Samsung TV, 3× LG Monitor', units: 8, time: '10 min ago', by: 'Priya Sharma' },
  { id: 'ORD-ST03-0004', store: 'Store 03', warehouse: 'WH01', items: '1× MacBook Pro, 2× iPhone 15', units: 3, time: '25 min ago', by: 'Meera Das' },
  { id: 'ORD-ST02-0007', store: 'Store 02', warehouse: 'WH01', items: '12× Sony Headphones', units: 12, time: '1 hr ago', by: 'Raj Patel' },
  { id: 'ORD-ST04-0009', store: 'Store 04', warehouse: 'WH02', items: '6× LG Fridge', units: 6, time: '2 hr ago', by: 'Anita Roy' },
  { id: 'ORD-ST02-0012', store: 'Store 02', warehouse: 'WH01', items: '4× Dell XPS 15', units: 4, time: '3 hr ago', by: 'Raj Patel' },
];

const lowStock = [
  { sku: 'SKU-TV-001', name: 'Samsung 55" TV', warehouse: 'WH01', available: 2, threshold: 5 },
  { sku: 'SKU-FRG-003', name: 'LG Fridge 23cu', warehouse: 'WH01', available: 1, threshold: 5 },
  { sku: 'SKU-LAP-007', name: 'Dell XPS 15', warehouse: 'WH02', available: 3, threshold: 8 },
  { sku: 'SKU-PHN-012', name: 'iPhone 15 Pro', warehouse: 'WH01', available: 0, threshold: 10 },
];

const recentActivity = [
  { id: 'A1', actor: 'Priya Sharma', initials: 'PS', role: 'Store Mgr', action: 'Submitted order request', entity: 'ORD-ST01-0001', time: '3 min ago', type: 'order' },
  { id: 'A2', actor: 'Sam Park', initials: 'SP', role: 'WH Mgr', action: 'Marked order dispatched', entity: 'ORD-ST02-0002', time: '12 min ago', type: 'dispatch' },
  { id: 'A3', actor: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'Approved order', entity: 'ORD-ST03-0006', time: '35 min ago', type: 'approve' },
  { id: 'A4', actor: 'Sam Park', initials: 'SP', role: 'WH Mgr', action: 'Packed order', entity: 'ORD-ST01-0005', time: '1 hr ago', type: 'pack' },
  { id: 'A5', actor: 'Meera Das', initials: 'MD', role: 'Store Mgr', action: 'Confirmed receipt', entity: 'ORD-ST03-0003', time: '2 hr ago', type: 'receive' },
  { id: 'A6', actor: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'Stock adjusted +10 units', entity: 'Samsung 55" TV', time: '3 hr ago', type: 'stock' },
  { id: 'A7', actor: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'New user created', entity: 'Anita Roy (ST04)', time: '5 hr ago', type: 'user' },
];

/* ─── Components ─────────────────────────────────── */
function KPICard({ label, value, sub, icon, accent, href }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accent: string; href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-4 p-5">
      <div className={`flex size-11 flex-shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-[12px] font-medium text-foreground leading-tight">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
  return (
    <div className="rounded-xl border border-border bg-surface shadow-xs hover:border-border-strong transition-colors">
      {href ? <Link href={href}>{inner}</Link> : inner}
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const c = type === 'approve' ? 'bg-primary' : type === 'dispatch' ? 'bg-warning' : type === 'receive' ? 'bg-success'
    : type === 'stock' ? 'bg-purple-500' : 'bg-muted-foreground';
  return <span className={`mt-1.5 size-2 flex-shrink-0 rounded-full ${c}`} />;
}

export default function SuperadminDashboard() {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const approving = pendingApprovals.find(o => o.id === approvingId);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [dashData, setDashData] = useState<Record<string, unknown> | null>(null);
  const [pendingOrders, setPendingOrders] = useState<StoreOrder[]>([]);
  const [lowStockLive, setLowStockLive] = useState<Array<{ sku: string; product_title: string; location_code: string; available: number; threshold: number }>>([]);
  const [activity, setActivity] = useState<Array<{ id: string; actor: string; action: string; entity: string; time: string; role?: string; type?: string }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    Promise.allSettled([
      apiDashboard(token),
      apiOrders(token, { status: 'draft', limit: 20 }),
      apiInventoryLowStock(token),
      apiAuditLog(token, { limit: 20 }),
    ]).then((results) => {
      if (cancelled) return;
      if (results[0].status === 'fulfilled') setDashData(results[0].value.data);
      if (results[1].status === 'fulfilled') setPendingOrders(results[1].value.data);
      if (results[2].status === 'fulfilled') {
        setLowStockLive(
          results[2].value.data.map((x) => ({
            sku: x.sku,
            product_title: x.product_title,
            location_code: x.location_code,
            available: x.available,
            threshold: x.threshold,
          })),
        );
      }
      if (results[3].status === 'fulfilled') {
        setActivity(
          results[3].value.data.map((row: any, idx: number) => ({
            id: row.id ?? String(idx),
            actor: row.actor_name ?? row.actor ?? 'System',
            action: row.action ?? 'updated',
            entity: row.entity_type && row.entity_id ? `${row.entity_type}:${row.entity_id}` : (row.entity_type ?? '-'),
            time: row.created_at ?? '',
            role: row.actor_role ?? '',
            type: row.entity_type ?? '',
          })),
        );
      }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const kpi = dashData?.kpi as Record<string, number> | undefined;
  const pendingSource = pendingOrders.length > 0 ? pendingOrders.map((o) => ({
    id: o.id, store: o.store, warehouse: o.warehouse, items: o.items.map((i) => `${i.qty}x ${i.name}`).join(', '), units: o.items.reduce((s, i) => s + i.qty, 0), time: o.created, by: o.by,
  })) : pendingApprovals;
  const lowStockSource = lowStockLive.length > 0
    ? lowStockLive.map((x) => ({ sku: x.sku, name: x.product_title, warehouse: x.location_code, available: x.available, threshold: x.threshold }))
    : lowStock;
  const activitySource = activity.length > 0 ? activity : recentActivity;
  const pendingApprovalsCount = kpi?.pending_approvals ?? pendingSource.length;
  const lowStockCount = kpi?.low_stock_items ?? lowStockSource.length;
  const dispatchedToday = kpi?.dispatched_today ?? 7;
  const activeStores = kpi?.active_stores ?? 5;

   return (
     <div className="flex flex-col gap-6">
       {/* Greeting */}
       <div className="flex items-start justify-between gap-4 flex-wrap">
         <div>
           <h1 className="text-[22px] font-bold text-foreground">{greeting}, Alex 👋</h1>
           <p className="mt-0.5 text-[13px] text-muted-foreground">
             {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </p>
         </div>
       </div>

       {/* KPI cards */}
       <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
         <KPICard label="Low Stock Items" value={String(lowStockCount)} sub="1 item out of stock" accent="bg-destructive/10 text-destructive" icon={<ExclamationIcon />} href="/inventory" />
         <KPICard label="Dispatched Today" value={String(dispatchedToday)} sub="↑ 3 from yesterday" accent="bg-success/10 text-success" icon={<TruckIcon />} />
         <KPICard label="Active Stores" value={String(activeStores)} sub="All operational" accent="bg-muted text-muted-foreground" icon={<BoxIcon />} href="/locations" />
       </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Orders This Week</CardTitle></CardHeader>
          <CardContent className="pt-0"><OrdersBarChart /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Inventory Health</CardTitle></CardHeader>
          <CardContent className="pt-0"><InventoryDonutChart /></CardContent>
        </Card>
      </div>

      {/* Low stock + activity feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock Alerts</CardTitle>
              <Link href="/inventory" className="text-[12px] text-primary hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                  <th className="px-3 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Available</th>
                  <th className="px-3 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockSource.map((item) => (
                  <tr key={item.sku} className="border-b border-border last:border-0 hover:bg-surface-raised">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{item.sku} · {item.warehouse}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold tabular-nums text-[14px] ${item.available === 0 ? 'text-destructive' : 'text-warning'}`}>{item.available}</span>
                      <span className="text-[11px] text-muted-foreground">/{item.threshold}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href="/inventory"><Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">Adjust</Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {activitySource.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <ActivityDot type={a.type ?? ''} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-foreground leading-snug">
                      <span className="font-semibold">{a.actor}</span>
                      {' '}<span className="text-muted-foreground">{a.action}</span>
                      {' '}<span className="font-mono text-[12px] text-primary">{a.entity}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.role} · {a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Approve confirm modal */}
      <Dialog
        open={!!approvingId}
        onClose={() => setApprovingId(null)}
        title={`Approve ${approving?.id ?? ''}?`}
        description={`${approving?.items} — ${approving?.units} units from ${approving?.store}. Warehouse: ${approving?.warehouse}`}
        confirmLabel="Confirm Approval"
        confirmVariant="primary"
        onConfirm={async () => {
          if (approvingId) {
            const token = getToken();
            if (token) {
              try {
                await apiApproveOrder(token, approvingId);
                setRefreshKey(k => k + 1);
              } catch { /* ignore — UI stays consistent */ }
            }
          }
          setApprovingId(null);
        }}
      />
    </div>
  );
}
