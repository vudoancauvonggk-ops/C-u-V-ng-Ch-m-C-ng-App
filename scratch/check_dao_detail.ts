import { db } from '../src/db';
import { teachers, schools, attendance, schedules } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// This script checks ALL attendance for teacher Đào and especially 
// checks what schoolId is stored for "Mầm non Hoa Dĩ An" attendance
async function checkDao() {
  const allSchools = await db.select().from(schools);
  const schoolMap: Record<string, string> = {};
  for (const s of allSchools) schoolMap[s.id] = `${s.name} (deleted:${s.isDeleted})`;

  const daoAtt = await db.select().from(attendance)
    .where(eq(attendance.teacherId, 'GV_MSAO'));

  console.log(`=== GV Đào - TẤT CẢ ${daoAtt.length} lần điểm danh ===`);
  for (const a of daoAtt) {
    const schoolLabel = schoolMap[a.schoolId] || `UNKNOWN:${a.schoolId}`;
    console.log(`  ${a.date} | ${schoolLabel} | classId=${a.classId} | periods=${a.periods} | confirmed=${a.confirmedByAdmin}`);
  }

  // Also check schedules for Đào
  const daoScheds = await db.select().from(schedules).where(eq(schedules.teacherId, 'GV_MSAO'));
  console.log(`\n=== GV Đào - ${daoScheds.length} lịch phân công ===`);
  for (const s of daoScheds) {
    const schoolLabel = schoolMap[s.schoolId] || `UNKNOWN:${s.schoolId}`;
    const isDeleted = (s as any).isDeleted ? ' [ĐÃ XÓA]' : '';
    console.log(`  Thứ ${s.dayOfWeek} | ${s.session} | ${schoolLabel} | classId=${s.classId}${isDeleted}`);
  }

  // Check if Hoa Dĩ An school ID in attendance matches school table
  console.log('\n=== TÌM TRƯỜNG "HOA DĨ AN" trong DB ===');
  const hoaDiAn = allSchools.filter(s => s.name.toLowerCase().includes('hoa') && (s.name.toLowerCase().includes('dĩ') || s.name.toLowerCase().includes('di')));
  console.log(hoaDiAn.map(s => `  ${s.name} | ${s.id} | isDeleted:${s.isDeleted}`).join('\n'));

  process.exit(0);
}
checkDao().catch(e => { console.error(e); process.exit(1); });
