module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const cmd = `cd /app && node -e "
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  const { rows: schools } = await pool.query('SELECT id, name, is_deleted FROM schools');
  const { rows: atts } = await pool.query(\\"SELECT id, date, teacher_id, school_id, class_id FROM attendance WHERE date LIKE '2026-07%' AND (confirmed_by_admin = true OR is_verified = true)\\\");
  const { rows: schs } = await pool.query('SELECT id, school_id, teacher_id FROM schedules WHERE is_deleted = false');

  console.log('=== 1. DELETED SCHOOLS WITH 2026-07 APPROVED LOGS ===');
  const deletedWithAtt = schools.filter(s => s.is_deleted && atts.some(a => a.school_id === s.id));
  if (deletedWithAtt.length === 0) console.log('NONE (All clean!)');
  else deletedWithAtt.forEach(s => console.log('Deleted school with att:', s));

  console.log('=== 2. SCHOOLS WITH ATTENDANCE BUT 0 SCHEDULES ===');
  const attSchoolIds = Array.from(new Set(atts.map(a => a.school_id)));
  const noSch = attSchoolIds.filter(sid => !schs.some(sc => sc.school_id === sid));
  if (noSch.length === 0) console.log('NONE (All clean!)');
  else noSch.forEach(sid => {
    const s = schools.find(x => x.id === sid);
    const count = atts.filter(a => a.school_id === sid).length;
    console.log('School ID:', sid, '| Name:', s ? s.name : 'UNKNOWN', '| isDeleted:', s ? s.is_deleted : null, '| Att Count:', count);
  });

  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log(data.toString()));
    stream.stderr.on('data', data => console.error(data.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
