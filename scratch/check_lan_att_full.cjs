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

    console.log("=== LAN'S ATTENDANCE IN JULY 2026 ===");
    const att = await pool.query("SELECT * FROM attendance WHERE teacher_id = 'GV_MSLAN' AND date >= '2026-07-01' ORDER BY date DESC");
    const enrichedAtt = att.rows.map(a => ({
      id: a.id,
      date: a.date,
      school: schoolMap[a.school_id] || a.school_id,
      class: classMap[a.class_id] || a.class_id,
      periods: a.periods,
      schedule_id: a.schedule_id,
      created_at: a.created_at
    }));
    console.table(enrichedAtt);

    console.log("\\n=== SUMMARY OF ATTENDANCE BY DAY OF WEEK FOR LAN IN JULY 2026 ===");
    // Group attendance by date
    const byDate = {};
    att.rows.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });
    Object.keys(byDate).sort().reverse().forEach(date => {
      const records = byDate[date];
      const totalPeriods = records.reduce((sum, r) => sum + Number(r.periods || 0), 0);
      const d = new Date(date);
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dowStr = days[d.getDay()];
      console.log(\`Date: \${date} (\${dowStr}): \${records.length} records, \${totalPeriods} periods. Schools: \${records.map(r => (schoolMap[r.school_id]||r.school_id) + ' (' + (classMap[r.class_id]||r.class_id) + ')').join(', ')}\`);
    });

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
