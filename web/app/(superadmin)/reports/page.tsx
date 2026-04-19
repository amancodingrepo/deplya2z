'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { getToken } from '../../../lib/auth';
import { apiAuditLog } from '../../../lib/api';

const ACTION_TYPES = ['All', 'ORDER', 'STOCK', 'USER', 'LOGIN', 'PRODUCT'];
const ACTION_COLOR: Record<string, string> = {
  ORDER: 'text-primary bg-primary/10',
  STOCK: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400',
  USER: 'text-muted-foreground bg-muted',
  LOGIN: 'text-warning bg-warning/10',
  PRODUCT: 'text-success bg-success/10',
};
function actionColor(action: string) {
  const type = ACTION_TYPES.find(t => t !== 'All' && action.startsWith(t)) ?? 'ORDER';
  return ACTION_COLOR[type] ?? 'text-muted-foreground bg-muted';
}

interface LogEntry {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  ip_address: string;
  success: boolean;
  created_at: string;
  actor_name?: string;
  actor_role?: string;
}

function initials(name: string) {
  return (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

function fmtDate(ts: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(ts));
  } catch { return ts; }
}

export default function ReportsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (pg: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiAuditLog(token, { page: pg, limit: 20 });
      setLogs(res.data as unknown as LogEntry[]);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
      setPage(pg);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  function handleExportCSV() {
    const rows = [
      ['Timestamp', 'Action', 'Entity', 'IP', 'Status'],
      ...logs.map(l => [fmtDate(l.created_at), l.action, l.entity_id, l.ip_address ?? '', l.success ? 'Success' : 'Failed']),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit-log.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = logs.filter(l => {
    if (actionFilter !== 'All' && !l.action.startsWith(actionFilter)) return false;
    if (statusFilter === 'Success' && !l.success) return false;
    if (statusFilter === 'Failed' && l.success) return false;
    return true;
  });

  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success).length;
  const uniqueActors = new Set(logs.map(l => l.actor_user_id)).size;

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
          <Button variant="outline" size="sm" onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Events', value: total, color: 'text-foreground' },
          { label: 'Successful', value: successCount, color: 'text-success' },
          { label: 'Failed', value: failedCount, color: 'text-destructive' },
          { label: 'Unique Actors', value: uniqueActors, color: 'text-primary' },
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
        <button onClick={() => load(1)} className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-surface-raised transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                {['Timestamp', 'Actor', 'Action', 'Entity', 'IP', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading…
                  </div>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No log entries match the filter</td></tr>
              )}
              {!loading && filtered.map(log => (
                <>
                  <tr key={log.id} onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className={`border-b border-border hover:bg-surface-raised transition-colors cursor-pointer ${!log.success ? 'bg-destructive/5' : ''}`}>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(log.actor_name ?? log.actor_user_id)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground leading-tight text-[12px]">{log.actor_name ?? log.actor_user_id?.slice(0, 8)}</p>
                          {log.actor_role && <p className="text-[11px] text-muted-foreground">{log.actor_role}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-primary">{log.entity_id ?? log.entity_type}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{log.ip_address ?? '—'}</td>
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
                          {log.before_value ? (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Before</p>
                              <pre className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-[11px] text-foreground overflow-x-auto">
                                {JSON.stringify(log.before_value, null, 2)}
                              </pre>
                            </div>
                          ) : <div />}
                          {log.after_value ? (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">After</p>
                              <pre className="rounded-md border border-border bg-success/10 px-3 py-2 font-mono text-[11px] text-foreground overflow-x-auto">
                                {JSON.stringify(log.after_value, null, 2)}
                              </pre>
                            </div>
                          ) : <div />}
                          {!log.before_value && !log.after_value && (
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          <span>Showing {filtered.length} of {total} events</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="rounded-md border border-border px-3 py-1 text-[12px] hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            <span>Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="rounded-md border border-border px-3 py-1 text-[12px] hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
