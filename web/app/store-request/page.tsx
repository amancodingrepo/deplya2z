import { AppHeader } from '../../components/AppHeader';
import { InventoryList } from '../../components/InventoryList';
import { StoreRequestForm } from '../../components/StoreRequestForm';
import { getInventory, getProducts, loginForRole } from '../../lib/api';

export default async function StoreRequestPage() {
  const warehouseToken = await loginForRole('warehouse@company.com', '1234');
  const storeToken = await loginForRole('store@company.com', '1234');
  const warehouseInventory = await getInventory(warehouseToken, 'WH01').catch(() => []);
  const storeInventory = await getInventory(storeToken, 'ST01').catch(() => []);
  const products = await getProducts(storeToken).catch(() => []);

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <AppHeader />
      <h1>Warehouse Lists Items • Store Requests Items</h1>
      <p>
        This page demonstrates both role flows against the same backend API and database model.
      </p>

      <InventoryList title="Warehouse Inventory (WH01)" rows={warehouseInventory} />
      <InventoryList title="Store Inventory (ST01)" rows={storeInventory} />
      <StoreRequestForm token={storeToken} storeId="ST01" warehouseId="WH01" products={products} />
    </main>
  );
}
