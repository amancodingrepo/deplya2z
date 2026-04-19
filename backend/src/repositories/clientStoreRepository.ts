import { pool } from '../database/connection.js';

export async function findClientStoreById(id: string) {
  const result = await pool.query('SELECT * FROM client_stores WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ?? null;
}

export async function listClientStores() {
  const result = await pool.query(
    'SELECT * FROM client_stores ORDER BY name ASC',
  );
  return result.rows;
}

export async function createClientStore(input: {
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  status?: string;
}) {
  const result = await pool.query(
    `INSERT INTO client_stores
       (name, code, contact_name, contact_email, contact_phone, address, city, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.name,
      input.code,
      input.contact_name ?? null,
      input.contact_email ?? null,
      input.contact_phone ?? null,
      input.address ?? null,
      input.city ?? null,
      input.status ?? 'active',
    ],
  );
  return result.rows[0] ?? null;
}

export async function updateClientStore(
  id: string,
  input: {
    name?: string;
    code?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    city?: string;
    status?: string;
  },
) {
  const fields: string[] = [];
  const values: Array<string | null> = [];

  for (const [key, val] of Object.entries(input)) {
    if (val !== undefined) {
      values.push(val as string);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (fields.length === 0) return findClientStoreById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE client_stores SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

export async function deleteClientStore(id: string) {
  await pool.query('DELETE FROM client_stores WHERE id = $1', [id]);
}
