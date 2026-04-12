import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { Product } from '../types.js';

function mapProduct(row: QueryResultRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    brand: row.brand,
    status: row.status,
  };
}

export async function listProducts(params: { q?: string; status?: string }) {
  const clauses: string[] = [];
  const values: Array<string> = [];
  if (params.q) {
    values.push(`%${params.q}%`);
    values.push(`%${params.q}%`);
    clauses.push(`(title ILIKE $${values.length - 1} OR sku ILIKE $${values.length})`);
  }
  if (params.status) {
    values.push(params.status);
    clauses.push(`status = $${values.length}`);
  }

  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  const result = await pool.query(`select * from products ${where} order by title asc`, values);
  return result.rows.map(mapProduct);
}
