import 'dotenv/config';
import { db } from './src/db/index.ts';
import { schools, classes, schedules, attendance } from './src/db/schema.ts';
import { ilike, inArray } from 'drizzle-orm';

async function main() {
  const victoriaSchools = await db.select().from(schools).where(ilike(schools.name, '%Victoria%'));
  console.log("Victoria Schools found:", JSON.stringify(victoriaSchools, null, 2));

  const schoolIds = victoriaSchools.map(s => s.id);
  if (schoolIds.length > 0) {
    const classList = await db.select().from(classes).where(inArray(classes.schoolId, schoolIds));
    console.log("Classes for Victoria schools:", JSON.stringify(classList, null, 2));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
