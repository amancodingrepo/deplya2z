'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { getToken } from '../../../../lib/auth';
import { apiCreateUser, apiLocations } from '../../../../lib/api';
import type { Location } from '../../../../lib/api';

const roleOptions = [
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'superadmin', label: 'Super Admin' },
];

export default function CreateUserPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('store_manager');
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiLocations(token)
      .then(res => setLocations(res.data))
      .catch(() => {});
  }, []);

  const locationOptions = locations.map(l => ({
    value: l.id,
    label: `${l.name} (${l.code}) — ${l.type === 'warehouse' ? 'Warehouse' : 'Store'}`,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email and password are required.');
      return;
    }
    if (role !== 'superadmin' && !locationId) {
      setError('Please select a location for this role.');
      return;
    }
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setSaving(true);
    setError('');
    try {
      await apiCreateUser(token, {
        name,
        email,
        password,
        role: role as 'superadmin' | 'warehouse_manager' | 'store_manager',
        location_id: role !== 'superadmin' ? locationId : undefined,
      });
      router.push('/users');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title="Add User"
        description="Create a new system user"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Users', href: '/users' },
          { label: 'Add User' },
        ]}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sam Park" required />
              <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sam@a2z.com" required />
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
                  hint={locations.length === 0 ? 'Loading locations…' : undefined}
                  required
                />
              )}
              <Input
                label="Temporary Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                hint="User should change this on first login"
                required
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Creating…' : 'Create User'}
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
