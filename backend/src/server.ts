import 'dotenv/config';
import { setDefaultResultOrder } from 'dns';

// Force IPv4 DNS resolution — prevents ENETUNREACH on VPS hosts without IPv6 routing
setDefaultResultOrder('ipv4first');

import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './database/connection.js';
import { runMigrations } from './scripts/runMigrations.js';

async function start() {
  // ── Production guards ────────────────────────────────────────────────
  if (env.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET) {
      console.error('[startup] FATAL: JWT_SECRET must be set in production');
      process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
      console.error('[startup] FATAL: DATABASE_URL must be set in production');
      process.exit(1);
    }
  }

  // ── Auto-migrate + seed on every startup (idempotent) ──────────────
  console.log('[startup] Running migrations & seed check…');
  try {
    await runMigrations();
    console.log('[startup] Migrations complete.');
  } catch (err) {
    console.error('[startup] Migration failed — continuing anyway:', err);
    // Don't crash the server if migrations fail (e.g. partial DB setup)
  }

  // ── Start Express ────────────────────────────────────────────────────
  const port = env.port;
  const app  = createApp();

  const server = app.listen(port, () => {
    console.log(`[startup] API listening on http://localhost:${port}`);
  });

  async function shutdown(signal: string) {
    console.log(`[shutdown] ${signal} received.`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  }

  process.on('SIGINT',  () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
