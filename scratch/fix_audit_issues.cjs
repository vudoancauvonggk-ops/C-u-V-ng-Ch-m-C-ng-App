module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = { host: '103.82.21.133', port: 22, username: 'root', password: '5A3N84JY026MdF2n' };

// FIX PLAN:
// TAB 1 FIXES:
// 1a. schedules trỏ school bị xóa (sch-1784509148643 "Smilekid ") - cô An Nhi
//     → Fix: cập nhật school_id = sch-1783856923464 (Smilekid Cơ Sở 1)
// 1c. schedules có school_id != class.school_id (11 records):
//     → Fix: đồng bộ school_id của schedule theo class.school_id (lấy trường đúng từ class)
// 1b. schedules của cô Lan trỏ class bị xóa (5 records):
//     → Đánh dấu is_deleted = true vì class đã xóa, schedule này không còn hợp lệ
//
// TAB 2 FIXES:
//     → attendance có school_id != class.school_id: cập nhật school_id từ class
//     → attendance trỏ class không tồn tại: flag để báo cáo

const cmd = `cd /app && node -e "
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

const MONTH = '2026-07';

async function run() {
  let fixCount = 0;

  // ==========================================
  // FIX 1a: Schedules của Cô An Nhi → school bị xóa
  // school_id sch-1784509148643 (Smilekid bị xóa) → sch-1783856923464 (Smilekid Cơ Sở 1)
  // ==========================================
  const fix1a = await pool.query(\\\`
    UPDATE schedules 
    SET school_id = 'sch-1783856923464'
    WHERE id IN ('SKD_e59ff460-aec0-4c4e-a863-41ca43ee2359', 'SKD_2e7f5ea3-9a84-4753-bde7-d48d32a2c507')
      AND school_id = 'sch-1784509148643'
  \\\`);
  console.log('Fix 1a (Cô An Nhi school → Smilekid CS1):', fix1a.rowCount, 'rows');
  fixCount += fix1a.rowCount;

  // ==========================================
  // FIX 1b: Schedules trỏ class bị xóa → đánh dấu is_deleted
  // Cô Lan → class cũ bị xóa (MẦM, LÁ)
  // ==========================================
  const fix1b = await pool.query(\\\`
    UPDATE schedules
    SET is_deleted = true
    WHERE id IN ('sch-1783863614044', 'SKD_9265fea7-567f-4355-9f01-31f33bb1e6e6', 'sch-1783864001920', 'sch-1783864042686', 'sch-1783864022980')
      AND teacher_id = 'GV_MSLAN'
  \\\`);
  console.log('Fix 1b (Cô Lan - soft delete schedules with deleted classes):', fix1b.rowCount, 'rows');
  fixCount += fix1b.rowCount;

  // ==========================================
  // FIX 1c: Schedules có school_id != class.school_id
  // → Cập nhật school_id của schedule theo class.school_id
  // ==========================================
  const fix1c = await pool.query(\\\`
    UPDATE schedules s
    SET school_id = c.school_id
    FROM classes c
    WHERE s.class_id = c.id
      AND s.is_deleted = false
      AND c.is_deleted = false
      AND s.school_id != c.school_id
  \\\`);
  console.log('Fix 1c (sync schedule.school_id from class.school_id):', fix1c.rowCount, 'rows');
  fixCount += fix1c.rowCount;

  // ==========================================
  // FIX 2: Attendance tháng 07/2026 có school_id != class.school_id
  // → Cập nhật school_id từ class
  // ==========================================
  const fix2 = await pool.query(\\\`
    UPDATE attendance a
    SET school_id = c.school_id
    FROM classes c
    WHERE a.class_id = c.id
      AND a.date LIKE '\${MONTH}%'
      AND a.school_id != c.school_id
  \\\`);
  console.log('Fix 2 (sync att.school_id from class.school_id for 2026-07):', fix2.rowCount, 'rows');
  fixCount += fix2.rowCount;

  // ==========================================
  // VERIFY sau khi fix
  // ==========================================
  const { rows: remainBadSchSch } = await pool.query(\\\`
    SELECT count(*) as cnt FROM schedules s
    LEFT JOIN schools sc ON sc.id = s.school_id
    WHERE s.is_deleted = false AND (sc.id IS NULL OR sc.is_deleted = true)
  \\\`);

  const { rows: remainBadClsSch } = await pool.query(\\\`
    SELECT count(*) as cnt FROM schedules s
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.is_deleted = false AND (c.id IS NULL OR c.is_deleted = true)
  \\\`);

  const { rows: remainMismatchSch } = await pool.query(\\\`
    SELECT count(*) as cnt FROM schedules s
    JOIN classes c ON c.id = s.class_id
    WHERE s.is_deleted = false AND c.school_id != s.school_id
  \\\`);

  const { rows: remainMismatchAtt } = await pool.query(\\\`
    SELECT count(*) as cnt FROM attendance a
    JOIN classes c ON c.id = a.class_id
    WHERE a.date LIKE '\${MONTH}%' AND c.school_id != a.school_id
  \\\`);

  const { rows: remainBadClsAtt } = await pool.query(\\\`
    SELECT count(*) as cnt FROM attendance a
    LEFT JOIN classes c ON c.id = a.class_id
    WHERE a.date LIKE '\${MONTH}%' AND c.id IS NULL
  \\\`);

  const { rows: pendingAtt } = await pool.query(\\\`
    SELECT count(*) as cnt FROM attendance
    WHERE date LIKE '\${MONTH}%' 
      AND confirmed_by_admin != true 
      AND is_verified != true 
      AND is_flagged != true
  \\\`);

  console.log('\\n========== POST-FIX VERIFICATION ==========');
  console.log('Total fixes applied:', fixCount);
  console.log('Tab1 - Schedules → school xóa/không tồn tại:', remainBadSchSch[0].cnt, remainBadSchSch[0].cnt == 0 ? '✅' : '❌');
  console.log('Tab1 - Schedules → class xóa/không tồn tại:', remainBadClsSch[0].cnt, remainBadClsSch[0].cnt == 0 ? '✅' : '❌');
  console.log('Tab1 - Schedules school != class school:', remainMismatchSch[0].cnt, remainMismatchSch[0].cnt == 0 ? '✅' : '❌');
  console.log('Tab2 - Att school != class school (07/2026):', remainMismatchAtt[0].cnt, remainMismatchAtt[0].cnt == 0 ? '✅' : '❌');
  console.log('Tab2 - Att trỏ class không tồn tại (07/2026):', remainBadClsAtt[0].cnt, remainBadClsAtt[0].cnt == 0 ? '✅' : '❌');
  console.log('Tab5 - Att chưa duyệt (07/2026):', pendingAtt[0].cnt, pendingAtt[0].cnt == 0 ? '✅ PASS' : '⚠️ còn pending');

  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(config);
