'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

export interface OrdersLineDatum { day: string; store: number; bulk: number }

export function OrdersLineChart({ data }: { data?: OrdersLineDatum[] }) {
  const rows = data ?? [];

  if (!rows.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No order data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          interval={Math.max(0, Math.floor(rows.length / 6))}
        />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="store" name="Store Orders" stroke="#3B82F6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="bulk" name="Bulk Orders" stroke="#64748B" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
