'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';

const data = [
  { name: 'Samsung TV 55"', units: 87 },
  { name: 'LG Monitor 23"', units: 72 },
  { name: 'iPhone 15 Pro', units: 65 },
  { name: 'Dell XPS 15', units: 54 },
  { name: 'Sony Headphones', units: 49 },
  { name: 'LG Fridge', units: 38 },
  { name: 'Galaxy S24 Ultra', units: 34 },
  { name: 'iPad Air 5th', units: 28 },
  { name: 'AirPods Pro', units: 21 },
  { name: 'MacBook Air M2', units: 18 },
];

export function TopProductsChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
          formatter={(val) => [`${val} units`, 'Total Ordered']}
        />
        <Bar dataKey="units" radius={[0, 4, 4, 0]} fill="#3B82F6">
          {data.map((_, i) => (
            <Cell key={i} fill={`rgba(59,130,246,${1 - i * 0.07})`} />
          ))}
          <LabelList dataKey="units" position="right" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
