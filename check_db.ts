import * as dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

const config: any = {};
if (process.env.DATABASE_URL) {
  config.connectionString = process.env.DATABASE_URL;
} else {
  config.host = process.env.SQL_HOST;
  config.user = process.env.SQL_USER;
  config.password = process.env.SQL_PASSWORD;
  config.database = process.env.SQL_DB_NAME;
}

const pool = new Pool(config);

async function checkConnection() {
  try {
    const client = await pool.connect();
    console.log("Database connection successful!");
    client.release();
  } catch (err) {
    console.error("Database connection failed:", err);
  } finally {
    await pool.end();
  }
}

checkConnection();
