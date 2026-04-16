import { PageHeader } from '../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Avatar } from '../../../components/ui/avatar';

export default function SettingsPage() {
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
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar name="Alex Johnson" size="lg" />
                <Button variant="outline" size="sm">Change Avatar</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" defaultValue="Alex Johnson" />
                <Input label="Email" type="email" defaultValue="admin@a2z.com" />
              </div>
              <Input label="Phone" type="tel" placeholder="+91 98765 43210" />
              <div className="flex justify-end">
                <Button size="sm">Save Profile</Button>
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Current Password" type="password" placeholder="••••••••" />
              <Input label="New Password" type="password" placeholder="Min. 8 characters" />
              <Input label="Confirm New Password" type="password" placeholder="Re-enter new password" />
              <div className="flex justify-end">
                <Button size="sm">Update Password</Button>
              </div>
            </CardContent>
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
                <Button size="sm">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">These actions are irreversible. Proceed with caution.</p>
              <Button variant="destructive" className="w-full" size="sm">Reset All Inventory</Button>
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive-subtle" size="sm">
                Clear Audit Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
