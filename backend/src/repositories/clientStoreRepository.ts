import { pool } from '../database/connection.js';

export async function findClientStoreById(id: string) {
  const result = await pool.query('select * from client_stores where id = $1 limit 1', [id]);
  return result.rows[0] ?? null;
}

export async function listClientStores() {
  const result = await pool.query('select * from client_stores where status = $1 order by store_name asc', ['active']);
  return result.rows;
}
