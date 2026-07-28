module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

// Short, fast audit using raw SQL - no ORM needed
const cmd = `cd /app && node -e "
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  const MONTH = '2026-07';

  // === TAB 1: SCHEDULE INTEGRITY ===
  const { rows: badSchSch } = await pool.query(\\\`
    SELECT s.id, s.teacher_id, s.school_id, sc.name as school_name
    FROM schedules s
    LEFT JOIN schools sc ON sc.id = s.school_id
    WHERE s.is_deleted = false AND (sc.id IS NULL OR sc.is_deleted = true)
    LIMIT 30
  \\\`);

  const { rows: badClsSch } = await pool.query(\\\`
    SELECT s.id, s.teacher_id, s.class_id, c.name as class_name
    FROM schedules s
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.is_deleted = false AND (c.id IS NULL OR c.is_deleted = true)
    LIMIT 30
  \\\`);

  const { rows: mismatchSch } = await pool.query(\\\`
    SELECT s.id, s.teacher_id, s.school_id as sched_school, c.school_id as class_school, c.name as class_name, sc.name as school_name
    FROM schedules s
    JOIN classes c ON c.id = s.class_id
    JOIN schools sc ON sc.id = s.school_id
    WHERE s.is_deleted = false AND c.school_id != s.school_id
    LIMIT 30
  \\\`);

  // === TAB 2: ATTENDANCE INTEGRITY ===
  const { rows: badSchAtt } = await pool.query(\\\`
    SELECT a.id, a.teacher_id, a.school_id, a.date, sc.name as school_name
    FROM attendance a
    LEFT JOIN schools sc ON sc.id = a.school_id
    WHERE a.date LIKE '\${MONTH}%' AND (sc.id IS NULL OR sc.is_deleted = true)
    LIMIT 30
  \\\`);

  const { rows: badClsAtt } = await pool.query(\\\`
    SELECT a.id, a.teacher_id, a.class_id, a.date
    FROM attendance a
    LEFT JOIN classes c ON c.id = a.class_id
    WHERE a.date LIKE '\${MONTH}%' AND c.id IS NULL
    LIMIT 30
  \\\`);

  const { rows: mismatchAtt } = await pool.query(\\\`
    SELECT a.id, a.teacher_id, a.school_id as att_school, c.school_id as class_school, c.name as class_name, a.date
    FROM attendance a
    JOIN classes c ON c.id = a.class_id
    WHERE a.date LIKE '\${MONTH}%' AND c.school_id != a.school_id
    LIMIT 30
  \\\`);

  const { rows: dupAtt } = await pool.query(\\\`
    SELECT teacher_id, date, class_id, COUNT(*) as cnt
    FROM attendance
    WHERE date LIKE '\${MONTH}%'
    GROUP BY teacher_id, date, class_id
    HAVING COUNT(*) > 1
  \\\`);

  // === TAB 3: TEACHER PAYROLL ===
  const { rows: unknownTeachers } = await pool.query(\\\`
    SELECT DISTINCT a.teacher_id, SUM(a.periods) as total_periods
    FROM attendance a
    LEFT JOIN teachers t ON t.id = a.teacher_id
    WHERE a.date LIKE '\${MONTH}%' AND (a.confirmed_by_admin = true OR a.is_verified = true) AND t.id IS NULL
    GROUP BY a.teacher_id
  \\\`);

  const { rows: teacherSummary } = await pool.query(\\\`
    SELECT a.teacher_id, t.name as teacher_name, 
           COUNT(*) as log_count,
           SUM(a.periods) as total_periods,
           COUNT(DISTINCT a.school_id) as school_count
    FROM attendance a
    LEFT JOIN teachers t ON t.id = a.teacher_id
    WHERE a.date LIKE '\${MONTH}%' AND (a.confirmed_by_admin = true OR a.is_verified = true)
    GROUP BY a.teacher_id, t.name
    ORDER BY total_periods DESC
  \\\`);

  // === TAB 4: SCHOOL PAYROLL ===
  const { rows: schoolPayroll } = await pool.query(\\\`
    SELECT a.school_id, sc.name as school_name, sc.is_deleted,
           COUNT(*) as log_count, SUM(a.periods) as total_periods
    FROM attendance a
    LEFT JOIN schools sc ON sc.id = a.school_id
    WHERE a.date LIKE '\${MONTH}%' AND (a.confirmed_by_admin = true OR a.is_verified = true)
    GROUP BY a.school_id, sc.name, sc.is_deleted
    ORDER BY sc.is_deleted, school_name
  \\\`);

  const deletedWithAtt = schoolPayroll.filter(r => r.is_deleted === true || r.school_name === null);

  // === TAB 5: DUYỆT CHẤM CÔNG ===
  const { rows: pendingAtt } = await pool.query(\\\`
    SELECT a.id, a.date, a.teacher_id, t.name as teacher_name, a.school_id, sc.name as school_name, a.class_id
    FROM attendance a
    LEFT JOIN teachers t ON t.id = a.teacher_id
    LEFT JOIN schools sc ON sc.id = a.school_id
    WHERE a.date LIKE '\${MONTH}%' 
      AND a.confirmed_by_admin != true 
      AND a.is_verified != true 
      AND a.is_flagged != true
    ORDER BY a.date
  \\\`);

  const { rows: flaggedAtt } = await pool.query(\\\`
    SELECT a.id, a.date, a.teacher_id, t.name as teacher_name, a.flag_reason
    FROM attendance a
    LEFT JOIN teachers t ON t.id = a.teacher_id
    WHERE a.date LIKE '\${MONTH}%' AND a.is_flagged = true
  \\\`);

  // === PRINT RESULTS ===
  console.log('\\n========== TAB 1: LỊCH DẠY GIÁO VIÊN ==========');
  console.log('1a. Schedules trỏ school bị xóa/không tồn tại:', badSchSch.length);
  if (badSchSch.length) console.log(JSON.stringify(badSchSch, null, 2));
  console.log('1b. Schedules trỏ class bị xóa/không tồn tại:', badClsSch.length);
  if (badClsSch.length) console.log(JSON.stringify(badClsSch, null, 2));
  console.log('1c. Schedules có school_id != class.school_id:', mismatchSch.length);
  if (mismatchSch.length) console.log(JSON.stringify(mismatchSch, null, 2));

  console.log('\\n========== TAB 2: CHẤM CÔNG (2026-07) ==========');
  console.log('2a. Att trỏ school bị xóa/không tồn tại:', badSchAtt.length);
  if (badSchAtt.length) console.log(JSON.stringify(badSchAtt, null, 2));
  console.log('2b. Att trỏ class không tồn tại:', badClsAtt.length);
  if (badClsAtt.length) console.log(JSON.stringify(badClsAtt, null, 2));
  console.log('2c. Att có school_id != class.school_id:', mismatchAtt.length);
  if (mismatchAtt.length) console.log(JSON.stringify(mismatchAtt, null, 2));
  console.log('2d. Att trùng lặp (cùng GV/ngày/lớp):', dupAtt.length);
  if (dupAtt.length) console.log(JSON.stringify(dupAtt, null, 2));

  console.log('\\n========== TAB 3: BẢNG LƯƠNG GIÁO VIÊN ==========');
  console.log('3a. Teacher_id không hợp lệ trong att đã duyệt:', unknownTeachers.length);
  if (unknownTeachers.length) console.log(JSON.stringify(unknownTeachers, null, 2));
  console.log('3b. Tóm tắt lương GV (2026-07):');
  teacherSummary.forEach(t => console.log(' ', t.teacher_id, '|', t.teacher_name || 'UNKNOWN', '| Tiết:', t.total_periods, '| Logs:', t.log_count, '| Trường:', t.school_count));

  console.log('\\n========== TAB 4: ĐỐI SOÁT TRƯỜNG ==========');
  console.log('Tổng số trường xuất hiện trong att 07/2026:', schoolPayroll.length);
  console.log('4a. Trường BỊ XÓA nhưng vẫn có att:', deletedWithAtt.length);
  if (deletedWithAtt.length) console.log(JSON.stringify(deletedWithAtt, null, 2));
  console.log('4b. Danh sách trường active có att:');
  schoolPayroll.filter(r => !r.is_deleted && r.school_name).forEach(r => console.log(' ✅', r.school_id, '|', r.school_name, '| Tiết:', r.total_periods, '| Logs:', r.log_count));

  console.log('\\n========== TAB 5: DUYỆT CHẤM CÔNG ==========');
  console.log('5a. Chưa duyệt (pending):', pendingAtt.length);
  if (pendingAtt.length) pendingAtt.forEach(a => console.log('  PENDING:', a.id, '|', a.date, '|', a.teacher_name || a.teacher_id, '|', a.school_name || a.school_id));
  console.log('5b. Bị đánh dấu (flagged):', flaggedAtt.length);
  if (flaggedAtt.length) flaggedAtt.forEach(a => console.log('  FLAGGED:', a.id, '|', a.date, '|', a.teacher_name || a.teacher_id, '|', a.flag_reason));

  console.log('\\n========== TỔNG KẾT ==========');
  const t1 = badSchSch.length + badClsSch.length + mismatchSch.length;
  const t2 = badSchAtt.length + badClsAtt.length + mismatchAtt.length + dupAtt.length;
  const t3 = unknownTeachers.length;
  const t4 = deletedWithAtt.length;
  const t5 = pendingAtt.length;
  console.log('Tab 1 - Lịch dạy:  ', t1 === 0 ? '✅ PASS' : '❌ ' + t1 + ' issues');
  console.log('Tab 2 - Chấm công: ', t2 === 0 ? '✅ PASS' : '❌ ' + t2 + ' issues');
  console.log('Tab 3 - Lương GV:  ', t3 === 0 ? '✅ PASS' : '❌ ' + t3 + ' issues');
  console.log('Tab 4 - Đối soát:  ', t4 === 0 ? '✅ PASS' : '❌ ' + t4 + ' issues');
  console.log('Tab 5 - Duyệt CC:  ', t5 === 0 ? '✅ PASS' : '⚠️  ' + t5 + ' chờ duyệt');

  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => process.stdout.write(data));
    stream.stderr.on('data', data => process.stderr.write(data));
    stream.on('close', () => conn.end());
  });
}).connect(config);
