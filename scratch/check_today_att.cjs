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
    console.log("=== TODAY'S ATTENDANCE FOR MS LAN (2026-07-27) ===");
    const att = await pool.query("SELECT * FROM attendance WHERE teacher_id = 'GV_MSLAN' AND date = '2026-07-27'");
    console.log(JSON.stringify(att.rows, null, 2));

    console.log("\\n=== SCHOOLS FOR TODAY'S ATTENDANCE ===");
    const schoolIds = att.rows.map(a => a.school_id);
    if (schoolIds.length > 0) {
      const schools = await pool.query("SELECT id, name FROM schools WHERE id = ANY($1::text[])", [schoolIds]);
      console.log(JSON.stringify(schools.rows, null, 2));
    }

    console.log("\\n=== CLASSES FOR TODAY'S ATTENDANCE ===");
    const classIds = att.rows.map(a => a.class_id);
    if (classIds.length > 0) {
      const classes = await pool.query("SELECT id, name, school_id FROM classes WHERE id = ANY($1::text[])", [classIds]);
      console.log(JSON.stringify(classes.rows, null, 2));
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
