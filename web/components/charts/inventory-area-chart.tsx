'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const data = Array.from({ length: 14 }, (_, i) => ({
  day: `Apr ${i + 3}`,
  stockIn: 80 + Math.floor(Math.random() * 40),
  reserved: 20 + Math.floor(Math.random() * 30),
  issued: 15 + Math.floor(Math.random() * 25),
}));

export function InventoryAreaChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
          interval={2} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--surface-overlay)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="stockIn" name="Stock In" stroke="#10B981" fill="url(#colorIn)" strokeWidth={2} />
        <Area type="monotone" dataKey="reserved" name="Reserved" stroke="#F59E0B" fill="url(#colorRes)" strokeWidth={2} />
        <Area type="monotone" dataKey="issued" name="Issued" stroke="#3B82F6" fill="url(#colorIssued)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
