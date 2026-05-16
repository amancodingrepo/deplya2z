'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { getToken } from '../../../../lib/auth';
import { apiCreateClient } from '../../../../lib/api';

export default function CreateClientPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) { setError('Store name and code are required.'); return; }
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setSaving(true); setError('');
    try {
      await apiCreateClient(token, {
        name,
        code,
        contact_name: contactName,
        contact_email: email,
        contact_phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
      });
      router.push('/clients');
    } catch (e: any) {
      setError(e.message ?? 'Failed to create client.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title="Add Client"
        description="Register a new third-party client store"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients', href: '/clients' },
          { label: 'Add Client' },
        ]}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Client Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Store Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. TechMart Retail" required />
              <Input label="Client Code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CL-TECHMART" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Owner / Contact Name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Arun Mehta" />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@store.com" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98000 00000" />
                <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Shop address, city, state" />
              </div>
              <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Pune" />
              <Input label="GST Number" value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="e.g. 27ABCDE1234F1Z5" />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Adding…' : 'Add Client'}
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
