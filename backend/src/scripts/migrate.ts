import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load env before importing pool
import 'dotenv/config';
import { pool } from '../database/connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_indexes.sql',
  '003_triggers.sql',
  '004_rls_policies.sql',
  '005_schema_alignment.sql',
  '006_seed_data.sql',
  '007_client_stores_gst_blocked.sql',
  '008_staff.sql',
];

async function runMigrations() {
  const migrationsDir = join(__dirname, '..', '..', 'migrations');

  console.log('Running migrations from:', migrationsDir);

  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const fileName of MIGRATION_FILES) {
    const filePath = join(migrationsDir, fileName);

    // Check if already applied
    const applied = await pool.query(
      'SELECT id FROM _migrations WHERE name = $1',
      [fileName],
    );

    if (applied.rows.length > 0) {
      console.log(`  [skipped] ${fileName} — already applied`);
      continue;
    }

    const sql = await readFile(filePath, 'utf-8');

    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [fileName]);
      await pool.query('COMMIT');
      console.log(`  [applied] ${fileName}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(`  [FAILED]  ${fileName}:`, error);
      throw error;
    }
  }

  console.log('All migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
