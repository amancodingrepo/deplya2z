import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { BulkOrder, BulkOrderStatus } from '../types.js';

function mapBulkOrder(row: QueryResultRow): BulkOrder {
  return {
    id: row.id,
    order_id: row.order_id,
    client_store_id: row.client_store_id,
    warehouse_id: row.warehouse_id,
    status: row.status,
    items: Array.isArray(row.items) ? row.items : JSON.parse(row.items ?? '[]'),
    reserved_amount: Number(row.reserved_amount),
    created_by: row.created_by,
    dispatched_at: row.dispatched_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listBulkOrders(params: { role: string; locationId?: string }) {
  let query = 'select * from bulk_orders';
  const values: string[] = [];
  if (params.role === 'warehouse_manager' && params.locationId) {
    values.push(params.locationId);
    query += ' where warehouse_id::text = $1 or warehouse_id = (select id from locations where location_code = $1 limit 1)';
  }
  query += ' order by created_at desc';
  const result = await pool.query(query, values);
  return result.rows.map(mapBulkOrder);
}

export async function findBulkOrderById(id: string) {
  const result = await pool.query('select * from bulk_orders where id = $1 or order_id = $1 limit 1', [id]);
  return result.rows[0] ? mapBulkOrder(result.rows[0]) : null;
}

export async function createBulkOrder(input: {
  orderId: string;
  clientStoreId: string;
  warehouseId: string;
  items: unknown[];
  createdBy: string;
  status?: BulkOrderStatus;
}) {
  const status = input.status ?? 'confirmed';
  const reservedAmount = (input.items as Array<{ qty?: number }>).reduce(
    (sum, item) => sum + Number(item.qty ?? 0),
    0,
  );

  const result = await pool.query(
    `insert into bulk_orders (order_id, client_store_id, warehouse_id, status, items, reserved_amount, created_by)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7)
     returning *`,
    [
      input.orderId,
      input.clientStoreId,
      input.warehouseId,
      status,
      JSON.stringify(input.items),
      reservedAmount,
      input.createdBy,
    ],
  );
  return mapBulkOrder(result.rows[0]);
}

export async function updateBulkOrderStatus(id: string, status: BulkOrderStatus) {
  const result = await pool.query(
    `update bulk_orders
     set status = $2,
         dispatched_at = case when $2 = 'dispatched' then now() else dispatched_at end,
         updated_at = now()
     where id = $1 or order_id = $1
     returning *`,
    [id, status],
  );
  return result.rows[0] ? mapBulkOrder(result.rows[0]) : null;
}
