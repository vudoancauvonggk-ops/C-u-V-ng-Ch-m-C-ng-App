module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const vpsCode = `
const { Pool } = require('pg');
require('dotenv').config({ path: '/app/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  try {
    console.log("==========================================");
    console.log("   GLOBAL DATABASE INTEGRITY AUDIT (FIXED)");
    console.log("==========================================");

    // 1. Check all deleted schedules
    const delScheds = await pool.query("SELECT s.*, t.name as teacher_name, sc.name as school_name FROM schedules s LEFT JOIN teachers t ON s.teacher_id = t.id LEFT JOIN schools sc ON s.school_id = sc.id WHERE s.is_deleted = true");
    console.log(\`\\n[1] DELETED SCHEDULES COUNT: \${delScheds.rows.length}\`);

    // 2. Check active schedules pointing to deleted schools
    const schedDeletedSchool = await pool.query(
      \`SELECT s.id, s.teacher_id, t.name as teacher_name, s.school_id, sc.name as school_name, sc.is_deleted as school_is_deleted 
       FROM schedules s 
       JOIN schools sc ON s.school_id = sc.id 
       LEFT JOIN teachers t ON s.teacher_id = t.id 
       WHERE s.is_deleted = false AND sc.is_deleted = true\`
    );
    console.log(\`\\n[2] ACTIVE SCHEDULES POINTING TO DELETED SCHOOLS: \${schedDeletedSchool.rows.length}\`);
    if (schedDeletedSchool.rows.length > 0) console.table(schedDeletedSchool.rows);

    // 3. Check active schedules pointing to deleted classes
    const schedDeletedClass = await pool.query(
      \`SELECT s.id, s.teacher_id, t.name as teacher_name, s.school_id, sc.name as school_name, s.class_id, c.name as class_name 
       FROM schedules s 
       JOIN classes c ON s.class_id = c.id 
       JOIN schools sc ON s.school_id = sc.id 
       LEFT JOIN teachers t ON s.teacher_id = t.id 
       WHERE s.is_deleted = false AND c.is_deleted = true\`
    );
    console.log(\`\\n[3] ACTIVE SCHEDULES POINTING TO DELETED CLASSES: \${schedDeletedClass.rows.length}\`);
    if (schedDeletedClass.rows.length > 0) console.table(schedDeletedClass.rows);

    // 4. Check active attendance pointing to deleted schools
    const attDeletedSchool = await pool.query(
      \`SELECT a.id, a.date, a.teacher_id, t.name as teacher_name, a.school_id, sc.name as school_name 
       FROM attendance a 
       JOIN schools sc ON a.school_id = sc.id 
       LEFT JOIN teachers t ON a.teacher_id = t.id 
       WHERE sc.is_deleted = true AND a.date >= '2026-07-01'\`
    );
    console.log(\`\\n[4] JULY ATTENDANCE POINTING TO DELETED SCHOOLS: \${attDeletedSchool.rows.length}\`);
    if (attDeletedSchool.rows.length > 0) console.table(attDeletedSchool.rows);

    // 5. Check active attendance pointing to deleted classes
    const attDeletedClass = await pool.query(
      \`SELECT a.id, a.date, a.teacher_id, t.name as teacher_name, a.school_id, sc.name as school_name, a.class_id, c.name as class_name 
       FROM attendance a 
       JOIN classes c ON a.class_id = c.id 
       JOIN schools sc ON a.school_id = sc.id 
       LEFT JOIN teachers t ON a.teacher_id = t.id 
       WHERE c.is_deleted = true AND a.date >= '2026-07-01'\`
    );
    console.log(\`\\n[5] JULY ATTENDANCE POINTING TO DELETED CLASSES: \${attDeletedClass.rows.length}\`);
    if (attDeletedClass.rows.length > 0) console.table(attDeletedClass.rows.slice(0, 30));

    // 6. Check teachers without schedules
    const teachersWithoutSched = await pool.query(
      \`SELECT t.id, t.name, t.phone, t.status 
       FROM teachers t 
       WHERE (t.is_deleted IS NULL OR t.is_deleted = false) 
         AND t.id NOT IN (SELECT DISTINCT teacher_id FROM schedules WHERE is_deleted = false)\`
    );
    console.log(\`\\n[6] ACTIVE TEACHERS WITHOUT ANY ACTIVE SCHEDULE: \${teachersWithoutSched.rows.length}\`);
    if (teachersWithoutSched.rows.length > 0) console.table(teachersWithoutSched.rows);

    // 7. Check total attendance count & periods for all teachers in July 2026
    const teacherJulyStats = await pool.query(
      \`SELECT t.id as teacher_id, t.name as teacher_name, COUNT(a.id) as attendance_count, SUM(CAST(a.periods AS INTEGER)) as total_periods 
       FROM teachers t 
       LEFT JOIN attendance a ON t.id = a.teacher_id AND a.date >= '2026-07-01' 
       WHERE (t.is_deleted IS NULL OR t.is_deleted = false) 
       GROUP BY t.id, t.name 
       ORDER BY t.name\`
    );
    console.log(\`\\n[7] TEACHER JULY 2026 PAYROLL SUMMARY (ATTENDANCE & PERIODS):\`);
    console.table(teacherJulyStats.rows);

  } catch (err) {
    console.error("Audit Error:", err);
  } finally {
    await pool.end();
  }
}
run();
`;

const b64 = Buffer.from(vpsCode).toString('base64');
const cmd = `cd /app && node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let stdout = '';
    let stderr = '';
    stream.on('close', () => {
      console.log(stdout);
      if (stderr) console.log("STDERR:", stderr);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    }).stderr.on('data', (data) => {
      stderr += data.toString();
    });
  });
}).connect(config);
