'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

export interface OrdersBarDatum { day: string; store: number; bulk: number }

export function OrdersBarChart({ data }: { data?: OrdersBarDatum[] }) {
  const rows = data ?? [];

  if (!rows.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        No order data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="store" name="Store Orders" fill="#3B82F6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="bulk" name="Bulk Orders" fill="#64748B" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
