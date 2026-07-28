import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Running migration to add tuitionRate, isInvoice, and classesCount to schools table...");
  try {
    await db.execute(sql`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS tuition_rate text DEFAULT '';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_invoice boolean DEFAULT false;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS classes_count double precision DEFAULT 0;
    `);
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}
run();
