import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Avatar } from '../../../../components/ui/avatar';

export default function WarehouseSettingsPage() {
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
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Avatar name="Sam Park" size="lg" />
                <div>
                  <p className="text-sm font-semibold">Sam Park</p>
                  <p className="text-xs text-muted-foreground">Warehouse Manager · WH01</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" defaultValue="Sam Park" />
                <Input label="Email" type="email" defaultValue="warehouse@a2z.com" disabled hint="Contact admin to change email" />
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
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Main Warehouse</p>
                <p className="text-xs text-muted-foreground">WH01 · 12 Industrial Area, Delhi</p>
              </div>
              <p className="text-xs text-muted-foreground">Contact admin to change your assigned location.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
