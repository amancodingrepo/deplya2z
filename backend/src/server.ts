import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './database/connection.js';

const port = env.port;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`Store Warehouse backend listening on http://localhost:${port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
