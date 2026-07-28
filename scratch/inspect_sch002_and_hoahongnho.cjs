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
    console.log("=== SCH002 DETAILS ===");
    const sch002 = await pool.query("SELECT * FROM schools WHERE id = 'SCH002'");
    console.log(sch002.rows[0]);

    console.log("\\n=== sch-1784440450584 DETAILS ===");
    const sch1784 = await pool.query("SELECT * FROM schools WHERE id = 'sch-1784440450584'");
    console.log(sch1784.rows[0]);

    console.log("\\n=== CLASSES FOR SCH002 ===");
    const c1 = await pool.query("SELECT * FROM classes WHERE school_id = 'SCH002'");
    console.table(c1.rows);

    console.log("\\n=== CLASSES FOR sch-1784440450584 ===");
    const c2 = await pool.query("SELECT * FROM classes WHERE school_id = 'sch-1784440450584'");
    console.table(c2.rows);

    console.log("\\n=== SCHEDULES FOR SCH002 ===");
    const s1 = await pool.query("SELECT s.*, t.name as teacher FROM schedules s LEFT JOIN teachers t ON s.teacher_id = t.id WHERE s.school_id = 'SCH002'");
    console.table(s1.rows);

    console.log("\\n=== SCHEDULES FOR sch-1784440450584 ===");
    const s2 = await pool.query("SELECT s.*, t.name as teacher FROM schedules s LEFT JOIN teachers t ON s.teacher_id = t.id WHERE s.school_id = 'sch-1784440450584'");
    console.table(s2.rows);

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
