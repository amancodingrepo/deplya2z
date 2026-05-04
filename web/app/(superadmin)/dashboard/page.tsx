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
import { apiDashboard, apiOrders, apiInventoryLowStock, apiAuditLog, apiApproveOrder, apiRejectOrder } from '../../../lib/api';
import type { StoreOrder, LowStockAlert } from '../../../lib/api';

/* ─── Relative time helper ───────────────────────── */
const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

/* ─── Types ──────────────────────────────────────── */
interface PendingApproval {
  id: string;
  store: string;
  warehouse: string;
  items: string;
  units: number;
  time: string;
  by: string;
}

interface LowStockItem {
  sku: string;
  name: string;
  warehouse: string;
  available: number;
  threshold: number;
}

interface ActivityItem {
  id: string;
  actor: string;
  initials: string;
  role: string;
  action: string;
  entity: string;
  time: string;
  type: string;
}

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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [dashData, setDashData] = useState<Record<string, unknown> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const approving = pendingApprovals.find(o => o.id === approvingId);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    let cancelled = false;

    Promise.allSettled([
      apiDashboard(token),
      apiOrders(token, { status: 'confirmed', limit: 5 }),
      apiInventoryLowStock(token),
      apiAuditLog(token, { limit: 7 }),
    ]).then(([dash, orders, ls, audit]) => {
      if (cancelled) return;

      if (dash.status === 'fulfilled') {
        setDashData(dash.value.data);
      }

      if (orders.status === 'fulfilled') {
        const mapped: PendingApproval[] = orders.value.data.map((o: StoreOrder) => ({
          id: o.id,
          store: o.store,
          warehouse: o.warehouse,
          items: o.items.map(i => `${i.qty}× ${i.name}`).join(', '),
          units: o.items.reduce((s, i) => s + i.qty, 0),
          time: timeAgo(o.created),
          by: o.by,
        }));
        setPendingApprovals(mapped);
      }

      if (ls.status === 'fulfilled') {
        const mapped: LowStockItem[] = ls.value.data.map((item: LowStockAlert) => ({
          sku: item.sku,
          name: item.product_title,
          warehouse: item.location_code,
          available: item.available,
          threshold: item.threshold,
        }));
        setLowStock(mapped);
      }

      if (audit.status === 'fulfilled') {
        const mapped: ActivityItem[] = audit.value.data.map((row: Record<string, unknown>) => {
          const actorName = String(row.actor_name ?? '');
          const initials = actorName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n: string) => n[0].toUpperCase())
            .join('');
          const action = String(row.action ?? '');
          const type = action.includes('dispatch') ? 'dispatch'
            : action.includes('approve') ? 'approve'
            : action.includes('receive') ? 'receive'
            : action.includes('stock') ? 'stock'
            : 'order';
          return {
            id: String(row.id ?? ''),
            actor: actorName,
            initials,
            role: String(row.actor_role ?? ''),
            action,
            entity: String(row.entity_id ?? ''),
            time: row.created_at ? timeAgo(String(row.created_at)) : '—',
            type,
          };
        });
        setRecentActivity(mapped);
      }

      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const kpi = dashData?.kpi as Record<string, number> | undefined;
  const pendingApprovalsCount = kpi?.pending_approvals ?? pendingApprovals.length;
  const lowStockCount = kpi?.low_stock_items ?? lowStock.length;
  const dispatchedToday = kpi?.dispatched_today ?? 0;
  const activeStores = kpi?.active_stores ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">{greeting} 👋</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {pendingApprovalsCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-[12px] font-semibold text-destructive">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            {pendingApprovalsCount} items need attention
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label="Pending Approvals" value={String(pendingApprovalsCount)} sub="↑ 2 from yesterday" accent="bg-primary/10 text-primary" icon={<ClipboardIcon />} href="/orders/store-orders" />
        <KPICard label="Low Stock Items" value={String(lowStockCount)} sub="1 item out of stock" accent="bg-destructive/10 text-destructive" icon={<ExclamationIcon />} href="/inventory" />
        <KPICard label="Dispatched Today" value={String(dispatchedToday)} sub="↑ 3 from yesterday" accent="bg-success/10 text-success" icon={<TruckIcon />} />
        <KPICard label="Active Stores" value={String(activeStores)} sub="All operational" accent="bg-muted text-muted-foreground" icon={<BoxIcon />} href="/locations" />
      </div>

      {/* Pending approvals table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Awaiting Your Approval</CardTitle>
            <Link href="/orders/store-orders" className="text-[12px] text-primary hover:underline">View all orders →</Link>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
          ) : pendingApprovals.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No orders awaiting approval</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Order ID', 'Store', 'Items', 'Time', ''].map(h => (
                      <th key={h} className={`px-5 pb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${h === '' ? 'text-right' : 'text-left'} ${h === 'Items' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((o, i) => (
                    <tr key={o.id} className={`border-b border-border last:border-0 hover:bg-surface-raised transition-colors ${i < 2 ? 'bg-primary-subtle/40' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="font-mono font-semibold text-foreground text-[12px]">{o.id}</p>
                        <p className="text-[11px] text-muted-foreground">{o.by}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{o.store}</td>
                      <td className="px-5 py-3 text-muted-foreground hidden md:table-cell max-w-[200px]">
                        <p className="truncate">{o.items}</p>
                        <p className="text-[11px]">{o.units} units</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{o.time}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" className="h-7 px-3 text-[11px]" onClick={() => setApprovingId(o.id)}>
                            Approve
                          </Button>
                          <Link href="/orders/store-orders">
                            <Button size="sm" variant="outline" className="h-7 px-3 text-[11px]">View</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
            {loading ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
            ) : lowStock.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">All stock levels look good</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                    <th className="px-3 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Available</th>
                    <th className="px-3 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-[13px] text-muted-foreground animate-pulse">Loading…</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-center text-[13px] text-muted-foreground">No recent activity</p>
            ) : (
              <ol className="space-y-3">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <ActivityDot type={a.type} />
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
            )}
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
