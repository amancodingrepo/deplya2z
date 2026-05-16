'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { getToken } from '../../../../../lib/auth';
import { apiLocations, apiUpdateLocation } from '../../../../../lib/api';
import type { Location } from '../../../../../lib/api';

const typeOptions = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'store', label: 'Store' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiLocations(token)
      .then(res => {
        const found = res.data.find(l => l.id === id);
        if (found) {
          setLocation(found);
          setName(found.name);
          setAddress(found.address ?? '');
          setStatus(found.status);
        } else {
          setError('Location not found.');
        }
      })
      .catch((e: any) => setError(e.message ?? 'Failed to load location'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true); setError(''); setSaveMsg('');
    try {
      await apiUpdateLocation(token, id, {
        name,
        address: address.trim() || undefined,
        status: status as 'active' | 'inactive',
      });
      setSaveMsg('Location updated.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to update location');
    } finally {
      setSaving(false);
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
        title="Edit Location"
        description="Update location details"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Locations', href: '/locations' },
          { label: location?.name ?? 'Edit Location' },
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
            <CardHeader><CardTitle>Location Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Location Name" value={name} onChange={e => setName(e.target.value)} required />
                <Input label="Location Code" value={location?.code ?? ''} disabled hint="Code cannot be changed" />
              </div>
              <Select label="Type" options={typeOptions} value={location?.type ?? 'store'} onChange={() => {}} disabled hint="Type cannot be changed after creation" />
              <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State" />
              <Select label="Status" options={statusOptions} value={status} onChange={e => setStatus(e.target.value)} required />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
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
