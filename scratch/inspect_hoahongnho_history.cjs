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
    console.log("=== ATTENDANCE FOR ALL SCHOOLS WITH HOA HONG ===");
    const att = await pool.query(
      "SELECT a.id, a.date, a.school_id, s.name as school_name, a.class_id, c.name as class_name, a.teacher_id, t.name as teacher_name FROM attendance a LEFT JOIN schools s ON a.school_id = s.id LEFT JOIN classes c ON a.class_id = c.id LEFT JOIN teachers t ON a.teacher_id = t.id WHERE s.name ILIKE '%Hoa Hồng%' OR s.name ILIKE '%Hoa Hong%' ORDER BY a.date DESC LIMIT 50"
    );
    console.table(att.rows);

    console.log("\\n=== ACTIVE SCHOOLS IN DATABASE ===");
    const activeSchools = await pool.query("SELECT id, name, address, is_deleted FROM schools WHERE is_deleted = false ORDER BY name");
    console.table(activeSchools.rows);

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
