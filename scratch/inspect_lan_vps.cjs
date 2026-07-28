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
    console.log("=== 1. TEACHERS MATCHING 'Lan' ===");
    const teachers = await pool.query("SELECT id, name, phone FROM teachers WHERE name ILIKE '%Lan%'");
    console.log(JSON.stringify(teachers.rows, null, 2));

    const lanIds = teachers.rows.map(t => t.id);
    if (lanIds.length > 0) {
      console.log("\\n=== 2. SCHEDULES FOR LAN (ACTIVE & DELETED) ===");
      const scheds = await pool.query("SELECT * FROM schedules WHERE teacher_id = ANY($1::text[])", [lanIds]);
      console.log(JSON.stringify(scheds.rows, null, 2));

      console.log("\\n=== 3. ATTENDANCE FOR LAN ===");
      const att = await pool.query("SELECT id, teacher_id, school_id, class_id, date, status, periods, schedule_id, is_deleted, created_at, updated_at FROM attendance WHERE teacher_id = ANY($1::text[]) ORDER BY date DESC LIMIT 50", [lanIds]);
      console.log(JSON.stringify(att.rows, null, 2));
    }

    console.log("\\n=== 4. RECENT AUDIT LOGS ===");
    const logs = await pool.query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 30");
    console.log(JSON.stringify(logs.rows, null, 2));

    console.log("\\n=== 5. CHECK ALL DELETED SCHEDULES IN SYSTEM ===");
    const delScheds = await pool.query("SELECT s.*, t.name as teacher_name, sc.name as school_name, c.name as class_name FROM schedules s LEFT JOIN teachers t ON s.teacher_id = t.id LEFT JOIN schools sc ON s.school_id = sc.id LEFT JOIN classes c ON s.class_id = c.id WHERE s.is_deleted = true");
    console.log(JSON.stringify(delScheds.rows, null, 2));

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
