import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';

const roleOptions = [
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'superadmin', label: 'Super Admin' },
];

const locationOptions = [
  { value: 'wh01', label: 'Main Warehouse (WH01)' },
  { value: 'wh02', label: 'North Warehouse (WH02)' },
  { value: 'st01', label: 'Store 01 (ST01)' },
  { value: 'st02', label: 'Store 02 (ST02)' },
  { value: 'st03', label: 'Store 03 (ST03)' },
];

export default function CreateUserPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add User"
        description="Create a new system user"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Users', href: '/users' }, { label: 'Add User' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Full Name" placeholder="e.g. Sam Park" required />
              <Input label="Email Address" type="email" placeholder="sam@a2z.com" required />
              <Input label="Phone" type="tel" placeholder="+91 98765 43210" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Access & Role</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select label="Role" options={roleOptions} required />
              <Select label="Assigned Location" options={locationOptions} placeholder="Select location" hint="Not required for Super Admin" />
              <Input label="Temporary Password" type="password" placeholder="Min. 8 characters" required hint="User will be prompted to change on first login" />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button className="w-full">Create User</Button>
              <a href="/users">
                <Button variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
