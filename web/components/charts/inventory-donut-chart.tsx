'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface InvDonutDatum { name: string; value: number; color: string }

const DEFAULT: InvDonutDatum[] = [
  { name: 'In Stock',     value: 0, color: '#10B981' },
  { name: 'Low Stock',    value: 0, color: '#F59E0B' },
  { name: 'Out of Stock', value: 0, color: '#EF4444' },
];

function CenterLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="22" fontWeight="700" fill="var(--foreground)">{total}</tspan>
      <tspan x={cx} dy="1.4em"  fontSize="11" fill="var(--muted-foreground)">products</tspan>
    </text>
  );
}

export function InventoryDonutChart({ data }: { data?: InvDonutDatum[] }) {
  const rows = (data && data.some(d => d.value > 0)) ? data : DEFAULT;
  const total = rows.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={rows}
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
        >
          {rows.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          {/* @ts-expect-error recharts internal render prop */}
          <CenterLabel cx="50%" cy="50%" total={total} />
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(val) => [`${val} (${total > 0 ? (((val as number) / total) * 100).toFixed(0) : 0}%)`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
