import * as dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './src/db/schema.ts';
import { eq, isNull } from 'drizzle-orm';

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
const db = drizzle(pool, { schema });

async function main() {
  console.log("Checking for old schedule records that need workDate...");
  // ... rest of script doesn't matter for their runtime
}
main().catch(console.error).finally(() => pool.end());
