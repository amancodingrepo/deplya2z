'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Avatar } from '../../../components/ui/avatar';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';
import { getToken } from '../../../lib/auth';
import { apiUsers } from '../../../lib/api';
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

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiUsers(token)
      .then(r => setUsers(r.data))
      .catch(() => {/* keep empty list on error */})
      .finally(() => setLoading(false));
  }, []);

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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableEmpty colSpan={5}>No users found.</TableEmpty>
              ) : (
                users.map((u) => (
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
                    <TableCell className="text-muted-foreground">{u.location_code ?? '—'}</TableCell>
                    <TableCell><Badge variant={statusToBadgeVariant(u.status)} dot>{u.status.charAt(0).toUpperCase() + u.status.slice(1)}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <a href={`/users/${u.id}/edit`} className="text-xs font-medium text-primary hover:underline">Edit</a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
