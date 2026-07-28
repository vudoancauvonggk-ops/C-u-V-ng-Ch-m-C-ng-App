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
    console.log("=== 1. SCHOOLS INVOLVED ===");
    const schools = await pool.query("SELECT id, name, is_deleted FROM schools");
    const schoolMap = {};
    schools.rows.forEach(s => schoolMap[s.id] = s);
    console.log(JSON.stringify(schools.rows, null, 2));

    console.log("\\n=== 2. CLASSES INVOLVED ===");
    const classes = await pool.query("SELECT id, name, school_id, is_deleted FROM classes");
    const classMap = {};
    classes.rows.forEach(c => classMap[c.id] = c);

    console.log("\\n=== 3. LAN'S SCHEDULES WITH NAMES ===");
    const scheds = await pool.query("SELECT * FROM schedules WHERE teacher_id = 'GV_MSLAN'");
    const enrichedScheds = scheds.rows.map(s => ({
      ...s,
      school_name: schoolMap[s.school_id]?.name || s.school_id,
      class_name: classMap[s.class_id]?.name || s.class_id,
      school_deleted: schoolMap[s.school_id]?.is_deleted,
      class_deleted: classMap[s.class_id]?.is_deleted,
    }));
    console.table(enrichedScheds);

    console.log("\\n=== 4. ATTENDANCE TABLE COLUMNS ===");
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance'");
    console.log(cols.rows.map(c => c.column_name));

    console.log("\\n=== 5. ATTENDANCE FOR MS LAN ===");
    const att = await pool.query("SELECT * FROM attendance WHERE teacher_id = 'GV_MSLAN' ORDER BY date DESC LIMIT 40");
    const enrichedAtt = att.rows.map(a => ({
      id: a.id,
      date: a.date,
      periods: a.periods,
      school_name: schoolMap[a.school_id]?.name || a.school_id,
      class_name: classMap[a.class_id]?.name || a.class_id,
      schedule_id: a.schedule_id,
      is_deleted: a.is_deleted,
      created_at: a.created_at
    }));
    console.table(enrichedAtt);

    console.log("\\n=== 6. AUDIT LOGS ===");
    const logs = await pool.query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 30");
    console.log(JSON.stringify(logs.rows, null, 2));

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
      console.log("--- STDOUT ---");
      console.log(stdout);
      if (stderr) console.log("--- STDERR ---", stderr);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    }).stderr.on('data', (data) => {
      stderr += data.toString();
    });
  });
}).connect(config);
