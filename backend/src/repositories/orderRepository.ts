import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { OrderStatus, StoreOrder } from '../types.js';

function mapOrder(row: QueryResultRow): StoreOrder {
  return {
    id: row.id,
    order_id: row.order_id,
    store_id: row.store_id,
    warehouse_id: row.warehouse_id,
    status: row.status,
    items: Array.isArray(row.items) ? row.items : JSON.parse(row.items ?? '[]'),
    created_by: row.created_by,
    approved_by: row.approved_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listOrders(params: { role: string; locationId?: string }) {
  let query = 'select * from store_orders';
  const values: Array<string> = [];
  if (params.role === 'warehouse_manager' && params.locationId) {
    values.push(params.locationId);
    query += ' where warehouse_id::text = $1 or warehouse_id = (select id from locations where location_code = $1 limit 1)';
  } else if (params.role === 'store_manager' && params.locationId) {
    values.push(params.locationId);
    query += ' where store_id::text = $1 or store_id = (select id from locations where location_code = $1 limit 1)';
  }
  query += ' order by created_at desc';
  const result = await pool.query(query, values);
  return result.rows.map(mapOrder);
}

export async function findOrderById(id: string) {
  const result = await pool.query('select * from store_orders where id::text = $1 or order_id = $1 limit 1', [id]);
  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}

export async function createOrder(input: {
  orderId: string;
  storeId: string;
  warehouseId: string;
  items: unknown[];
  createdBy: string;
}) {
  const result = await pool.query(
    `insert into store_orders (order_id, store_id, warehouse_id, status, items, reserved_amount, created_by)
     values ($1, $2, $3, 'draft', $4::jsonb, 0, $5)
     returning *`,
    [input.orderId, input.storeId, input.warehouseId, JSON.stringify(input.items), input.createdBy],
  );
  return mapOrder(result.rows[0]);
}

export async function updateOrderStatus(id: string, status: OrderStatus, approvedBy?: string) {
  const result = await pool.query(
    `update store_orders
     set status = $2::varchar,
         approved_by = coalesce($3::uuid, approved_by),
         dispatched_at = case when $2::varchar = 'dispatched' then now() else dispatched_at end,
         received_at = case when $2::varchar = 'store_received' then now() else received_at end,
         updated_at = now()
     where id::text = $1::text or order_id = $1::text
     returning *`,
    [id, status, approvedBy ?? null],
  );
  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}
