import { Pool } from 'pg';

import { env } from '../config/env.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const shouldUseSsl =
  env.databaseUrl.includes('neon.tech') ||
  /sslmode=require/i.test(env.databaseUrl) ||
  env.nodeEnv === 'production';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: env.dbSslRejectUnauthorized,
      }
    : undefined,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000),
});

export async function healthCheckDatabase() {
  const result = await pool.query('select 1 as ok');
  return result.rows[0]?.ok === 1;
}
