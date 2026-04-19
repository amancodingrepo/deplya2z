'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Avatar } from '../../../components/ui/avatar';
import { getAuth, getToken, getUserInitials } from '../../../lib/auth';
import { apiUpdateUser, ApiError } from '../../../lib/api';

export default function SettingsPage() {
  const auth = getAuth();
  const user = auth?.user;

  const [name, setName] = useState(user?.name ?? '');
  const [email] = useState(user?.email ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setProfileError('Name is required.'); return; }
    const token = getToken();
    if (!token || !user?.id) return;
    setProfileSaving(true);
    setProfileError('');
    setProfileMsg('');
    try {
      await apiUpdateUser(token, user.id, { name });
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileError(err.message ?? 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw || newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    const token = getToken();
    if (!token || !user?.id) return;
    setPwSaving(true);
    setPwError('');
    setPwMsg('');
    try {
      await apiUpdateUser(token, user.id, { password: newPw } as any);
      setPwMsg('Password updated successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: any) {
      setPwError(err.message ?? 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="System preferences and account settings"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Profile */}
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <form onSubmit={handleProfileSave}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Avatar name={name || 'Admin'} size="lg" />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{name || 'Admin'}</p>
                    <p className="text-[12px] text-muted-foreground">Super Admin</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                  <Input label="Email" type="email" value={email} disabled hint="Contact support to change email" />
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

          {/* Password */}
          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="flex flex-col gap-4">
                <Input label="Current Password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
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

          {/* System */}
          <Card>
            <CardHeader><CardTitle>System</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Low Stock Threshold</p>
                  <p className="text-xs text-muted-foreground">Alert when available stock drops below this value</p>
                </div>
                <Input type="number" defaultValue={5} className="w-20 text-center" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Order Auto-expire</p>
                  <p className="text-xs text-muted-foreground">Cancel draft orders after this many hours</p>
                </div>
                <Input type="number" defaultValue={48} className="w-20 text-center" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" type="button">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Account Info</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Role</p>
                <p className="text-[13px] font-medium mt-0.5">Super Admin</p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Email</p>
                <p className="text-[13px] font-medium mt-0.5 break-all">{email}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">User ID</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5 break-all">{user?.id ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
