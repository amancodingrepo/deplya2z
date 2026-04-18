'use client';

import { useState } from 'react';
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
import { cn } from '../../../../lib/cn';

type DateRange = 'today' | '7d' | '30d' | 'month';

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
];

const summaryStats = [
  { metric: 'Total Orders', value: '156', change: '+12%', direction: 'up', label: '↑' },
  { metric: 'Units Dispatched', value: '1,243', change: '+8%', direction: 'up', label: '↑' },
  { metric: 'Avg Fulfillment Time', value: '4.2 hrs', change: '-0.5 hrs', direction: 'up', label: '↓' },
  { metric: 'Pending Approvals', value: '5', change: '—', direction: 'neutral', label: '' },
  { metric: 'Cancelled Orders', value: '4', change: '-2%', direction: 'down', label: '↓' },
  { metric: 'Active Products', value: '45', change: '+3', direction: 'up', label: '↑' },
];

export default function AnalyticsPage() {
  const [activeRange, setActiveRange] = useState<DateRange>('30d');

  function handleExportCSV() {
    const rows = [
      ['Metric', 'Value', 'Change'],
      ...summaryStats.map((s) => [s.metric, s.value, s.change + ' ' + s.label]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
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
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Orders Over Time — full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <OrdersLineChart />
          </CardContent>
        </Card>

        {/* Top Products Ordered — full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Products Ordered</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopProductsChart />
          </CardContent>
        </Card>

        {/* Orders by Store */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Store</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <OrdersByStoreChart />
          </CardContent>
        </Card>

        {/* Inventory Turnover */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Turnover</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InventoryAreaChart />
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <StatusDonutChart />
          </CardContent>
        </Card>

        {/* Inventory Health */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Health</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InventoryDonutChart />
          </CardContent>
        </Card>
      </div>

      {/* Summary stats table */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <tr className="border-b border-border">
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Change</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {summaryStats.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium text-foreground">{row.metric}</TableCell>
                  <TableCell className="tabular-nums font-semibold">{row.value}</TableCell>
                  <TableCell>
                    {row.direction === 'neutral' ? (
                      <span className="text-muted-foreground text-sm">—</span>
                    ) : (
                      <span
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          row.direction === 'up' ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {row.change} {row.label}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
