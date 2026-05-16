import 'dotenv/config';
import { pool } from './src/database/connection.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('users', 'locations')
      AND column_name IN ('id', 'location_id', 'location_code');
    `);
    console.log('Types:', res.rows);

    const loginRes = await pool.query(
      `select u.*, l.location_code
       from users u
       left join locations l on l.id = u.location_id
       where u.email = $1
       limit 1`,
      ['admin@storewarehouse.com']
    );
    console.log('Login Query success, user found:', !!loginRes.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit();
}

test();
