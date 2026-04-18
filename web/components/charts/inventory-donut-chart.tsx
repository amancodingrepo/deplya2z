'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'In Stock', value: 32, color: '#10B981' },
  { name: 'Low Stock', value: 8, color: '#F59E0B' },
  { name: 'Out of Stock', value: 5, color: '#EF4444' },
];

const total = data.reduce((s, d) => s + d.value, 0);

function CenterLabel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="22" fontWeight="700" fill="var(--foreground)">{total}</tspan>
      <tspan x={cx} dy="1.4em" fontSize="11" fill="var(--muted-foreground)">products</tspan>
    </text>
  );
}

export function InventoryDonutChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
          {/* @ts-expect-error recharts internal render prop */}
          <CenterLabel cx="50%" cy="50%" />
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(val) => [`${val} (${(((val as number)/total)*100).toFixed(0)}%)`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
