import 'dotenv/config';
import { pool } from './src/database/connection.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit();
}

test();
