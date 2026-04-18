import { AppHeader } from '../../components/AppHeader';
import { BulkOrderConsole } from '../../components/BulkOrderConsole';
import { getBulkOrders, getClients, getProducts, loginForRole } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function BulkOrdersPage() {
  let adminToken = '';
  let clients: Awaited<ReturnType<typeof getClients>> = [];
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  let orders: Awaited<ReturnType<typeof getBulkOrders>> = [];
  try {
    adminToken = await loginForRole('admin@company.com', '1234');
    clients = await getClients(adminToken).catch(() => []);
    products = await getProducts(adminToken).catch(() => []);
    orders = await getBulkOrders(adminToken).catch(() => []);
  } catch { /* backend not available */ }

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <AppHeader />
      <h1>Bulk Order Management</h1>
      <p>Superadmin can create third-party bulk orders, auto-confirm stock reservation, and track fulfillment.</p>
      <BulkOrderConsole
        token={adminToken}
        warehouseId="WH01"
        clients={clients}
        products={products}
        initialOrders={orders}
      />
    </main>
  );
}
