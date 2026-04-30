import 'dotenv/config';
import { pool } from './src/database/connection.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'client_stores'
    `);
    console.log('Columns in client_stores:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit();
}

test();
