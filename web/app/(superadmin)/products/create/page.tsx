import { PageHeader } from '../../../../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';

const categoryOptions = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'laptops', label: 'Laptops' },
  { value: 'phones', label: 'Phones' },
  { value: 'audio', label: 'Audio' },
  { value: 'monitors', label: 'Monitors' },
  { value: 'tablets', label: 'Tablets' },
];

const statusOptions = [
  { value: 'present', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
];

const styleOptions = [
  { value: 'default', label: 'Default' },
  { value: 'premium', label: 'Premium' },
  { value: 'featured', label: 'Featured' },
  { value: 'sale', label: 'Sale' },
  { value: 'catalogue_ready', label: 'Catalogue Ready' },
];

export default function CreateProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add Product"
        description="Create a new product in the catalogue"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products', href: '/products' },
          { label: 'Add Product' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main form */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Product Title" placeholder="e.g. Samsung 55″ QLED TV" required />
              <Input label="Short Name" placeholder="e.g. Samsung TV 55" required hint="Used in compact views" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="SKU" placeholder="SKU-TV-001" required />
                <Input label="Brand" placeholder="e.g. Samsung" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Model" placeholder="e.g. QN55Q80C" />
                <Input label="Color" placeholder="e.g. Black" />
              </div>
              <Select label="Category" options={categoryOptions} placeholder="Select category" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Media</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                Drop image here or{' '}
                <label className="ml-1 cursor-pointer text-primary hover:underline">
                  browse
                  <input type="file" accept="image/*" className="sr-only" aria-label="Upload product image" />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Select label="Status" options={statusOptions} />
              <Select label="Display Style" options={styleOptions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button className="w-full">Save Product</Button>
              <a href="/products">
                <Button variant="outline" className="w-full">Cancel</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
