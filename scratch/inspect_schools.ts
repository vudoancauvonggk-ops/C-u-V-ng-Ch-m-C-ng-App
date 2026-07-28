import { db } from '../src/db';
import { schools } from '../src/db/schema';

async function run() {
  const allSchools = await db.select().from(schools);
  console.log("Total schools in DB:", allSchools.length);
  console.log("First 10 schools:", allSchools.slice(0, 10).map(s => ({ id: s.id, name: s.name })));
  process.exit(0);
}
run().catch(console.error);
