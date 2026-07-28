import { db } from '../src/db';
import { teachers, schools, attendance, classes, schedules } from '../src/db/schema';
import { eq, or, ilike } from 'drizzle-orm';

async function check() {
  console.log('=== CHECKING ATTENDANCE LOGS FOR 1 THÁNG 6 AND HOA DĨ AN ===');
  
  const sch16 = await db.select().from(schools).where(ilike(schools.name, '%1 tháng 6%'));
  const schHoa = await db.select().from(schools).where(ilike(schools.name, '%Hoa%'));
  
  console.log('Schools 1 Tháng 6:', sch16);
  console.log('Schools Hoa:', schHoa);

  const targetIds = [...sch16.map(s => s.id), ...schHoa.map(s => s.id)];

  for (const sId of targetIds) {
    const logs = await db.select().from(attendance).where(eq(attendance.schoolId, sId));
    console.log(`School ID ${sId} has ${logs.length} attendance logs:`);
    for (const l of logs) {
      const t = await db.select().from(teachers).where(eq(teachers.id, l.teacherId));
      console.log(`  Date: ${l.date} | Teacher: ${t[0]?.name} (${l.teacherId}) | Periods: ${l.periods} | Confirmed: ${l.confirmedByAdmin}`);
    }
  }

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
