'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_DATA = [
  { name: 'Draft', value: 5, color: '#94A3B8' },
  { name: 'Confirmed', value: 12, color: '#3B82F6' },
  { name: 'Packed', value: 8, color: '#F59E0B' },
  { name: 'Dispatched', value: 6, color: '#F97316' },
  { name: 'Completed', value: 34, color: '#10B981' },
  { name: 'Cancelled', value: 4, color: '#EF4444' },
];

const total = STATUS_DATA.reduce((s, d) => s + d.value, 0);

export function StatusDonutChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={STATUS_DATA}
          cx="50%"
          cy="45%"
          innerRadius={52}
          outerRadius={78}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
        >
          {STATUS_DATA.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(val) => [`${val} (${(((val as number)/total)*100).toFixed(0)}%)`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} layout="horizontal" />
      </PieChart>
    </ResponsiveContainer>
  );
}
