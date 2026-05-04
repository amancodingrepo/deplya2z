'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

export interface OrdersByStoreDatum { store: string; orders: number }

export function OrdersByStoreChart({ data }: { data?: OrdersByStoreDatum[] }) {
  const rows = data ?? [];

  if (!rows.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        No store order data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="store" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
          formatter={(val) => [val, 'Orders']}
        />
        <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={`rgba(59,130,246,${Math.max(0.25, 1 - i * 0.12)})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
