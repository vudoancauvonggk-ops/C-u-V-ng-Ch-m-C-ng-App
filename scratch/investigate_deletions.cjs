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
    const schools = await pool.query("SELECT id, name, is_deleted FROM schools");
    const schoolMap = {};
    schools.rows.forEach(s => schoolMap[s.id] = s);

    const classes = await pool.query("SELECT id, name, school_id, is_deleted FROM classes");
    const classMap = {};
    classes.rows.forEach(c => classMap[c.id] = c);

    const teachers = await pool.query("SELECT id, name FROM teachers");
    const teacherMap = {};
    teachers.rows.forEach(t => teacherMap[t.id] = t);

    console.log("=== ALL DELETED SCHEDULES IN SYSTEM ===");
    const delScheds = await pool.query("SELECT * FROM schedules WHERE is_deleted = true ORDER BY teacher_id, day_of_week");
    const enrichedDel = delScheds.rows.map(s => ({
      id: s.id,
      dow: s.day_of_week,
      session: s.session,
      teacher: teacherMap[s.teacher_id]?.name || s.teacher_id,
      school: schoolMap[s.school_id]?.name || s.school_id,
      class: classMap[s.class_id]?.name || s.class_id,
      periods: s.periods,
      deleted_at: s.deleted_at
    }));
    console.table(enrichedDel);

    console.log("\\n=== SCHOOLS NAMED HOA HỒNG ===");
    const hoaHongSchools = await pool.query("SELECT * FROM schools WHERE name ILIKE '%Hoa Hồng%' OR name ILIKE '%Hoa Hong%'");
    console.table(hoaHongSchools.rows);

    console.log("\\n=== ATTENDANCE RECORDS WITH SCHEDULE_ID IN DELETED SCHEDULES ===");
    const delSchedIds = delScheds.rows.map(s => s.id);
    if (delSchedIds.length > 0) {
      const atts = await pool.query("SELECT id, teacher_id, school_id, class_id, date, periods, schedule_id, is_deleted FROM attendance WHERE schedule_id = ANY($1::text[])", [delSchedIds]);
      console.table(atts.rows.map(a => ({
        ...a,
        teacher: teacherMap[a.teacher_id]?.name || a.teacher_id,
        school: schoolMap[a.school_id]?.name || a.school_id,
        class: classMap[a.class_id]?.name || a.class_id,
      })));
    }

  } catch (err) {
    console.error("Error:", err);
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
