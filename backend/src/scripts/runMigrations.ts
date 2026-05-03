import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_indexes.sql',
  '003_triggers.sql',
  '004_rls_policies.sql',
  '005_schema_alignment.sql',
  '006_seed_data.sql',
  '007_staff_tables.sql',
];

/**
 * Idempotent migration runner.
 * Safe to call on every server start — already-applied migrations are skipped.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, '..', '..', 'migrations');

  // Tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const fileName of MIGRATION_FILES) {
    const applied = await pool.query(
      'SELECT id FROM _migrations WHERE name = $1',
      [fileName],
    );
    if (applied.rows.length > 0) {
      console.log(`  [migration] skipped  ${fileName}`);
      continue;
    }

    const filePath = join(migrationsDir, fileName);
    const sql = await readFile(filePath, 'utf-8');

    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [fileName]);
      await pool.query('COMMIT');
      console.log(`  [migration] applied  ${fileName}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`  [migration] FAILED   ${fileName}:`, err);
      throw err;
    }
  }
}
