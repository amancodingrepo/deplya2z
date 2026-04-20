'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { Badge, statusToBadgeVariant } from '../../../../../components/ui/badge';
import { getToken } from '../../../../../lib/auth';
import { apiUsers, apiUpdateUser, apiUserStatus, apiLocations } from '../../../../../lib/api';
import type { User, Location } from '../../../../../lib/api';

const roleOptions = [
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'superadmin', label: 'Super Admin' },
];

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [locationId, setLocationId] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiUsers(token, { limit: 200 }),
      apiLocations(token),
    ]).then(([usersRes, locsRes]) => {
      const found = usersRes.data.find(u => u.id === id);
      if (found) {
        setUser(found);
        setName(found.name);
        setRole(found.role);
        setLocationId(found.location_id ?? '');
      } else {
        setError('User not found.');
      }
      setLocations(locsRes.data);
    }).catch((e: any) => {
      setError(e.message ?? 'Failed to load user');
    }).finally(() => setLoading(false));
  }, [id]);

  const locationOptions = locations.map(l => ({
    value: l.id,
    label: `${l.name} (${l.code}) — ${l.type === 'warehouse' ? 'Warehouse' : 'Store'}`,
  }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true); setError(''); setSaveMsg('');
    try {
      const body: any = { name, role };
      if (role !== 'superadmin') body.location_id = locationId;
      if (newPw) body.password = newPw;
      await apiUpdateUser(token, id, body);
      setSaveMsg('User updated successfully.');
      setNewPw('');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`${newStatus === 'inactive' ? 'Deactivate' : 'Activate'} user "${user.name}"?`)) return;
    setTogglingStatus(true);
    try {
      await apiUserStatus(token, id, newStatus);
      setUser(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch (e: any) {
      alert(e.message ?? 'Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-[13px]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" /> Loading…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <PageHeader
        title="Edit User"
        description="Update user details and access"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Users', href: '/users' },
          { label: user?.name ?? 'Edit User' },
        ]}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}
      {saveMsg && (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">{saveMsg}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
              <Input label="Email Address" type="email" value={user?.email ?? ''} disabled hint="Contact system admin to change email" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Access & Role</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select
                label="Role"
                options={roleOptions}
                value={role}
                onChange={e => { setRole(e.target.value); setLocationId(''); }}
                required
              />
              {role !== 'superadmin' && (
                <Select
                  label="Assigned Location"
                  options={locationOptions}
                  placeholder="Select location"
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                  required
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardContent>
              <Input
                label="New Password"
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Leave blank to keep current password"
                hint="Min. 8 characters"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {user && (
                <div className="flex items-center gap-2">
                  <Badge variant={statusToBadgeVariant(user.status)} dot>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                className={user?.status === 'active' ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : ''}
              >
                {togglingStatus ? '…' : user?.status === 'active' ? 'Deactivate User' : 'Activate User'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <a href="/users">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
