import { db } from '../src/db';
import { schools, classes, schedules } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const allSchools = await db.select().from(schools);
  console.log("=== SCHOOLS ===");
  console.log(JSON.stringify(allSchools.map(s => ({ id: s.id, name: s.name, isDeleted: s.isDeleted })), null, 2));

  const allClasses = await db.select().from(classes);
  console.log("=== CLASSES (First 20) ===");
  console.log(JSON.stringify(allClasses.slice(0, 20).map(c => ({ id: c.id, name: c.name, schoolId: c.schoolId, isDeleted: c.isDeleted })), null, 2));

  const activeSchedules = await db.select().from(schedules);
  console.log("=== ACTIVE SCHEDULES (First 20) ===");
  console.log(JSON.stringify(activeSchedules.slice(0, 20).map(s => ({ id: s.id, schoolId: s.schoolId, classId: s.classId, isDeleted: s.isDeleted })), null, 2));

  process.exit(0);
}
run().catch(console.error);
