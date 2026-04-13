import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { EmployeeUser, User, UserRole, UserStatus } from '../types.js';

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

function mapEmployeeUser(row: QueryResultRow): EmployeeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    location_id: row.location_code ?? null,
    location_name: row.location_name ?? null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type ListUsersParams = {
  actorRole: UserRole;
  actorLocationCode?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

export async function listEmployeeUsers(params: ListUsersParams) {
  const values: string[] = [];
  const where: string[] = [];

  if (params.actorRole === 'warehouse_manager' && params.actorLocationCode) {
    values.push(params.actorLocationCode);
    where.push(`l.location_code = $${values.length}`);
  }

  if (params.role) {
    values.push(params.role);
    where.push(`u.role = $${values.length}`);
  }

  if (params.status) {
    values.push(params.status);
    where.push(`u.status = $${values.length}`);
  }

  const whereSql = where.length > 0 ? `where ${where.join(' and ')}` : '';
  const result = await pool.query(
    `select
       u.id,
       u.email,
       u.name,
       u.role,
       u.status,
       u.created_at,
       u.updated_at,
       l.location_code,
       l.name as location_name
     from users u
     left join locations l on l.id = u.location_id
     ${whereSql}
     order by u.created_at desc`,
    values,
  );
  return result.rows.map(mapEmployeeUser);
}

export async function createEmployeeUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  locationCode?: string | null;
  status: UserStatus;
}) {
  const result = await pool.query(
    `insert into users (email, password_hash, name, role, location_id, status)
     values (
       $1,
       $2,
       $3,
       $4,
       (select id from locations where location_code = $5 limit 1),
       $6
     )
     returning id`,
    [
      input.email,
      input.passwordHash,
      input.name,
      input.role,
      input.locationCode ?? null,
      input.status,
    ],
  );

  const createdId = result.rows[0]?.id as string | undefined;
  if (!createdId) {
    return null;
  }

  return findEmployeeUserById(createdId);
}

export async function findEmployeeUserById(id: string) {
  const result = await pool.query(
    `select
       u.id,
       u.email,
       u.name,
       u.role,
       u.status,
       u.created_at,
       u.updated_at,
       l.location_code,
       l.name as location_name
     from users u
     left join locations l on l.id = u.location_id
     where u.id = $1
     limit 1`,
    [id],
  );
  return result.rows[0] ? mapEmployeeUser(result.rows[0]) : null;
}

export async function updateEmployeeUser(
  id: string,
  input: {
    name?: string;
    role?: UserRole;
    status?: UserStatus;
    locationCode?: string | null;
    passwordHash?: string;
  },
) {
  const fields: string[] = [];
  const values: Array<string | null> = [];

  if (input.name !== undefined) {
    values.push(input.name);
    fields.push(`name = $${values.length}`);
  }

  if (input.role !== undefined) {
    values.push(input.role);
    fields.push(`role = $${values.length}`);
  }

  if (input.status !== undefined) {
    values.push(input.status);
    fields.push(`status = $${values.length}`);
  }

  if (input.passwordHash !== undefined) {
    values.push(input.passwordHash);
    fields.push(`password_hash = $${values.length}`);
  }

  if (input.locationCode !== undefined) {
    values.push(input.locationCode);
    fields.push(
      `location_id = (select id from locations where location_code = $${values.length} limit 1)`,
    );
  }

  if (fields.length === 0) {
    return findEmployeeUserById(id);
  }

  values.push(id);
  await pool.query(
    `update users
     set ${fields.join(', ')}, updated_at = now()
     where id = $${values.length}`,
    values,
  );
  return findEmployeeUserById(id);
}
