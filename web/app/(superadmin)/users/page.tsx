import { PageHeader } from '../../../components/ui/page-header';
import { Card } from '../../../components/ui/card';
import { Badge, statusToBadgeVariant } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Avatar } from '../../../components/ui/avatar';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../../../components/ui/table';
import { PlusIcon, SearchIcon } from '../../../components/layout/icons';

const users = [
  { id: '1', name: 'Alex Johnson', email: 'admin@a2z.com', role: 'superadmin', location: '—', status: 'active', lastLogin: 'Just now' },
  { id: '2', name: 'Sam Park', email: 'warehouse@a2z.com', role: 'warehouse_manager', location: 'WH01', status: 'active', lastLogin: '2 hr ago' },
  { id: '3', name: 'Priya Sharma', email: 'store01@a2z.com', role: 'store_manager', location: 'ST01', status: 'active', lastLogin: '1 hr ago' },
  { id: '4', name: 'Raj Patel', email: 'store02@a2z.com', role: 'store_manager', location: 'ST02', status: 'active', lastLogin: '5 hr ago' },
  { id: '5', name: 'Meera Das', email: 'store03@a2z.com', role: 'store_manager', location: 'ST03', status: 'inactive', lastLogin: '3 days ago' },
];

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  warehouse_manager: 'Warehouse Mgr',
  store_manager: 'Store Manager',
};

const roleVariants: Record<string, 'primary' | 'warning' | 'default'> = {
  superadmin: 'primary',
  warehouse_manager: 'warning',
  store_manager: 'default',
};

export default function UsersPage() {
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><SearchIcon /></span>
          <input type="search" placeholder="Search by name or email…" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
        </div>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="warehouse_manager">Warehouse Manager</option>
          <option value="store_manager">Store Manager</option>
        </select>
        <select className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableEmpty colSpan={6}>No users found.</TableEmpty>
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
                  <TableCell><Badge variant={roleVariants[u.role]}>{roleLabels[u.role]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{u.location}</TableCell>
                  <TableCell><Badge variant={statusToBadgeVariant(u.status)} dot>{u.status.charAt(0).toUpperCase() + u.status.slice(1)}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.lastLogin}</TableCell>
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
      </Card>
    </div>
  );
}
