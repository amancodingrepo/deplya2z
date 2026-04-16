import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';

const typeOptions = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'store', label: 'Store' },
];

export default function CreateLocationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add Location"
        description="Create a new warehouse or store location"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Locations', href: '/locations' }, { label: 'Add Location' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Location Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Location Name" placeholder="e.g. Main Warehouse" required />
                <Input label="Location Code" placeholder="e.g. WH01" required hint="2–10 characters, unique" />
              </div>
              <Select label="Type" options={typeOptions} required />
              <Input label="Address" placeholder="Street, City, State" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Latitude" type="number" placeholder="28.6139" />
                <Input label="Longitude" type="number" placeholder="77.2090" />
              </div>
              <Input label="Geofence Radius (meters)" type="number" defaultValue={100} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button className="w-full">Create Location</Button>
              <a href="/locations">
                <Button variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
