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
  max: env.dbPoolMax,
  idleTimeoutMillis: env.dbIdleTimeoutMs,
  connectionTimeoutMillis: env.dbConnectionTimeoutMs,
});

export async function healthCheckDatabase() {
  const result = await pool.query('select 1 as ok');
  return result.rows[0]?.ok === 1;
}
