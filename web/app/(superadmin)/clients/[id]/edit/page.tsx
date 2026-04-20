'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select } from '../../../../../components/ui/select';
import { getToken } from '../../../../../lib/auth';
import { apiClients, apiUpdateClient, apiClientStatus } from '../../../../../lib/api';
import type { ClientStore } from '../../../../../lib/api';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [client, setClient] = useState<ClientStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiClients(token, { limit: 200 })
      .then(res => {
        const found = res.data.find(c => c.id === id);
        if (found) {
          setClient(found);
          setName(found.name);
          setContactName(found.contact_name ?? '');
          setEmail(found.contact_email);
          setPhone(found.contact_phone ?? '');
          setAddress(found.address ?? '');
          setStatus(found.status);
        } else {
          setError('Client not found.');
        }
      })
      .catch((e: any) => setError(e.message ?? 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true); setError(''); setSaveMsg('');
    try {
      await apiUpdateClient(token, id, {
        name,
        contact_name: contactName,
        contact_email: email,
        contact_phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        status: status as 'active' | 'inactive',
      });
      setSaveMsg('Client updated.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to update client');
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
        title="Edit Client"
        description="Update client store details"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: client?.name ?? 'Edit Client' },
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
            <CardHeader><CardTitle>Client Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Store Name" value={name} onChange={e => setName(e.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Owner / Contact Name" value={contactName} onChange={e => setContactName(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98000 00000" />
                <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Shop address, city" />
              </div>
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
              <a href="/clients">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
