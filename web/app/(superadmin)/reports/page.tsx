'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { getToken } from '../../../lib/auth';
import { apiAuditLog } from '../../../lib/api';

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

function fmtDate(ts: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
  } catch { return ts; }
}

export default function ReportsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async (pg: number) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiAuditLog(token, { page: pg, limit: 100, entity_type: entityFilter || undefined, actor: userFilter || undefined });
      setLogs(res.data as unknown as LogEntry[]);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, userFilter]);

  useEffect(() => { load(1); }, [load]);

  const filtered = logs.filter((l) => {
    if (actionFilter && !l.action.toLowerCase().includes(actionFilter.toLowerCase())) return false;
    if (statusFilter === 'success' && !l.success) return false;
    if (statusFilter === 'failed' && l.success) return false;
    if (dateFrom && new Date(l.created_at) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && new Date(l.created_at) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-1.5">·</span>
            <span className="text-foreground">Reports & Audit</span>
          </p>
          <h1 className="text-[20px] font-semibold text-foreground">Reports & Audit Log</h1>
        </div>
        <Link href="/reports/analytics"><Button variant="outline" size="sm">Analytics</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="Action type..." className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <input value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} placeholder="Entity type..." className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="User..." className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm">
          <option value="">All status</option><option value="success">Success</option><option value="failed">Failed</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm" />
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entity</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No logs found</td></tr>}
              {!loading && filtered.map((log) => (
                <>
                  <tr key={log.id} onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className={`border-b border-border hover:bg-surface-raised cursor-pointer ${!log.success ? 'bg-destructive/5' : ''}`}>
                    <td className="px-4 py-3 text-xs">{fmtDate(log.created_at)}</td>
                    <td className="px-4 py-3">{log.actor_name ?? log.actor_user_id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-xs">{log.entity_type}:{log.entity_id}</td>
                    <td className="px-4 py-3">{log.success ? 'Success' : 'Failed'}</td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="border-b border-border">
                      <td colSpan={5} className="bg-surface-raised px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <pre className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] overflow-auto">{JSON.stringify(log.before_value, null, 2)}</pre>
                          <pre className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] overflow-auto">{JSON.stringify(log.after_value, null, 2)}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          <span>Showing {filtered.length} of {total} events</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="rounded-md border border-border px-3 py-1 text-[12px] disabled:opacity-40">Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => load(page + 1)} className="rounded-md border border-border px-3 py-1 text-[12px] disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
