'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';

const logs = [
  { id: 1, ts: 'Apr 12, 10:45 AM', user: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'ORDER_APPROVED', entity: 'ORD-ST01-0001', ip: '192.168.1.10', success: true, before: '{"status":"draft"}', after: '{"status":"confirmed"}' },
  { id: 2, ts: 'Apr 12, 10:32 AM', user: 'Priya Sharma', initials: 'PS', role: 'Store Mgr', action: 'ORDER_CREATED', entity: 'ORD-ST01-0001', ip: '192.168.1.12', success: true, before: null, after: '{"status":"draft","items":2}' },
  { id: 3, ts: 'Apr 12, 10:10 AM', user: 'Sam Park', initials: 'SP', role: 'WH Mgr', action: 'ORDER_DISPATCHED', entity: 'ORD-ST02-0006', ip: '192.168.1.11', success: true, before: '{"status":"packed"}', after: '{"status":"dispatched"}' },
  { id: 4, ts: 'Apr 12, 9:55 AM', user: 'Sam Park', initials: 'SP', role: 'WH Mgr', action: 'ORDER_PACKED', entity: 'ORD-ST02-0006', ip: '192.168.1.11', success: true, before: '{"status":"confirmed"}', after: '{"status":"packed"}' },
  { id: 5, ts: 'Apr 12, 9:30 AM', user: 'Unknown', initials: '?', role: '—', action: 'LOGIN_FAILED', entity: 'hacker@test.com', ip: '203.0.113.42', success: false, before: null, after: null },
  { id: 6, ts: 'Apr 12, 9:10 AM', user: 'Meera Das', initials: 'MD', role: 'Store Mgr', action: 'ORDER_CREATED', entity: 'ORD-ST03-0004', ip: '192.168.1.13', success: true, before: null, after: '{"status":"draft","items":2}' },
  { id: 7, ts: 'Apr 12, 8:50 AM', user: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'STOCK_ADJUSTED', entity: 'Samsung 55" TV', ip: '192.168.1.10', success: true, before: '{"total":5}', after: '{"total":15}' },
  { id: 8, ts: 'Apr 11, 5:00 PM', user: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'USER_CREATED', entity: 'Anita Roy', ip: '192.168.1.10', success: true, before: null, after: '{"role":"store_manager","location":"ST04"}' },
  { id: 9, ts: 'Apr 11, 4:30 PM', user: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'ORDER_REJECTED', entity: 'ORD-ST04-0008', ip: '192.168.1.10', success: true, before: '{"status":"draft"}', after: '{"status":"cancelled"}' },
  { id: 10, ts: 'Apr 11, 3:15 PM', user: 'Raj Patel', initials: 'RP', role: 'Store Mgr', action: 'RECEIPT_CONFIRMED', entity: 'ORD-ST02-0003', ip: '192.168.1.14', success: true, before: '{"status":"dispatched"}', after: '{"status":"store_received"}' },
  { id: 11, ts: 'Apr 11, 2:00 PM', user: 'Sam Park', initials: 'SP', role: 'WH Mgr', action: 'STOCK_ADJUSTED', entity: 'LG Monitor 23"', ip: '192.168.1.11', success: true, before: '{"available":3}', after: '{"available":18}' },
  { id: 12, ts: 'Apr 11, 11:00 AM', user: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'PRODUCT_CREATED', entity: 'Dell XPS 15', ip: '192.168.1.10', success: true, before: null, after: '{"sku":"SKU-LAP-007","status":"present"}' },
  { id: 13, ts: 'Apr 11, 10:30 AM', user: 'Unknown', initials: '?', role: '—', action: 'LOGIN_FAILED', entity: 'admin@test.com', ip: '198.51.100.7', success: false, before: null, after: null },
  { id: 14, ts: 'Apr 10, 6:00 PM', user: 'Alex Johnson', initials: 'AJ', role: 'Superadmin', action: 'USER_UPDATED', entity: 'Sam Park', ip: '192.168.1.10', success: true, before: '{"status":"inactive"}', after: '{"status":"active"}' },
  { id: 15, ts: 'Apr 10, 4:30 PM', user: 'Raj Patel', initials: 'RP', role: 'Store Mgr', action: 'ORDER_CREATED', entity: 'ORD-ST02-0003', ip: '192.168.1.14', success: true, before: null, after: '{"status":"draft","items":1}' },
];

