import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

export default function CreateClientPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add Client"
        description="Register a new third-party client store"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: 'Add Client' }]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Client Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Store Name" placeholder="e.g. TechMart Retail" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Owner Name" placeholder="e.g. Arun Mehta" />
                <Input label="GST Number" placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" type="email" placeholder="owner@store.com" />
                <Input label="Phone" type="tel" placeholder="+91 98000 00000" />
              </div>
              <Input label="Address" placeholder="Shop address, city, state" />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button className="w-full">Add Client</Button>
              <a href="/clients">
                <Button variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
