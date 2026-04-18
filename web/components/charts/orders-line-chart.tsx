'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const data30 = Array.from({ length: 30 }, (_, i) => ({
  day: `Apr ${i + 1}`,
  store: Math.floor(Math.random() * 12) + 2,
  bulk: Math.floor(Math.random() * 5) + 1,
}));

export function OrdersLineChart({ data = data30 }: { data?: typeof data30 }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
          interval={Math.floor(data.length / 6)} />
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
