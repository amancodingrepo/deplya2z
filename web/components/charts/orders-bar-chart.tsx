'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const data = [
  { day: 'Mon', store: 4, bulk: 1 },
  { day: 'Tue', store: 7, bulk: 3 },
  { day: 'Wed', store: 5, bulk: 2 },
  { day: 'Thu', store: 9, bulk: 4 },
  { day: 'Fri', store: 6, bulk: 2 },
  { day: 'Sat', store: 3, bulk: 1 },
  { day: 'Sun', store: 2, bulk: 0 },
];

export function OrdersBarChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%">
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
