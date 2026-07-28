const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
  ? process.env.DATABASE_URL
  : "postgresql://neondb_owner:npg_b0qFTypoS5IE@ep-still-wildflower-aonun24j.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    console.log("Tables in public schema:", tables.rows.map(r => r.table_name));

    for (const row of tables.rows) {
      const cnt = await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`Table ${row.table_name}: ${cnt.rows[0].count} rows`);
    }

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
