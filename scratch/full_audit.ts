import { db } from '../src/db';
import { teachers, schools, attendance, classes, schedules } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function fullAudit() {
  console.log('======= TOÀN BỘ AUDIT ĐIỂM DANH GIÁO VIÊN =======\n');

  const allTeachers = await db.select().from(teachers).where(eq(teachers.isDeleted, false));
  const allSchools = await db.select().from(schools);
  const allSchedules = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
  const allAttendance = await db.select({
    id: attendance.id,
    teacherId: attendance.teacherId,
    schoolId: attendance.schoolId,
    classId: attendance.classId,
    date: attendance.date,
    periods: attendance.periods,
    confirmedByAdmin: attendance.confirmedByAdmin,
    isVerified: attendance.isVerified,
  }).from(attendance);

  const schoolMap: Record<string, string> = {};
  for (const s of allSchools) schoolMap[s.id] = s.name;

  // For each teacher, find their schedules and attendance
  for (const teacher of allTeachers) {
    const teacherScheds = allSchedules.filter(s => s.teacherId === teacher.id);
    const teacherAtt = allAttendance.filter(a => a.teacherId === teacher.id);

    // Get unique schoolIds from schedules
    const schedSchoolIds = [...new Set(teacherScheds.map(s => s.schoolId))];
    // Get unique schoolIds from attendance
    const attSchoolIds = [...new Set(teacherAtt.map(a => a.schoolId))];

    // Find schools in schedule but NOT in attendance
    const missingSchools = schedSchoolIds.filter(sid => !attSchoolIds.includes(sid));
    // Find schools in attendance but NOT in schedule (orphan logs)
    const orphanSchools = attSchoolIds.filter(sid => !schedSchoolIds.includes(sid));

    const hasMismatch = missingSchools.length > 0 || orphanSchools.length > 0;
    if (hasMismatch) {
      console.log(`\n🔴 GV: ${teacher.name} (${teacher.id})`);
      console.log(`   Tổng lịch phân công: ${teacherScheds.length} ca | Tổng điểm danh: ${teacherAtt.length} ca`);
      if (missingSchools.length > 0) {
        console.log(`   ⚠️  Trường có lịch nhưng KHÔNG CÓ điểm danh nào:`);
        for (const sid of missingSchools) {
          const schName = schoolMap[sid] || sid;
          const schedCount = teacherScheds.filter(s => s.schoolId === sid).length;
          console.log(`      - "${schName}" (${sid}) | ${schedCount} ca lịch`);
        }
      }
      if (orphanSchools.length > 0) {
        console.log(`   ℹ️  Điểm danh có nhưng KHÔNG CÓ lịch (có thể đổi schoolId):`);
        for (const sid of orphanSchools) {
          const schName = schoolMap[sid] || sid;
          const attCount = teacherAtt.filter(a => a.schoolId === sid).length;
          const totalPeriods = teacherAtt.filter(a => a.schoolId === sid).reduce((sum, a) => sum + (a.periods || 0), 0);
          console.log(`      - "${schName}" (${sid}) | ${attCount} lần điểm danh | ${totalPeriods} tiết`);
        }
      }
    } else if (teacherAtt.length > 0) {
      console.log(`✅ GV: ${teacher.name} - ${teacherAtt.length} điểm danh, ${teacherScheds.length} lịch - OK`);
    }
  }

  // Special: check all attendance with invalid/missing schoolId
  console.log('\n======= KIỂM TRA SCHOOLID TRONG ĐIỂM DANH =======');
  const invalidSchoolIds = allAttendance.filter(a => !schoolMap[a.schoolId]);
  if (invalidSchoolIds.length > 0) {
    console.log(`⚠️  Tìm thấy ${invalidSchoolIds.length} lần điểm danh có schoolId KHÔNG TỒN TẠI:`);
    const grouped: Record<string, any[]> = {};
    for (const a of invalidSchoolIds) {
      grouped[a.schoolId] = grouped[a.schoolId] || [];
      grouped[a.schoolId].push(a);
    }
    for (const [sid, logs] of Object.entries(grouped)) {
      const teacherNames = [...new Set(logs.map(l => l.teacherId))].join(', ');
      console.log(`  - schoolId="${sid}" | ${logs.length} bản ghi | GV: ${teacherNames}`);
    }
  } else {
    console.log('✅ Tất cả schoolId trong điểm danh đều hợp lệ.');
  }

  process.exit(0);
}

fullAudit().catch(e => { console.error(e); process.exit(1); });
