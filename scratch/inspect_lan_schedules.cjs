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

    console.log("=== LAN'S ALL SCHEDULES ===");
    const scheds = await pool.query("SELECT * FROM schedules WHERE teacher_id = 'GV_MSLAN' ORDER BY day_of_week, session");
    const enrichedScheds = scheds.rows.map(s => ({
      id: s.id,
      dow: s.day_of_week,
      session: s.session,
      school_id: s.school_id,
      school_name: schoolMap[s.school_id]?.name || s.school_id,
      school_deleted: schoolMap[s.school_id]?.is_deleted,
      class_name: classMap[s.class_id]?.name || s.class_id,
      periods: s.periods,
      is_deleted: s.is_deleted
    }));
    console.table(enrichedScheds);

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
