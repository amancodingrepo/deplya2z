import { findClientStoreById } from '../repositories/clientStoreRepository.js';
import { pool } from '../database/connection.js';
import {
  createBulkOrder,
  findBulkOrderById,
  listBulkOrders,
  updateBulkOrderStatus,
} from '../repositories/bulkOrderRepository.js';
import { findLocationByCode } from '../repositories/locationRepository.js';
import { listInventory } from '../repositories/inventoryRepository.js';
import { AuthorizationError, ConflictAppError, NotFoundError, ValidationAppError } from '../shared/errors.js';
import type { InventoryRow } from '../types.js';
import { generateOrderId } from '../utils/helpers.js';

export async function getBulkOrdersForUser(role: string, locationId?: string) {
  return listBulkOrders({ role, locationId: locationId ?? undefined });
}

export async function createBulkOrderConfirmed(input: {
  clientStoreId: string;
  warehouseId: string;
  items: Array<{ product_id: string; qty: number }>;
  createdBy: string;
  role: string;
}) {
  if (input.role !== 'superadmin') {
    throw new AuthorizationError('Only superadmin can create bulk orders');
  }

  const client = await findClientStoreById(input.clientStoreId);
  if (!client) {
    throw new NotFoundError('Client store not found', 'CLIENT_STORE_NOT_FOUND');
  }

  const warehouse = await findLocationByCode(input.warehouseId);
  if (!warehouse || warehouse.type !== 'warehouse') {
    throw new NotFoundError('Warehouse not found', 'WAREHOUSE_NOT_FOUND');
  }

  const inventory = await listInventory({ locationId: warehouse.id });
  for (const item of input.items) {
    const row = inventory.find((inventoryRow: InventoryRow) => inventoryRow.product_id === item.product_id);
    if (!row || row.available_stock < item.qty) {
      throw new ValidationAppError(
        `Insufficient stock for ${item.product_id}`,
        'INSUFFICIENT_STOCK',
      );
    }
  }

  const countResult = await pool.query(
    `select count(*)::int as count
     from bulk_orders bo
     where bo.warehouse_id = $1 and bo.created_at::date = current_date`,
    [warehouse.id],
  );
  const sequence = Number(countResult.rows[0]?.count ?? 0) + 1;
  const orderId = generateOrderId('BULK', warehouse.location_code, sequence);

  return createBulkOrder({
    orderId,
    clientStoreId: input.clientStoreId,
    warehouseId: warehouse.id,
    items: input.items,
    createdBy: input.createdBy,
    status: 'confirmed',
  });
}

export async function transitionBulkOrder(input: {
  bulkOrderId: string;
  actorRole: string;
  actorLocationId?: string | null;
  target: 'packed' | 'dispatched' | 'completed';
}) {
  const order = await findBulkOrderById(input.bulkOrderId);
  if (!order) {
    throw new NotFoundError('Bulk order not found', 'BULK_ORDER_NOT_FOUND');
  }

  const allowed: Record<string, string[]> = {
    confirmed: ['packed', 'cancelled'],
    packed: ['dispatched', 'cancelled'],
    dispatched: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  if (!allowed[order.status]?.includes(input.target)) {
    throw new ConflictAppError('Invalid status transition', 'INVALID_STATUS_TRANSITION');
  }

  if (input.target === 'packed' || input.target === 'dispatched') {
    if (input.actorRole !== 'warehouse_manager') {
      throw new AuthorizationError('Only warehouse manager can pack/dispatch bulk orders');
    }
    const actorLocation = input.actorLocationId
      ? await findLocationByCode(input.actorLocationId)
      : null;
    if (!actorLocation || actorLocation.id !== order.warehouse_id) {
      throw new AuthorizationError('Warehouse scope violation', 'WAREHOUSE_SCOPE_VIOLATION');
    }
  }

  if (input.target === 'completed' && input.actorRole !== 'warehouse_manager') {
    throw new AuthorizationError('Only warehouse manager can complete bulk orders');
  }

  return updateBulkOrderStatus(order.id, input.target);
}
