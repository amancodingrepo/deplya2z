'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';

export interface TopProductDatum { name: string; units: number }

export function TopProductsChart({ data }: { data?: TopProductDatum[] }) {
  const rows = data ?? [];

  if (!rows.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
        No product data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, rows.length * 28)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
          formatter={(val) => [`${val} units`, 'Total Ordered']}
        />
        <Bar dataKey="units" radius={[0, 4, 4, 0]} fill="#3B82F6">
          {rows.map((_, i) => (
            <Cell key={i} fill={`rgba(59,130,246,${Math.max(0.25, 1 - i * 0.07)})`} />
          ))}
          <LabelList dataKey="units" position="right" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
