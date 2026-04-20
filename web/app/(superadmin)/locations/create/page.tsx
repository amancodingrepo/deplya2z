'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { getToken } from '../../../../lib/auth';
import { apiCreateLocation } from '../../../../lib/api';

const typeOptions = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'store', label: 'Store' },
];

export default function CreateLocationPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('warehouse');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) { setError('Name and code are required.'); return; }
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setSaving(true); setError('');
    try {
      await apiCreateLocation(token, {
        name,
        code: code.toUpperCase(),
        type: type as 'warehouse' | 'store',
        address: address.trim() || undefined,
      });
      router.push('/locations');
    } catch (e: any) {
      setError(e.message ?? 'Failed to create location.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title="Add Location"
        description="Create a new warehouse or store location"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Locations', href: '/locations' },
          { label: 'Add Location' },
        ]}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Location Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Location Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Warehouse" required />
                <Input
                  label="Location Code"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WH01"
                  hint="2–10 characters, unique"
                  required
                />
              </div>
              <Select
                label="Type"
                options={typeOptions}
                value={type}
                onChange={e => setType(e.target.value)}
                required
              />
              <Input
                label="Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street, City, State"
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Creating…' : 'Create Location'}
              </Button>
              <a href="/locations">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
