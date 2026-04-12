import { AppHeader } from '../../components/AppHeader';
import { InventoryList } from '../../components/InventoryList';
import { getInventory, loginForRole } from '../../lib/api';

export default async function WarehousePage() {
  const warehouseToken = await loginForRole('warehouse@company.com', '1234');
  const warehouseInventory = await getInventory(warehouseToken, 'WH01').catch(() => []);

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <AppHeader />
      <h1>Warehouse Inventory Listing</h1>
      <p>Warehouse manager can list available, reserved, and total stock for dispatch planning.</p>
      <InventoryList title="Warehouse Inventory (WH01)" rows={warehouseInventory} />
    </main>
  );
}
