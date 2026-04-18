export const dynamic = 'force-dynamic';

import { AppHeader } from '../../components/AppHeader';
import { InventoryList } from '../../components/InventoryList';
import { StoreRequestForm } from '../../components/StoreRequestForm';
import { getInventory, getProducts, loginForRole } from '../../lib/api';

export default async function StorePage() {
  let storeToken = '';
  let storeInventory: Awaited<ReturnType<typeof getInventory>> = [];
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    storeToken = await loginForRole('store@company.com', '1234');
    storeInventory = await getInventory(storeToken, 'ST01').catch(() => []);
    products = await getProducts(storeToken).catch(() => []);
  } catch { /* backend not available */ }

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <AppHeader />
      <h1>Store Request Workflow</h1>
      <p>Store manager can review store stock and request items from the warehouse.</p>
      <InventoryList title="Store Inventory (ST01)" rows={storeInventory} />
      <StoreRequestForm token={storeToken} storeId="ST01" warehouseId="WH01" products={products} />
    </main>
  );
}
