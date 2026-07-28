import { db } from '../src/db';
import { teachers, schools, attendance, classes } from '../src/db/schema';
import { ilike, or, eq } from 'drizzle-orm';

async function check() {
  console.log('--- TEACHERS MATCHING Đào ---');
  const daoTeachers = await db.select().from(teachers).where(ilike(teachers.name, '%Đào%'));
  console.log(daoTeachers);

  console.log('--- SCHOOLS MATCHING 1/6 OR Hoa ---');
  const targetSchools = await db.select().from(schools).where(
    or(
      ilike(schools.name, '%1/6%'),
      ilike(schools.name, '%1 tháng 6%'),
      ilike(schools.name, '%Hoa%')
    )
  );
  console.log(targetSchools);

  const teacherIds = daoTeachers.map(t => t.id);
  const schoolIds = targetSchools.map(s => s.id);

  console.log('--- ATTENDANCE LOGS FOR TEACHER ĐÀO ---');
  if (teacherIds.length > 0) {
    for (const tid of teacherIds) {
      const logs = await db.select().from(attendance).where(eq(attendance.teacherId, tid));
      console.log(`Teacher ID ${tid} has ${logs.length} attendance logs.`);
      logs.forEach(l => console.log(`  Log ID: ${l.id}, Date: ${l.date}, SchoolID: ${l.schoolId}, ClassID: ${l.classId}, Status: ${(l as any).status}, Confirmed: ${l.confirmedByAdmin}`));
    }
  }

  console.log('--- ALL ATTENDANCE LOGS COUNT ---');
  const totalLogs = await db.select().from(attendance);
  console.log(`Total attendance logs in DB: ${totalLogs.length}`);

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
