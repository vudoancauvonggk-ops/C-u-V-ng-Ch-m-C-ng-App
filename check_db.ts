import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './src/db/schema.ts';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  port: 5432,
  ssl: true
});

const db = drizzle(pool, { schema });

async function check() {
  const skdList = await db.select().from(schema.schedules);
  console.log("Schedules Count:", skdList.length);
  process.exit(0);
}
check();
