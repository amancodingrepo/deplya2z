'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Avatar } from '../../../components/ui/avatar';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiUsers, apiUserStatus, apiUpdateUser } from '../../../lib/api';
import type { User } from '../../../lib/api';

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  warehouse_manager: 'Warehouse Mgr',
  store_manager: 'Store Manager',
  staff: 'Staff',
};

const roleVariants: Record<string, 'primary' | 'warning' | 'default'> = {
  superadmin: 'primary',
  warehouse_manager: 'warning',
  store_manager: 'default',
  staff: 'default',
};

function fmtDate(ts: string) {
  try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(ts)); }
  catch { return '—'; }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiUsers(token, { limit: 100 });
      setUsers(res.data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleStatus(u: User) {
    const token = getToken();
    if (!token) return;
    setTogglingId(u.id);
    try {
      const newStatus = u.status === 'active' ? 'inactive' : 'active';
      await apiUserStatus(token, u.id, newStatus);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
    } catch (e: any) {
      alert(e.message ?? 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    setDeletingId(u.id);
    try {
      await apiUpdateUser(token, u.id, { status: 'inactive' } as any);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleResetPassword(u: User) {
    const nextPw = prompt(`Set new password for ${u.name}`);
    if (!nextPw) return;
    const token = getToken();
    if (!token) return;
    setResettingId(u.id);
    try {
      await apiUpdateUser(token, u.id, { password: nextPw } as any);
      alert('Password reset completed.');
    } catch (e: any) {
      alert(e.message ?? 'Failed to reset password');
    } finally {
      setResettingId(null);
    }
  }

  const filtered = (users || []).filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage system users and their roles"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Users' }]}
        actions={
          <a href="/users/create">
            <Button size="sm"><PlusIcon /> Add User</Button>
          </a>
        }
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        >
          <option value="">All roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="warehouse_manager">Warehouse Manager</option>
          <option value="store_manager">Store Manager</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={load} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:bg-surface-raised transition-colors">↻ Refresh</button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={6}>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading…
                </div>
              </TableEmpty>
            ) : filtered.length === 0 ? (
              <TableEmpty colSpan={6}>No users found.</TableEmpty>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <p className="font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={roleVariants[u.role] ?? 'default'}>{roleLabels[u.role] ?? u.role}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {u.location_name ? `${u.location_name} (${u.location_code})` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusToBadgeVariant(u.status)} dot>
                      {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`/users/${u.id}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={togglingId === u.id}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        {togglingId === u.id ? '…' : u.status === 'active' ? 'Block' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(u)}
                        disabled={resettingId === u.id}
                        className="text-xs font-medium text-warning hover:underline disabled:opacity-50"
                      >
                        {resettingId === u.id ? '…' : 'Reset Password'}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                      >
                        {deletingId === u.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && (
          <div className="border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
            Showing {filtered.length} of {(users || []).length} users
          </div>
        )}
      </Card>
    </div>
  );
}
