require('dotenv').config();
const { Pool } = require('pg');

async function test() {
  try {
    const config = {
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
      keepAlive: true,
      connectionString: process.env.DATABASE_URL
    };
    if (!config.connectionString) {
      config.host = process.env.SQL_HOST;
      config.user = process.env.SQL_USER;
      config.password = process.env.SQL_PASSWORD;
      config.database = process.env.SQL_DB_NAME;
    }
    const pool = new Pool(config);
    const res = await pool.query('SELECT 1');
    console.log("SUCCESS", res.rows);
    
    // Now try querying attendance
    const res2 = await pool.query('SELECT * FROM attendance LIMIT 1');
    console.log("SUCCESS 2", res2.rows);
  } catch (err) {
    console.error("DIRECT DB ERROR:", err);
  }
}
test();
