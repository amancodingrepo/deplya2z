import { v4 as uuid } from 'uuid';

import type {
  AuditLog,
  InventoryRow,
  Location,
  OrderStatus,
  Product,
  StockMovement,
  StoreOrder,
  User,
} from '../types.js';

const nowIso = () => new Date().toISOString();

export const users: User[] = [
  {
    id: 'u-superadmin',
    email: 'admin@company.com',
    name: 'System Admin',
    role: 'superadmin',
    location_id: null,
    status: 'active',
  },
  {
    id: 'u-wh-1',
    email: 'warehouse@company.com',
    name: 'Warehouse Manager',
    role: 'warehouse_manager',
    location_id: 'WH01',
    status: 'active',
  },
  {
    id: 'u-st-1',
    email: 'store@company.com',
    name: 'Store Manager',
    role: 'store_manager',
    location_id: 'ST01',
    status: 'active',
  },
];

export const locations: Location[] = [
  {
    id: 'loc-wh-01',
    location_code: 'WH01',
    name: 'Main Warehouse',
    type: 'warehouse',
    status: 'active',
  },
  {
    id: 'loc-st-01',
    location_code: 'ST01',
    name: 'Store 01',
    type: 'store',
    status: 'active',
  },
];

export const products: Product[] = [
  {
    id: 'P001',
    sku: 'SKU-TV-001',
    title: 'Samsung 55in TV',
    brand: 'Samsung',
    status: 'present',
  },
  {
    id: 'P002',
    sku: 'SKU-FRD-001',
    title: 'LG Double Door Fridge',
    brand: 'LG',
    status: 'present',
  },
];

export const inventoryRows: InventoryRow[] = [
  {
    product_id: 'P001',
    sku: 'SKU-TV-001',
    title: 'Samsung 55in TV',
    location_id: 'WH01',
    available_stock: 15,
    reserved_stock: 2,
    total_stock: 17,
    issued_stock: 0,
  },
  {
    product_id: 'P002',
    sku: 'SKU-FRD-001',
    title: 'LG Double Door Fridge',
    location_id: 'WH01',
    available_stock: 8,
    reserved_stock: 1,
    total_stock: 9,
    issued_stock: 0,
  },
  {
    product_id: 'P001',
    sku: 'SKU-TV-001',
    title: 'Samsung 55in TV',
    location_id: 'ST01',
    available_stock: 3,
    reserved_stock: 0,
    total_stock: 3,
    issued_stock: 0,
  },
  {
    product_id: 'P002',
    sku: 'SKU-FRD-001',
    title: 'LG Double Door Fridge',
    location_id: 'ST01',
    available_stock: 1,
    reserved_stock: 0,
    total_stock: 1,
    issued_stock: 0,
  },
];

