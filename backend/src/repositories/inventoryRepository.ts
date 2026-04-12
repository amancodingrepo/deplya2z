import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { InventoryRow, StockMovement } from '../types.js';

function mapInventory(row: QueryResultRow): InventoryRow {
  return {
    product_id: row.product_id,
    sku: row.sku,
    title: row.title,
    location_id: row.location_id,
    available_stock: Number(row.available_stock),
    reserved_stock: Number(row.reserved_stock),
    total_stock: Number(row.total_stock),
    issued_stock: Number(row.issued_stock ?? 0),
  };
}

export async function listInventory(params: { locationId?: string; productId?: string }) {
  const clauses: string[] = [];
  const values: string[] = [];
  if (params.locationId) {
    values.push(params.locationId);
    clauses.push(`i.location_id = $${values.length}`);
  }
  if (params.productId) {
    values.push(params.productId);
    clauses.push(`i.product_id = $${values.length}`);
  }
  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const result = await pool.query(
    `select
      i.product_id,
      p.sku,
      p.title,
      i.location_id,
      (i.total_stock - i.reserved_stock) as available_stock,
      i.reserved_stock,
      i.total_stock,
      i.issued_stock
     from inventory i
     join products p on p.id = i.product_id
     ${where}
     order by p.title asc`,
    values,
  );
  return result.rows.map(mapInventory);
}

export async function listLowStock(params: { locationId?: string; threshold: number }) {
  const values: Array<string | number> = [params.threshold];
  const clauses = [`(i.total_stock - i.reserved_stock) <= $1`];
  if (params.locationId) {
    values.push(params.locationId);
    clauses.push(`i.location_id = $${values.length}`);
  }
  const result = await pool.query(
    `select
      i.product_id,
      p.sku,
      p.title,
      i.location_id,
      (i.total_stock - i.reserved_stock) as available_stock,
      i.reserved_stock,
      i.total_stock,
      i.issued_stock
     from inventory i
     join products p on p.id = i.product_id
     where ${clauses.join(' and ')}
     order by available_stock asc`,
    values,
  );
  return result.rows.map(mapInventory);
}

function mapStockMovement(row: QueryResultRow): StockMovement {
  return {
    id: row.id,
    product_id: row.product_id,
    from_location_id: row.from_location_id,
    to_location_id: row.to_location_id,
    quantity: Number(row.quantity),
    movement_type: row.movement_type,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    reason: row.reason,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export async function listStockMovements(params: {
  locationId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const clauses: string[] = [];
  const values: string[] = [];

  if (params.locationId) {
    values.push(params.locationId);
    clauses.push(`(from_location_id = $${values.length} or to_location_id = $${values.length})`);
  }
  if (params.productId) {
    values.push(params.productId);
    clauses.push(`product_id = $${values.length}`);
  }
  if (params.dateFrom) {
    values.push(params.dateFrom);
    clauses.push(`created_at >= $${values.length}::timestamp`);
  }
  if (params.dateTo) {
    values.push(params.dateTo);
    clauses.push(`created_at <= $${values.length}::timestamp`);
  }

  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const result = await pool.query(`select * from stock_movements ${where} order by created_at desc`, values);
  return result.rows.map(mapStockMovement);
}
