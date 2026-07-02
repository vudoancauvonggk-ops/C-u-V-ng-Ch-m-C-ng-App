import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { eq } from 'drizzle-orm';
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

async function fix() {
  const skdList = await db.select().from(schema.schedules);
  const tList = await db.select().from(schema.teachers);
  
  if (tList.length === 0 || skdList.length === 0) {
    console.log("Empty, nothing to do");
    process.exit(0);
  }

  // Randomly distribute the orphaned schedules to the first 5 teachers
  const tIds = tList.map(t => t.id).slice(0, 5);
  for (let i = 0; i < skdList.length; i++) {
    const s = skdList[i];
    // Assign sequentially
    const newTid = tIds[i % tIds.length];
    
    await db.update(schema.schedules)
      .set({ teacherId: newTid })
      .where(eq(schema.schedules.id, s.id));
  }
  
  console.log("Fixed " + skdList.length + " schedules!");
  process.exit(0);
}
fix();
