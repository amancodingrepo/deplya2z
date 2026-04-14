import type { QueryResultRow } from 'pg';

import { pool } from '../database/connection.js';
import type { Location } from '../types.js';

function mapLocation(row: QueryResultRow): Location {
  return {
    id: row.id,
    location_code: row.location_code,
    name: row.name,
    type: row.type,
    status: row.status,
  };
}

export async function listLocations(params: { type?: string }) {
  const values: string[] = [];
  let where = '';
  if (params.type) {
    values.push(params.type);
    where = 'where type = $1';
  }
  const result = await pool.query(`select * from locations ${where} order by location_code asc`, values);
  return result.rows.map(mapLocation);
}

export async function findLocationByCode(locationCode: string) {
  const result = await pool.query(
    'select * from locations where location_code = $1 or id::text = $1 limit 1',
    [locationCode],
  );
  return result.rows[0] ? mapLocation(result.rows[0]) : null;
}
