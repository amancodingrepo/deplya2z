'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../../../components/ui/table';
import { OrdersLineChart } from '../../../../components/charts/orders-line-chart';
import { TopProductsChart } from '../../../../components/charts/top-products-chart';
import { OrdersByStoreChart } from '../../../../components/charts/orders-by-store-chart';
import { InventoryAreaChart } from '../../../../components/charts/inventory-area-chart';
import { StatusDonutChart } from '../../../../components/charts/status-donut-chart';
import { InventoryDonutChart } from '../../../../components/charts/inventory-donut-chart';
import type { OrdersLineDatum } from '../../../../components/charts/orders-line-chart';
import type { TopProductDatum } from '../../../../components/charts/top-products-chart';
import type { OrdersByStoreDatum } from '../../../../components/charts/orders-by-store-chart';
import type { InvAreaDatum } from '../../../../components/charts/inventory-area-chart';
import type { StatusDatum } from '../../../../components/charts/status-donut-chart';
import type { InvDonutDatum } from '../../../../components/charts/inventory-donut-chart';
import { cn } from '../../../../lib/cn';
import { getToken } from '../../../../lib/auth';
import { apiAnalytics, apiInventoryMovements, apiInventory } from '../../../../lib/api';

type DateRange = 'today' | '7d' | '30d' | 'month';

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  confirmed: '#3B82F6',
  packed: '#F59E0B',
  dispatched: '#F97316',
  store_received: '#8B5CF6',
  completed: '#10B981',
  cancelled: '#EF4444',
};

function dateRangeFor(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  let from: string;
  switch (range) {
    case 'today': from = to; break;
    case '7d':    from = new Date(Date.now() - 7  * 86400000).toISOString().split('T')[0]; break;
    case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
    default:      from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  }
  return { from, to };
}

function fmtDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface AnalyticsCharts {
  lineData:    OrdersLineDatum[];
  topProducts: TopProductDatum[];
  byStore:     OrdersByStoreDatum[];
  areaData:    InvAreaDatum[];
  statusData:  StatusDatum[];
  invDonut:    InvDonutDatum[];
  summary:     { total_orders: number; completed_orders: number; cancelled_orders: number; active_stores: number };
}

