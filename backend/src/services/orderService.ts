import { v4 as uuid } from 'uuid';

import { AuthorizationError, ConflictAppError, NotFoundError, ValidationAppError } from '../shared/errors.js';
import { findLocationByCode } from '../repositories/locationRepository.js';
import { listInventory } from '../repositories/inventoryRepository.js';
import {
  createOrder,
  findOrderById,
  listOrders,
  updateOrderStatus,
} from '../repositories/orderRepository.js';
import type { InventoryRow } from '../types.js';

export async function getOrdersForUser(role: string, locationId?: string) {
  return listOrders({ role, locationId });
}

export async function createStoreOrderDraft(input: {
  storeId: string;
  warehouseId: string;
  items: Array<{ product_id: string; qty: number }>;
  createdBy: string;
  role: string;
  locationId?: string | null;
}) {
  if (input.role !== 'store_manager') {
    throw new AuthorizationError('Only store managers can create store orders');
  }

  if (input.locationId !== input.storeId) {
    throw new AuthorizationError('Store scope violation', 'STORE_SCOPE_VIOLATION');
  }

  const store = await findLocationByCode(input.storeId);
  const warehouse = await findLocationByCode(input.warehouseId);
  if (!store || !warehouse) {
    throw new NotFoundError('Warehouse not found');
  }

  const inventory = await listInventory({ locationId: warehouse.id });
  for (const item of input.items) {
    const row = inventory.find((inventoryRow: InventoryRow) => inventoryRow.product_id === item.product_id);
    if (!row || row.available_stock < item.qty) {
      throw new ValidationAppError(`Insufficient stock for ${item.product_id}`, 'INSUFFICIENT_STOCK');
    }
  }

  const orderId = `ORD-${input.storeId}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
  const order = await createOrder({
    orderId,
    storeId: store.id,
    warehouseId: warehouse.id,
    items: input.items,
    createdBy: input.createdBy,
  });

  return order;
}

export async function transitionOrder(input: {
  orderId: string;
  actorRole: string;
  actorUserId: string;
  actorLocationId?: string | null;
  target: 'confirmed' | 'packed' | 'dispatched' | 'store_received' | 'completed';
}) {
  const order = await findOrderById(input.orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (input.target === 'confirmed' && input.actorRole !== 'superadmin') {
    throw new AuthorizationError('Only superadmin can approve store orders');
  }
  if ((input.target === 'packed' || input.target === 'dispatched') && input.actorRole !== 'warehouse_manager') {
    throw new AuthorizationError('Only warehouse manager can pack/dispatch');
  }
  if ((input.target === 'store_received' || input.target === 'completed') && input.actorRole !== 'store_manager') {
    throw new AuthorizationError('Only store manager can confirm receipt');
  }

  const allowed: Record<string, string[]> = {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['packed', 'cancelled'],
    packed: ['dispatched', 'cancelled'],
    dispatched: ['store_received', 'cancelled'],
    store_received: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  if (!allowed[order.status]?.includes(input.target)) {
    throw new ConflictAppError('Invalid status transition', 'INVALID_STATUS_TRANSITION');
  }

  if (input.target === 'packed' || input.target === 'dispatched') {
    const actorLocation = input.actorLocationId ? await findLocationByCode(input.actorLocationId) : null;
    if (!actorLocation || order.warehouse_id !== actorLocation.id) {
      throw new AuthorizationError('Warehouse scope violation', 'WAREHOUSE_SCOPE_VIOLATION');
    }
  }
  if (input.target === 'store_received' || input.target === 'completed') {
    const actorLocation = input.actorLocationId ? await findLocationByCode(input.actorLocationId) : null;
    if (!actorLocation || order.store_id !== actorLocation.id) {
      throw new AuthorizationError('Store scope violation', 'STORE_SCOPE_VIOLATION');
    }
  }

  const approvedBy = input.target === 'confirmed' ? input.actorUserId : undefined;
  const updated = await updateOrderStatus(order.id, input.target, approvedBy);
  return updated;
}
