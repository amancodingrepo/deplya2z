import { AppHeader } from '../../components/AppHeader';
import { InventoryList } from '../../components/InventoryList';
import { StoreRequestForm } from '../../components/StoreRequestForm';
import { getInventory, getProducts, loginForRole } from '../../lib/api';

export default async function StorePage() {
  const storeToken = await loginForRole('store@company.com', '1234');
  const storeInventory = await getInventory(storeToken, 'ST01').catch(() => []);
  const products = await getProducts(storeToken).catch(() => []);

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
