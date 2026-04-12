import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { User } from '../types.js';

function mapUser(row: QueryResultRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    location_id: row.location_id,
    status: row.status,
  };
}

export async function findUserByEmail(email: string) {
  const result = await pool.query('select * from users where email = $1 limit 1', [email]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserByEmailWithPassword(email: string) {
  const result = await pool.query(
    `select u.*, l.location_code
     from users u
     left join locations l on l.id = u.location_id
     where u.email = $1
     limit 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findSessionUserById(id: string) {
  const result = await pool.query(
    `select u.*, l.location_code
     from users u
     left join locations l on l.id = u.location_id
     where u.id = $1
     limit 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await pool.query('select * from users where id = $1 limit 1', [id]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}
