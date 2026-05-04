'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface StatusDatum { name: string; value: number; color: string }

export function StatusDonutChart({ data }: { data?: StatusDatum[] }) {
  const rows = data ?? [];
  const total = rows.reduce((s, d) => s + d.value, 0);

  if (!rows.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        No order data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={rows}
          cx="50%"
          cy="45%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
        >
          {rows.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(val) => [`${val} (${total > 0 ? (((val as number) / total) * 100).toFixed(0) : 0}%)`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} layout="horizontal" />
      </PieChart>
    </ResponsiveContainer>
  );
}
