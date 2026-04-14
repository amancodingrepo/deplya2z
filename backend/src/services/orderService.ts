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
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';
import { recordReservation, recordDispatch, recordReceipt } from './inventoryService.js';
import logger from '../utils/logger.js';
import { generateOrderId } from '../utils/helpers.js';

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
    throw new NotFoundError('Store or warehouse not found');
  }

  // Validate stock availability
  const inventory = await listInventory({ locationId: warehouse.id });
  for (const item of input.items) {
    const row = inventory.find((inventoryRow: InventoryRow) => inventoryRow.product_id === item.product_id);
    if (!row || row.available_stock < item.qty) {
      throw new ValidationAppError(
        `Insufficient stock for product ${item.product_id}. Available: ${row?.available_stock || 0}, Requested: ${item.qty}`,
        'INSUFFICIENT_STOCK'
      );
    }
  }

  // Generate unique order ID
  const orderCount = await getOrderCountToday(store.location_code);
  const orderId = generateOrderId('ORD', store.location_code, orderCount + 1);

  const order = await createOrder({
    orderId,
    storeId: store.id,
    warehouseId: warehouse.id,
    items: input.items,
    createdBy: input.createdBy,
  });

  // Audit log
  await auditService.logSuccess(
    input.createdBy,
    'create',
    'store_order',
    order.id,
    `Store order ${orderId} created with ${input.items.length} items`
  );

  logger.info({ orderId, storeId: store.id, warehouseId: warehouse.id }, 'Store order created');

  return order;
}

// Helper function to get today's order count for ID generation
async function getOrderCountToday(locationCode: string): Promise<number> {
  // This should query the database for today's orders
  // For now, using random number as fallback
  return Math.floor(Math.random() * 100);
}

export async function transitionOrder(input: {
  orderId: string;
  actorRole: string;
  actorUserId: string;
  actorLocationId?: string | null;
  target: 'confirmed' | 'packed' | 'dispatched' | 'store_received' | 'completed';
  dispatchNotes?: string;
}) {
  const order = await findOrderById(input.orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  // Authorization checks
  if (input.target === 'confirmed' && input.actorRole !== 'superadmin') {
    throw new AuthorizationError('Only superadmin can approve store orders');
  }
  if ((input.target === 'packed' || input.target === 'dispatched') && input.actorRole !== 'warehouse_manager') {
    throw new AuthorizationError('Only warehouse manager can pack/dispatch');
  }
  if ((input.target === 'store_received' || input.target === 'completed') && input.actorRole !== 'store_manager') {
    throw new AuthorizationError('Only store manager can confirm receipt');
  }

  // State machine validation
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
    throw new ConflictAppError(
      `Cannot transition from ${order.status} to ${input.target}`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Location scope validation
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

  // Handle inventory operations based on status transition
  if (input.target === 'confirmed') {
    // Reserve stock when order is approved
    await recordReservation(order.id, input.actorUserId);
    logger.info({ orderId: order.id, orderIdReadable: order.order_id }, 'Stock reserved for order');
  }

  if (input.target === 'dispatched') {
    // Deduct stock when order is dispatched
    await recordDispatch(order.id, input.actorUserId);
    logger.info({ orderId: order.id, orderIdReadable: order.order_id }, 'Stock deducted for dispatched order');
  }

  if (input.target === 'store_received') {
    // Add stock to store when received
    await recordReceipt(order.id, input.actorUserId);
    logger.info({ orderId: order.id, orderIdReadable: order.order_id }, 'Stock added to store inventory');
  }

  // Update order status
  const approvedBy = input.target === 'confirmed' ? input.actorUserId : undefined;
  const updated = await updateOrderStatus(order.id, input.target, approvedBy);

  // Audit logging
  await auditService.logSuccess(
    input.actorUserId,
    input.target === 'confirmed' ? 'approve' : input.target === 'dispatched' ? 'dispatch' : 'update',
    'store_order',
    order.id,
    `Order ${order.order_id} transitioned from ${order.status} to ${input.target}`,
    {
      before: { status: order.status },
      after: { status: input.target },
    }
  );

  // Send notifications
  if (input.target === 'confirmed') {
    await notificationService.notifyOrderConfirmed(
      order.warehouse_id,
      order.order_id,
      `New order ready to pack: ${order.order_id}`
    );
  }

  if (input.target === 'dispatched') {
    await notificationService.notifyOrderDispatched(
      order.store_id,
      order.order_id,
      `Your order ${order.order_id} is on the way. Please confirm receipt.`
    );
  }

  if (input.target === 'completed') {
    logger.info({ orderId: order.id, orderIdReadable: order.order_id }, 'Order completed successfully');
  }

  return updated;
}
