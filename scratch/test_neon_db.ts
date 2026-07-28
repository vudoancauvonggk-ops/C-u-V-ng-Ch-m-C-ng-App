import pg from 'pg';
const { Pool } = pg;

async function run() {
  const connectionString = "postgresql://neondb_owner:npg_b0qFTypoS5IE@ep-still-wildflower-aonun24j.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  console.log("Connecting to Neon DB...");
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query("SELECT COUNT(*) FROM schools");
    console.log("Successfully connected! School count:", res.rows[0].count);
  } catch (err) {
    console.error("Failed to connect:", err);
  } finally {
    await pool.end();
  }
}
run();