const ACTION_TYPES = ['All', 'ORDER', 'STOCK', 'USER', 'LOGIN', 'PRODUCT'];
const ACTION_COLOR: Record<string, string> = {
  ORDER: 'text-primary bg-primary/10',
  STOCK: 'text-purple-600 bg-purple-50',
  USER: 'text-muted-foreground bg-muted',
  LOGIN: 'text-warning bg-warning/10',
  PRODUCT: 'text-success bg-success/10',
};
function actionColor(action: string) {
  const type = ACTION_TYPES.find(t => t !== 'All' && action.startsWith(t)) ?? 'ORDER';
  return ACTION_COLOR[type] ?? 'text-muted-foreground bg-muted';
}

export default function ReportsPage() {
  const [actionFilter, setActionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = logs.filter(l => {
    if (actionFilter !== 'All' && !l.action.startsWith(actionFilter)) return false;
    if (statusFilter === 'Success' && !l.success) return false;
    if (statusFilter === 'Failed' && l.success) return false;
    return true;
  });

  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success).length;
  const uniqueUsers = new Set(logs.map(l => l.user)).size;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Reports & Audit</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Reports & Audit Log</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">System activity and security audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports/analytics">
            <Button variant="outline" size="sm">Analytics →</Button>
          </Link>
          <Button variant="outline" size="sm">Export CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Events', value: logs.length, color: 'text-foreground' },
          { label: 'Successful', value: successCount, color: 'text-success' },
          { label: 'Failed', value: failedCount, color: 'text-destructive' },
          { label: 'Unique Users', value: uniqueUsers, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4 text-center shadow-xs">
            <p className={`text-[28px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {ACTION_TYPES.map(t => (
            <button key={t} onClick={() => setActionFilter(t)}
              className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${actionFilter === t ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-muted-foreground hover:bg-surface-raised'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {['All', 'Success', 'Failed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${statusFilter === s
                ? s === 'Failed' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                : 'border border-border bg-surface text-muted-foreground hover:bg-surface-raised'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                {['Timestamp', 'User', 'Action', 'Entity', 'IP', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No log entries match the filter</td></tr>
              )}
              {filtered.map(log => (
                <>
                  <tr key={log.id} onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className={`border-b border-border hover:bg-surface-raised transition-colors cursor-pointer ${!log.success ? 'bg-destructive/5' : ''}`}>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{log.ts}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{log.initials}</span>
                        <div>
                          <p className="font-medium text-foreground leading-tight text-[12px]">{log.user}</p>
                          <p className="text-[11px] text-muted-foreground">{log.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-primary">{log.entity}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{log.ip}</td>
                    <td className="px-4 py-3">
                      {log.success
                        ? <span className="text-[16px] text-success font-bold">✓</span>
                        : <span className="text-[16px] text-destructive font-bold">✗</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-muted-foreground">
                      {expandedId === log.id ? '▲' : '▼'}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="border-b border-border">
                      <td colSpan={7} className="bg-surface-raised px-6 py-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {log.before ? (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Before</p>
                              <pre className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] text-foreground overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.before), null, 2)}
                              </pre>
                            </div>
                          ) : <div />}
                          {log.after ? (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">After</p>
                              <pre className="rounded-md border border-border bg-success/10 px-3 py-2 font-mono text-[11px] text-foreground overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.after), null, 2)}
                              </pre>
                            </div>
                          ) : <div />}
                          {!log.before && !log.after && (
                            <p className="col-span-2 text-[12px] text-muted-foreground">No data changes recorded for this event.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          Showing {filtered.length} of {logs.length} events · Click any row to expand details
        </div>
      </div>
    </div>
  );
}