export const storeOrders: StoreOrder[] = [
  {
    id: 'o-1',
    order_id: 'ORD-ST01-20260412-0001',
    store_id: 'ST01',
    warehouse_id: 'WH01',
    status: 'confirmed',
    items: [{ product_id: 'P001', title: 'Samsung 55in TV', sku: 'SKU-TV-001', qty: 2 }],
    created_by: 'u-st-1',
    approved_by: 'u-superadmin',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

export const idempotencyCache = new Map<string, unknown>();
export const stockMovements: StockMovement[] = [];
export const auditLogs: AuditLog[] = [];

export function getUserByToken(token: string): User | undefined {
  const role = token.replace('token-', '');
  return users.find((u) => u.role === role);
}

export function createStoreOrder(params: {
  storeId: string;
  warehouseId: string;
  items: StoreOrder['items'];
  createdBy: string;
}) {
  const createdAt = nowIso();
  const row: StoreOrder = {
    id: uuid(),
    order_id: `ORD-${params.storeId}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(Math.random() * 9000) + 1000}`,
    store_id: params.storeId,
    warehouse_id: params.warehouseId,
    status: 'draft',
    items: params.items,
    created_by: params.createdBy,
    approved_by: null,
    created_at: createdAt,
    updated_at: createdAt,
  };

  storeOrders.unshift(row);
  appendAuditLog({
    actor_user_id: params.createdBy,
    action: 'create',
    entity_type: 'store_order',
    entity_id: row.id,
    success: true,
    details: `Order ${row.order_id} created in draft`,
  });
  return row;
}

export function updateOrderStatus(id: string, status: OrderStatus, approvedBy?: string) {
  const order = storeOrders.find((o) => o.id === id || o.order_id === id);
  if (!order) {
    return undefined;
  }
  order.status = status;
  order.updated_at = nowIso();
  if (approvedBy) {
    order.approved_by = approvedBy;
  }
  return order;
}

export function getOrderById(id: string) {
  return storeOrders.find((o) => o.id === id || o.order_id === id);
}

export function canTransition(from: OrderStatus, to: OrderStatus) {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['packed', 'cancelled'],
    packed: ['dispatched', 'cancelled'],
    dispatched: ['store_received', 'cancelled'],
    store_received: ['completed', 'cancelled'],
    completed: ['cancelled'],
    cancelled: [],
  };
  return transitions[from].includes(to);
}

export function reserveStockForOrder(order: StoreOrder, actorUserId: string) {
  for (const item of order.items) {
    const row = inventoryRows.find(
      (r) => r.location_id === order.warehouse_id && r.product_id === item.product_id,
    );
    if (!row) {
      throw new Error(`INVENTORY_NOT_FOUND:${item.product_id}`);
    }
    if (row.available_stock < item.qty) {
      throw new Error(`INSUFFICIENT_STOCK:${item.product_id}`);
    }
    row.reserved_stock += item.qty;
    row.available_stock = row.total_stock - row.reserved_stock;

    appendStockMovement({
      product_id: item.product_id,
      from_location_id: order.warehouse_id,
      to_location_id: order.warehouse_id,
      quantity: item.qty,
      movement_type: 'order_reserved',
      reference_type: 'store_order',
      reference_id: order.order_id,
      created_by: actorUserId,
    });
  }
}

export function dispatchOrderStock(order: StoreOrder, actorUserId: string) {
  for (const item of order.items) {
    const row = inventoryRows.find(
      (r) => r.location_id === order.warehouse_id && r.product_id === item.product_id,
    );
    if (!row) {
      throw new Error(`INVENTORY_NOT_FOUND:${item.product_id}`);
    }
    if (row.reserved_stock < item.qty) {
      throw new Error(`INSUFFICIENT_RESERVED_STOCK:${item.product_id}`);
    }

    row.reserved_stock -= item.qty;
    row.total_stock -= item.qty;
    row.issued_stock += item.qty;
    row.available_stock = row.total_stock - row.reserved_stock;

    appendStockMovement({
      product_id: item.product_id,
      from_location_id: order.warehouse_id,
      to_location_id: order.store_id,
      quantity: item.qty,
      movement_type: 'order_deducted',
      reference_type: 'store_order',
      reference_id: order.order_id,
      created_by: actorUserId,
    });
  }
}

export function confirmReceiptStock(order: StoreOrder, actorUserId: string) {
  for (const item of order.items) {
    let row = inventoryRows.find(
      (r) => r.location_id === order.store_id && r.product_id === item.product_id,
    );
    if (!row) {
      const warehouseRow = inventoryRows.find((r) => r.product_id === item.product_id);
      const newRow: InventoryRow = {
        product_id: item.product_id,
        sku: warehouseRow?.sku ?? 'UNKNOWN',
        title: warehouseRow?.title ?? 'Unknown Item',
        location_id: order.store_id,
        available_stock: 0,
        reserved_stock: 0,
        total_stock: 0,
        issued_stock: 0,
      };
      inventoryRows.push(newRow);
      row = newRow;
    }

    row.total_stock += item.qty;
    row.available_stock = row.total_stock - row.reserved_stock;

    appendStockMovement({
      product_id: item.product_id,
      from_location_id: order.warehouse_id,
      to_location_id: order.store_id,
      quantity: item.qty,
      movement_type: 'order_issued',
      reference_type: 'store_order',
      reference_id: order.order_id,
      created_by: actorUserId,
    });
  }
}

export function appendAuditLog(input: Omit<AuditLog, 'id' | 'created_at'>) {
  auditLogs.unshift({
    id: uuid(),
    created_at: nowIso(),
    ...input,
  });
}

function appendStockMovement(input: Omit<StockMovement, 'id' | 'created_at'>) {
  stockMovements.unshift({
    id: uuid(),
    created_at: nowIso(),
    ...input,
  });
}
