import 'dotenv/config';
import { pool } from './src/database/connection.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock_item_codes'
    `);
    console.log('Columns in stock_item_codes:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit();
}

test();
