module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const code = `
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

const MONTH = '2026-07';
const issues = { schedules: [], attendance: [], teacher_payroll: [], school_payroll: [], approval: [] };
const fixes = [];

async function run() {
  const { rows: schools } = await pool.query('SELECT id, name, is_deleted FROM schools');
  const { rows: classes } = await pool.query('SELECT id, name, school_id, is_deleted FROM classes');
  const { rows: teachers } = await pool.query('SELECT id, name FROM teachers');
  const { rows: allSchedules } = await pool.query('SELECT * FROM schedules WHERE is_deleted = false');
  const { rows: allAtt } = await pool.query("SELECT * FROM attendance WHERE date LIKE '" + MONTH + "%'");

  const schoolMap = Object.fromEntries(schools.map(s => [s.id, s]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));

  // =============================================
  // TAB 1: SCHEDULES AUDIT
  // =============================================
  console.log('\\n========== TAB 1: LỊCH DẠY GIÁO VIÊN ==========');

  for (const s of allSchedules) {
    const school = schoolMap[s.school_id];
    const cls = classMap[s.class_id];
    const teacher = teacherMap[s.teacher_id];

    if (!school) {
      issues.schedules.push({ id: s.id, issue: 'SCHOOL_NOT_FOUND', school_id: s.school_id, teacher_id: s.teacher_id });
    } else if (school.is_deleted) {
      issues.schedules.push({ id: s.id, issue: 'SCHOOL_DELETED', school_id: s.school_id, school_name: school.name, teacher_id: s.teacher_id });
    }

    if (!cls) {
      issues.schedules.push({ id: s.id, issue: 'CLASS_NOT_FOUND', class_id: s.class_id, teacher_id: s.teacher_id });
    } else if (cls.is_deleted) {
      issues.schedules.push({ id: s.id, issue: 'CLASS_DELETED', class_id: s.class_id, class_name: cls.name, teacher_id: s.teacher_id });
    } else if (cls.school_id !== s.school_id) {
      issues.schedules.push({ id: s.id, issue: 'SCHOOL_CLASS_MISMATCH', schedule_school: s.school_id, class_school: cls.school_id, class_name: cls.name, teacher_id: s.teacher_id });
    }

    if (!teacher) {
      issues.schedules.push({ id: s.id, issue: 'TEACHER_NOT_FOUND', teacher_id: s.teacher_id });
    }
  }

  if (issues.schedules.length === 0) {
    console.log('✅ PASS - Không tìm thấy vấn đề nào trong lịch dạy');
  } else {
    console.log('❌ ISSUES FOUND:', issues.schedules.length, 'issues');
    const grouped = {};
    issues.schedules.forEach(i => { grouped[i.issue] = (grouped[i.issue] || 0) + 1; });
    console.log('Summary:', JSON.stringify(grouped));
    console.log('Details:', JSON.stringify(issues.schedules.slice(0, 20), null, 2));
  }

  // =============================================
  // TAB 2: ATTENDANCE AUDIT (2026-07)
  // =============================================
  console.log('\\n========== TAB 2: CHẤM CÔNG (2026-07) ==========');

  let attTotal = allAtt.length;
  let attApproved = allAtt.filter(a => a.confirmed_by_admin || a.is_verified).length;
  let attPending = allAtt.filter(a => !a.confirmed_by_admin && !a.is_verified && !a.is_flagged).length;
  let attFlagged = allAtt.filter(a => a.is_flagged).length;

  console.log('Total att 2026-07:', attTotal, '| Approved:', attApproved, '| Pending:', attPending, '| Flagged:', attFlagged);

  for (const a of allAtt) {
    const school = schoolMap[a.school_id];
    const cls = classMap[a.class_id];

    if (!school) {
      issues.attendance.push({ id: a.id, issue: 'SCHOOL_NOT_FOUND', school_id: a.school_id, teacher_id: a.teacher_id, date: a.date });
    } else if (school.is_deleted) {
      issues.attendance.push({ id: a.id, issue: 'SCHOOL_DELETED', school_id: a.school_id, school_name: school.name, teacher_id: a.teacher_id, date: a.date });
    }

    if (!cls) {
      issues.attendance.push({ id: a.id, issue: 'CLASS_NOT_FOUND', class_id: a.class_id, teacher_id: a.teacher_id, date: a.date });
    } else if (cls.school_id !== a.school_id) {
      issues.attendance.push({ id: a.id, issue: 'SCHOOL_CLASS_MISMATCH', att_school: a.school_id, class_school: cls.school_id, class_name: cls.name, teacher_id: a.teacher_id, date: a.date });
    }
  }

  // Check duplicates (same teacher, same date, same class)
  const dupMap = {};
  for (const a of allAtt) {
    const key = a.teacher_id + '|' + a.date + '|' + a.class_id;
    if (dupMap[key]) {
      issues.attendance.push({ id: a.id, issue: 'DUPLICATE', original_id: dupMap[key], teacher_id: a.teacher_id, date: a.date, class_id: a.class_id });
    } else {
      dupMap[key] = a.id;
    }
  }

  if (issues.attendance.length === 0) {
    console.log('✅ PASS - Không tìm thấy vấn đề nào trong chấm công');
  } else {
    console.log('❌ ISSUES FOUND:', issues.attendance.length, 'issues');
    const grouped = {};
    issues.attendance.forEach(i => { grouped[i.issue] = (grouped[i.issue] || 0) + 1; });
    console.log('Summary:', JSON.stringify(grouped));
    console.log('Details:', JSON.stringify(issues.attendance.slice(0, 30), null, 2));
  }

  // =============================================
  // TAB 3: TEACHER PAYROLL AUDIT (tháng 07/2026)
  // =============================================
  console.log('\\n========== TAB 3: BẢNG LƯƠNG GIÁO VIÊN ==========');

  const approvedAtt = allAtt.filter(a => a.confirmed_by_admin || a.is_verified);
  const teacherSummary = {};
  for (const a of approvedAtt) {
    if (!teacherSummary[a.teacher_id]) teacherSummary[a.teacher_id] = { teacher_id: a.teacher_id, total_periods: 0, logs: 0, schools: new Set() };
    teacherSummary[a.teacher_id].total_periods += (a.periods || 0);
    teacherSummary[a.teacher_id].logs += 1;
    teacherSummary[a.teacher_id].schools.add(a.school_id);
  }

  const teacherReport = Object.values(teacherSummary).map(t => ({
    teacher_id: t.teacher_id,
    teacher_name: teacherMap[t.teacher_id]?.name || 'UNKNOWN',
    total_periods: t.total_periods,
    logs: t.logs,
    schools_count: t.schools.size,
    teacher_exists: !!teacherMap[t.teacher_id]
  })).sort((a, b) => b.total_periods - a.total_periods);

  const unknownTeachers = teacherReport.filter(t => !t.teacher_exists);
  if (unknownTeachers.length > 0) {
    console.log('❌ UNKNOWN TEACHERS IN ATTENDANCE:', JSON.stringify(unknownTeachers, null, 2));
    unknownTeachers.forEach(t => issues.teacher_payroll.push({ issue: 'UNKNOWN_TEACHER', teacher_id: t.teacher_id, periods: t.total_periods }));
  } else {
    console.log('✅ PASS - Tất cả teacher_id trong att đã duyệt đều hợp lệ');
  }

  console.log('\\nTeacher Summary (top 20):');
  teacherReport.slice(0, 20).forEach(t => console.log(' ', t.teacher_id, '|', t.teacher_name, '| Tiết:', t.total_periods, '| Logs:', t.logs, '| Trường:', t.schools_count));

  // =============================================
  // TAB 4: SCHOOL PAYROLL AUDIT (tháng 07/2026)
  // =============================================
  console.log('\\n========== TAB 4: ĐỐI SOÁT TRƯỜNG ==========');

  // Schools appearing in approved att for 07/2026
  const schoolAttSummary = {};
  for (const a of approvedAtt) {
    if (!schoolAttSummary[a.school_id]) schoolAttSummary[a.school_id] = { school_id: a.school_id, total_periods: 0, logs: 0, teachers: new Set() };
    schoolAttSummary[a.school_id].total_periods += (a.periods || 0);
    schoolAttSummary[a.school_id].logs += 1;
    schoolAttSummary[a.school_id].teachers.add(a.teacher_id);
  }

  // Also include schools with active schedules
  for (const s of allSchedules) {
    if (!schoolAttSummary[s.school_id]) schoolAttSummary[s.school_id] = { school_id: s.school_id, total_periods: 0, logs: 0, teachers: new Set() };
  }

  console.log('Schools appearing in 07/2026 payroll:');
  const schoolReport = Object.values(schoolAttSummary).map(s => {
    const sch = schoolMap[s.school_id];
    return {
      school_id: s.school_id,
      school_name: sch?.name || 'NOT_FOUND',
      is_deleted: sch?.is_deleted ?? true,
      total_periods: s.total_periods,
      logs: s.logs,
      teachers_count: s.teachers.size,
      STATUS: !sch ? 'ORPHAN' : sch.is_deleted ? 'DELETED_WITH_ATT' : 'OK'
    };
  }).sort((a, b) => a.STATUS.localeCompare(b.STATUS));

  schoolReport.forEach(s => {
    const icon = s.STATUS === 'OK' ? '✅' : '❌';
    console.log(icon, s.school_id, '|', s.school_name, '| Tiết:', s.total_periods, '| Logs:', s.logs, '| STATUS:', s.STATUS);
    if (s.STATUS !== 'OK') issues.school_payroll.push(s);
  });

  // =============================================
  // TAB 5: DUYỆT CHẤM CÔNG AUDIT
  // =============================================
  console.log('\\n========== TAB 5: DUYỆT CHẤM CÔNG ==========');

  const pendingLogs = allAtt.filter(a => !a.confirmed_by_admin && !a.is_verified && !a.is_flagged);
  console.log('Pending (chưa duyệt):', pendingLogs.length);
  if (pendingLogs.length > 0) {
    pendingLogs.forEach(a => {
      const sch = schoolMap[a.school_id];
      issues.approval.push({ id: a.id, date: a.date, teacher_id: a.teacher_id, school_name: sch?.name || a.school_id, class_id: a.class_id });
      console.log('  Pending:', a.id, '| Date:', a.date, '| Teacher:', a.teacher_id, '| School:', sch?.name || a.school_id);
    });
  }

  const flaggedLogs = allAtt.filter(a => a.is_flagged);
  console.log('Flagged (bị đánh dấu):', flaggedLogs.length);
  flaggedLogs.forEach(a => console.log('  Flagged:', a.id, '| Date:', a.date, '| Teacher:', a.teacher_id, '| Reason:', a.flag_reason));

  // =============================================
  // TỔNG KẾT
  // =============================================
  console.log('\\n========== TỔNG KẾT AUDIT ==========');
  console.log('Tab 1 - Lịch dạy:   ', issues.schedules.length === 0 ? '✅ PASS' : '❌ ' + issues.schedules.length + ' issues');
  console.log('Tab 2 - Chấm công:  ', issues.attendance.length === 0 ? '✅ PASS' : '❌ ' + issues.attendance.length + ' issues');
  console.log('Tab 3 - Lương GV:   ', issues.teacher_payroll.length === 0 ? '✅ PASS' : '❌ ' + issues.teacher_payroll.length + ' issues');
  console.log('Tab 4 - Đối soát:   ', issues.school_payroll.length === 0 ? '✅ PASS' : '❌ ' + issues.school_payroll.length + ' issues');
  console.log('Tab 5 - Duyệt CC:   ', issues.approval.length === 0 ? '✅ PASS' : '❌ ' + issues.approval.length + ' chưa duyệt');

  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/full_audit.js\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && node full_audit.js && rm /app/full_audit.js', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => process.stdout.write(data));
        execStream.stderr.on('data', data => process.stderr.write(data));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
