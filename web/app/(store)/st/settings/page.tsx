import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Avatar } from '../../../../components/ui/avatar';

export default function StoreSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Account settings for Store Manager"
        breadcrumb={[{ label: 'Dashboard', href: '/st/dashboard' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar name="Priya Sharma" size="lg" />
                <div>
                  <p className="text-sm font-semibold">Priya Sharma</p>
                  <p className="text-xs text-muted-foreground">Store Manager · ST01</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" defaultValue="Priya Sharma" />
                <Input label="Email" type="email" defaultValue="store01@a2z.com" disabled hint="Contact admin to change email" />
              </div>
              <Input label="Phone" type="tel" placeholder="+91 98765 43210" />
              <div className="flex justify-end">
                <Button size="sm">Save Profile</Button>
              </div>
            </CardContent>
          </Card>

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
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>My Store</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Store 01</p>
                <p className="text-xs text-muted-foreground">ST01 · Shop 3, CP Mall, Delhi</p>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Assigned Warehouse</p>
                <p className="text-xs text-muted-foreground">WH01 · Main Warehouse</p>
              </div>
              <p className="text-xs text-muted-foreground">Contact admin to update store details.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
