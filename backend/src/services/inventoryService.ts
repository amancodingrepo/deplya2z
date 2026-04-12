import { pool } from '../database/connection.js';
import { findBulkOrderById, updateBulkOrderStatus } from '../repositories/bulkOrderRepository.js';
import { findLocationByCode } from '../repositories/locationRepository.js';
import { listInventory, listLowStock, listStockMovements } from '../repositories/inventoryRepository.js';
import { findOrderById } from '../repositories/orderRepository.js';
import { AppError, NotFoundError } from '../shared/errors.js';

export async function getInventoryForLocation(locationId?: string, productId?: string) {
  const location = locationId ? await findLocationByCode(locationId) : null;
  if (locationId && !location) {
    return [];
  }
  return listInventory({ locationId: location?.id, productId });
}

export async function getLowStockForLocation(locationId?: string, threshold = 3) {
  const location = locationId ? await findLocationByCode(locationId) : null;
  if (locationId && !location) {
    return [];
  }
  return listLowStock({ locationId: location?.id, threshold });
}

export async function getStockMovements(input: {
  actorRole: string;
  actorLocationCode?: string | null;
  locationId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const scopedLocationCode =
    input.actorRole === 'superadmin' ? input.locationId : (input.actorLocationCode ?? undefined);
  const location = scopedLocationCode ? await findLocationByCode(scopedLocationCode) : null;
  if (scopedLocationCode && !location) {
    return [];
  }

  return listStockMovements({
    locationId: location?.id,
    productId: input.productId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });
}

type OrderLikeItem = { product_id: string; qty: number };

async function insertStockMovement(input: {
  client: Awaited<ReturnType<typeof pool.connect>>;
  productId: string;
  fromLocationId: string | null;
  toLocationId: string;
  quantity: number;
  movementType: 'order_reserved' | 'order_deducted' | 'order_issued';
  referenceType: 'store_order' | 'bulk_order';
  referenceId: string;
  actorId: string;
  reason?: string;
}) {
  await input.client.query(
    `insert into stock_movements (
      product_id, from_location_id, to_location_id, quantity, movement_type,
      reference_type, reference_id, reason, created_by
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.productId,
      input.fromLocationId,
      input.toLocationId,
      input.quantity,
      input.movementType,
      input.referenceType,
      input.referenceId,
      input.reason ?? null,
      input.actorId,
    ],
  );
}

async function reserveWarehouseStock(input: {
  items: OrderLikeItem[];
  warehouseId: string;
  referenceType: 'store_order' | 'bulk_order';
  referenceId: string;
  actorId: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const item of input.items) {
      const current = await client.query(
        'select total_stock, reserved_stock from inventory where product_id = $1 and location_id = $2 for update',
        [item.product_id, input.warehouseId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new AppError('Inventory row not found', 400, 'INVENTORY_NOT_FOUND');
      }
      if ((Number(row.total_stock) - Number(row.reserved_stock)) < item.qty) {
        throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
      }

      await client.query(
        'update inventory set reserved_stock = reserved_stock + $1, updated_at = now() where product_id = $2 and location_id = $3',
        [item.qty, item.product_id, input.warehouseId],
      );

      await insertStockMovement({
        client,
        productId: item.product_id,
        fromLocationId: input.warehouseId,
        toLocationId: input.warehouseId,
        quantity: item.qty,
        movementType: 'order_reserved',
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        actorId: input.actorId,
      });
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function dispatchWarehouseStock(input: {
  items: OrderLikeItem[];
  warehouseId: string;
  storeId?: string;
  referenceType: 'store_order' | 'bulk_order';
  referenceId: string;
  actorId: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const item of input.items) {
      const current = await client.query(
        'select total_stock, reserved_stock from inventory where product_id = $1 and location_id = $2 for update',
        [item.product_id, input.warehouseId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new AppError('Inventory row not found', 400, 'INVENTORY_NOT_FOUND');
      }
      if (Number(row.reserved_stock) < item.qty) {
        throw new AppError('Reserved stock mismatch', 409, 'RESERVED_STOCK_MISMATCH');
      }
      if (Number(row.total_stock) < item.qty) {
        throw new AppError('Total stock mismatch', 409, 'TOTAL_STOCK_MISMATCH');
      }

      await client.query(
        `update inventory
         set reserved_stock = reserved_stock - $1,
             total_stock = total_stock - $1,
             issued_stock = issued_stock + $1,
             updated_at = now()
         where product_id = $2 and location_id = $3`,
        [item.qty, item.product_id, input.warehouseId],
      );

      await insertStockMovement({
        client,
        productId: item.product_id,
        fromLocationId: input.warehouseId,
        toLocationId: input.warehouseId,
        quantity: item.qty,
        movementType: 'order_deducted',
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        actorId: input.actorId,
      });

      if (input.storeId) {
        await insertStockMovement({
          client,
          productId: item.product_id,
          fromLocationId: input.warehouseId,
          toLocationId: input.storeId,
          quantity: item.qty,
          movementType: 'order_issued',
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          actorId: input.actorId,
        });
      }
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function recordReservation(orderId: string, actorId: string) {
  const order = await findOrderById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  await reserveWarehouseStock({
    items: order.items,
    warehouseId: order.warehouse_id,
    referenceType: 'store_order',
    referenceId: order.order_id,
    actorId,
  });
}

export async function recordDispatch(orderId: string, actorId: string) {
  const order = await findOrderById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  await dispatchWarehouseStock({
    items: order.items,
    warehouseId: order.warehouse_id,
    referenceType: 'store_order',
    referenceId: order.order_id,
    actorId,
  });
}

export async function recordReceipt(orderId: string, actorId: string) {
  const order = await findOrderById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const item of order.items) {
      await client.query(
        `insert into inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
         values ($1, $2, $3, 0, 0)
         on conflict (product_id, location_id)
         do update set total_stock = inventory.total_stock + excluded.total_stock, updated_at = now()`,
        [item.product_id, order.store_id, item.qty],
      );

      await insertStockMovement({
        client,
        productId: item.product_id,
        fromLocationId: order.warehouse_id,
        toLocationId: order.store_id,
        quantity: item.qty,
        movementType: 'order_issued',
        referenceType: 'store_order',
        referenceId: order.order_id,
        actorId,
      });
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function recordBulkReservation(bulkOrderId: string, actorId: string) {
  const order = await findBulkOrderById(bulkOrderId);
  if (!order) {
    throw new NotFoundError('Bulk order not found');
  }

  await reserveWarehouseStock({
    items: order.items,
    warehouseId: order.warehouse_id,
    referenceType: 'bulk_order',
    referenceId: order.order_id,
    actorId,
  });
}

export async function recordBulkDispatchAndComplete(bulkOrderId: string, actorId: string) {
  const order = await findBulkOrderById(bulkOrderId);
  if (!order) {
    throw new NotFoundError('Bulk order not found');
  }

  await dispatchWarehouseStock({
    items: order.items,
    warehouseId: order.warehouse_id,
    referenceType: 'bulk_order',
    referenceId: order.order_id,
    actorId,
  });

  return updateBulkOrderStatus(order.id, 'completed');
}