export default function AnalyticsPage() {
  const [activeRange, setActiveRange] = useState<DateRange>('30d');
  const [charts, setCharts] = useState<AnalyticsCharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    setLoading(true);
    const { from, to } = dateRangeFor(activeRange);

    Promise.allSettled([
      apiAnalytics(token, { date_from: from, date_to: to }),
      apiInventoryMovements(token, { limit: 500 }),
      apiInventory(token, { limit: 500 }),
    ]).then(([analyticsRes, movementsRes, inventoryRes]) => {
      /* ── orders_over_time + bulk_order_trend → line & bar ── */
      let lineData: OrdersLineDatum[] = [];
      let topProducts: TopProductDatum[] = [];
      let byStore: OrdersByStoreDatum[] = [];
      let statusData: StatusDatum[] = [];
      let summary = { total_orders: 0, completed_orders: 0, cancelled_orders: 0, active_stores: 0 };

      if (analyticsRes.status === 'fulfilled') {
        const d = analyticsRes.value.data as Record<string, unknown>;
        const chartData = d.charts as Record<string, unknown[]> | undefined;
        const summaryRaw = d.summary as Record<string, unknown> | undefined;

        if (summaryRaw) {
          summary = {
            total_orders:    Number(summaryRaw.total_orders    ?? 0),
            completed_orders: Number(summaryRaw.completed_orders ?? 0),
            cancelled_orders: Number(summaryRaw.cancelled_orders ?? 0),
            active_stores:   Number(summaryRaw.active_stores   ?? 0),
          };
        }

        /* orders over time — one row per (date, status) */
        const storeByDay = new Map<string, number>();
        if (chartData?.orders_over_time) {
          for (const row of chartData.orders_over_time as { date: string; order_count: string }[]) {
            const d = row.date.split('T')[0];
            storeByDay.set(d, (storeByDay.get(d) ?? 0) + Number(row.order_count));
          }
        }

        /* bulk order trend */
        const bulkByDay = new Map<string, number>();
        if (chartData?.bulk_order_trend) {
          for (const row of chartData.bulk_order_trend as { date: string; count: string }[]) {
            const d = row.date.split('T')[0];
            bulkByDay.set(d, Number(row.count));
          }
        }

        const allDates = [...new Set([...storeByDay.keys(), ...bulkByDay.keys()])].sort();
        lineData = allDates.map(iso => ({
          day:   fmtDay(iso),
          store: storeByDay.get(iso) ?? 0,
          bulk:  bulkByDay.get(iso) ?? 0,
        }));

        /* top products */
        if (chartData?.top_products) {
          topProducts = (chartData.top_products as { title: string; total_qty: string }[])
            .slice(0, 10)
            .map(p => ({
              name:  p.title.length > 22 ? p.title.slice(0, 20) + '…' : p.title,
              units: Number(p.total_qty),
            }));
        }

        /* orders by store */
        if (chartData?.orders_by_store) {
          byStore = (chartData.orders_by_store as { location_code: string; order_count: string }[])
            .map(s => ({ store: s.location_code, orders: Number(s.order_count) }));
        }

        /* status distribution */
        if (chartData?.orders_by_status) {
          statusData = (chartData.orders_by_status as { status: string; count: string }[]).map(s => ({
            name:  s.status.charAt(0).toUpperCase() + s.status.slice(1).replace('_', ' '),
            value: Number(s.count),
            color: STATUS_COLORS[s.status] ?? '#94A3B8',
          }));
        }
      }

      /* ── inventory movements → area chart ── */
      let areaData: InvAreaDatum[] = [];
      if (movementsRes.status === 'fulfilled') {
        const byDay = new Map<string, { stockIn: number; reserved: number; issued: number }>();
        for (const m of movementsRes.value.data) {
          const day = (m.created_at as string).split('T')[0];
          const entry = byDay.get(day) ?? { stockIn: 0, reserved: 0, issued: 0 };
          if (m.type === 'add' || m.type === 'transfer_in') entry.stockIn += m.quantity;
          else if (m.type === 'order_reserve')               entry.reserved += m.quantity;
          else if (m.type === 'order_release' || m.type === 'transfer_out') entry.issued += m.quantity;
          byDay.set(day, entry);
        }
        areaData = [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([iso, v]) => ({ day: fmtDay(iso), ...v }));
      }

      /* ── inventory health → donut ── */
      let invDonut: InvDonutDatum[] = [];
      if (inventoryRes.status === 'fulfilled') {
        let inStock = 0, lowStock = 0, outOfStock = 0;
        for (const row of inventoryRes.value.data) {
          if (row.available <= 0)              outOfStock++;
          else if (row.available <= row.threshold) lowStock++;
          else                                    inStock++;
        }
        invDonut = [
          { name: 'In Stock',     value: inStock,    color: '#10B981' },
          { name: 'Low Stock',    value: lowStock,   color: '#F59E0B' },
          { name: 'Out of Stock', value: outOfStock, color: '#EF4444' },
        ];
      }

      setCharts({ lineData, topProducts, byStore, areaData, statusData, invDonut, summary });
      setLoading(false);
    });
  }, [activeRange]);

  function handleExportCSV() {
    if (!charts) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Orders',     String(charts.summary.total_orders)],
      ['Completed Orders', String(charts.summary.completed_orders)],
      ['Cancelled Orders', String(charts.summary.cancelled_orders)],
      ['Active Stores',    String(charts.summary.active_stores)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'analytics-summary.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const s = charts?.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Charts and performance metrics across orders and inventory"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/reports' },
          { label: 'Analytics' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!charts}>
            Export CSV
          </Button>
        }
      />

      {/* Date range selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {DATE_RANGES.map((range) => (
          <button
            key={range.id}
            onClick={() => setActiveRange(range.id)}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-3 h-8 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              activeRange === range.id
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-transparent text-foreground hover:bg-muted',
            )}
          >
            {range.label}
          </button>
        ))}
        {loading && <span className="text-xs text-muted-foreground animate-pulse ml-2">Loading…</span>}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Orders Over Time</CardTitle></CardHeader>
          <CardContent className="pt-0"><OrdersLineChart data={charts?.lineData} /></CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top Products Ordered</CardTitle></CardHeader>
          <CardContent className="pt-0"><TopProductsChart data={charts?.topProducts} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders by Store</CardTitle></CardHeader>
          <CardContent className="pt-0"><OrdersByStoreChart data={charts?.byStore} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inventory Turnover</CardTitle></CardHeader>
          <CardContent className="pt-0"><InventoryAreaChart data={charts?.areaData} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Order Status Distribution</CardTitle></CardHeader>
          <CardContent className="pt-0"><StatusDonutChart data={charts?.statusData} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Inventory Health</CardTitle></CardHeader>
          <CardContent className="pt-0"><InventoryDonutChart data={charts?.invDonut} /></CardContent>
        </Card>
      </div>

      {/* Summary stats table */}
      <Card>
        <CardHeader><CardTitle>Summary Statistics</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <tr className="border-b border-border">
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8 animate-pulse">Loading…</TableCell>
                </TableRow>
              ) : s ? (
                <>
                  <TableRow><TableCell className="font-medium">Total Orders</TableCell>     <TableCell className="tabular-nums font-semibold">{s.total_orders}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">Completed Orders</TableCell> <TableCell className="tabular-nums font-semibold text-success">{s.completed_orders}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">Cancelled Orders</TableCell> <TableCell className="tabular-nums font-semibold text-destructive">{s.cancelled_orders}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">Active Stores</TableCell>    <TableCell className="tabular-nums font-semibold">{s.active_stores}</TableCell></TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">No data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
