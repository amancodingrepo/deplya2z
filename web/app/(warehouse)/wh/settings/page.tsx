'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Avatar } from '../../../../components/ui/avatar';
import { getAuth, getToken } from '../../../../lib/auth';
import { apiUpdateUser } from '../../../../lib/api';

export default function WarehouseSettingsPage() {
  const auth = getAuth();
  const user = auth?.user;

  const [name, setName] = useState(user?.name ?? '');
  const [email] = useState(user?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => { if (user?.name) setName(user.name); }, [user?.name]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setProfileError('Name is required.'); return; }
    const token = getToken();
    if (!token || !user?.id) return;
    setProfileSaving(true); setProfileError(''); setProfileMsg('');
    try {
      await apiUpdateUser(token, user.id, { name });
      setProfileMsg('Profile updated.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileError(err.message ?? 'Update failed.');
    } finally { setProfileSaving(false); }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw || newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    const token = getToken();
    if (!token || !user?.id) return;
    setPwSaving(true); setPwError(''); setPwMsg('');
    try {
      await apiUpdateUser(token, user.id, { password: newPw } as any);
      setPwMsg('Password updated.');
      setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: any) {
      setPwError(err.message ?? 'Update failed.');
    } finally { setPwSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Account settings for Warehouse Manager"
        breadcrumb={[{ label: 'Dashboard', href: '/wh/dashboard' }, { label: 'Settings' }]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <form onSubmit={handleProfileSave}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Avatar name={name || 'WH'} size="lg" />
                  <div>
                    <p className="text-[13px] font-semibold">{name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      Warehouse Manager · {user?.location_code ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                  <Input label="Email" type="email" value={email} disabled hint="Contact admin to change email" />
                </div>
                {profileError && <p className="text-[12px] text-destructive">{profileError}</p>}
                {profileMsg && <p className="text-[12px] text-success">{profileMsg}</p>}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={profileSaving}>
                    {profileSaving ? 'Saving…' : 'Save Profile'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="flex flex-col gap-4">
                <Input label="New Password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
                <Input label="Confirm New Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
                {pwError && <p className="text-[12px] text-destructive">{pwError}</p>}
                {pwMsg && <p className="text-[12px] text-success">{pwMsg}</p>}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={pwSaving}>
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[13px] font-medium">{user?.location_name ?? 'My Warehouse'}</p>
                <p className="text-[12px] text-muted-foreground">{user?.location_code ?? '—'} · Warehouse</p>
              </div>
              <p className="text-[12px] text-muted-foreground">Contact admin to change your assigned location.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
