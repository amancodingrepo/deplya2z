'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const data = [
  { store: 'ST01', orders: 22, units: 87 },
  { store: 'ST02', orders: 18, units: 64 },
  { store: 'ST03', orders: 15, units: 51 },
  { store: 'ST04', orders: 11, units: 38 },
  { store: 'ST05', orders: 8, units: 24 },
];

export function OrdersByStoreChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="store" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
          formatter={(val, name) => [val, name === 'orders' ? 'Orders' : 'Units']}
        />
        <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`rgba(59,130,246,${1 - i * 0.12})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
