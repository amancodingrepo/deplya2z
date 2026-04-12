import { pool } from '../database/connection.js';

type IdempotencyPayload = {
  pending?: boolean;
  status?: number;
  body?: unknown;
};

export async function findIdempotencyRecord(key: string) {
  const result = await pool.query(
    'select idempotency_key, endpoint, response_json from idempotency_logs where idempotency_key = $1 limit 1',
    [key],
  );
  if (!result.rows[0]) {
    return null;
  }

  return {
    idempotency_key: String(result.rows[0].idempotency_key),
    endpoint: String(result.rows[0].endpoint),
    response_json: result.rows[0].response_json as IdempotencyPayload,
  };
}

export async function reserveIdempotencyKey(key: string, endpoint: string) {
  const result = await pool.query(
    `insert into idempotency_logs (idempotency_key, endpoint, response_json)
     values ($1, $2, $3::jsonb)
     on conflict (idempotency_key) do nothing`,
    [key, endpoint, JSON.stringify({ pending: true })],
  );

  return result.rowCount === 1;
}

export async function saveIdempotencyResponse(
  key: string,
  endpoint: string,
  payload: { status: number; body: unknown },
) {
  await pool.query(
    'update idempotency_logs set response_json = $3::jsonb where idempotency_key = $1 and endpoint = $2',
    [key, endpoint, JSON.stringify(payload)],
  );
}

export async function releaseReservedIdempotencyKey(key: string, endpoint: string) {
  await pool.query(
    `delete from idempotency_logs
     where idempotency_key = $1
       and endpoint = $2
       and (response_json->>'pending') = 'true'`,
    [key, endpoint],
  );
}
