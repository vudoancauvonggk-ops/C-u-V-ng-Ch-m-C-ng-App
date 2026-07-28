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
    const schools = await pool.query("SELECT id, name FROM schools");
    const schoolMap = {};
    schools.rows.forEach(s => schoolMap[s.id] = s.name);

    const classes = await pool.query("SELECT id, name FROM classes");
    const classMap = {};
    classes.rows.forEach(c => classMap[c.id] = c.name);

    console.log("=== 1. VERIFY LAN'S ACTIVE SCHEDULES (DOW 2 & DOW 4) ===");
    const lanScheds = await pool.query(
      "SELECT * FROM schedules WHERE teacher_id = 'GV_MSLAN' AND day_of_week IN (2, 4) AND is_deleted = false ORDER BY day_of_week, session"
    );
    console.table(lanScheds.rows.map(s => ({
      id: s.id,
      dow: s.day_of_week === 2 ? 'T2' : 'T4',
      session: s.session,
      school: schoolMap[s.school_id] || s.school_id,
      class: classMap[s.class_id] || s.class_id,
      periods: s.periods,
      is_deleted: s.is_deleted
    })));

    console.log("\\n=== 2. VERIFY ANY DELETED SCHEDULES ACROSS THE SYSTEM ===");
    const delScheds = await pool.query("SELECT * FROM schedules WHERE is_deleted = true");
    console.log("Total deleted schedules in DB:", delScheds.rows.length);

    console.log("\\n=== 3. VERIFY LAN'S TODAY ATTENDANCE (2026-07-27) ===");
    const todayAtt = await pool.query("SELECT * FROM attendance WHERE teacher_id = 'GV_MSLAN' AND date = '2026-07-27'");
    console.table(todayAtt.rows.map(a => ({
      id: a.id,
      date: a.date,
      school: schoolMap[a.school_id] || a.school_id,
      class: classMap[a.class_id] || a.class_id,
      periods: a.periods,
      schedule_id: a.schedule_id
    })));

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
