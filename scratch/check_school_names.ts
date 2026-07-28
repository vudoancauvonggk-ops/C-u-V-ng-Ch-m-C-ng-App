import { db } from '../src/db';
import { teachers, schools, attendance, classes, schedules } from '../src/db/schema';
import { inArray, eq } from 'drizzle-orm';

async function check() {
  console.log('=== ALL SCHOOLS IN DB ===');
  const allSchools = await db.select().from(schools);
  allSchools.forEach(s => {
    console.log(`ID: ${s.id} | Name: "${s.name}" | Deleted: ${s.isDeleted}`);
  });

  console.log('\n=== SCHEDULES FOR TEACHER ĐÀO (GV_MSAO) ===');
  const daoSchedules = await db.select().from(schedules).where(eq(schedules.teacherId, 'GV_MSAO'));
  daoSchedules.forEach(s => {
    const sch = allSchools.find(sc => sc.id === s.schoolId);
    console.log(`Schedule ID: ${s.id} | SchoolID: ${s.schoolId} (${sch?.name}) | ClassID: ${s.classId} | Day: ${s.dayOfWeek}`);
  });

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
