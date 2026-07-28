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
  const { rows: schs } = await pool.query('SELECT id, name, is_deleted FROM schools');
  const { rows: classes } = await pool.query('SELECT id, name, school_id FROM classes');
  const { rows: schedules } = await pool.query('SELECT * FROM schedules WHERE is_deleted = false');
  const { rows: atts } = await pool.query(\\"SELECT * FROM attendance WHERE date LIKE '2026-07%'\\\");

  console.log('=== TUỔI TIÊN SCHEDULES DETAILS ===');
  schedules.filter(s => {
    const sc = schs.find(x => x.id === s.school_id);
    return sc && sc.name.toLowerCase().includes('tuổi tiên');
  }).forEach(s => console.log('Schedule:', s.id, '| Teacher:', s.teacher_id, '| SchoolID:', s.school_id, '| ClassID:', s.class_id));

  console.log('=== HOA HỒNG CLASSES & SCHEDULES ===');
  const hhSchools = schs.filter(s => s.name.toLowerCase().includes('hoa hồng'));
  console.log('Hoa Hong Schools:', hhSchools);

  console.log('=== THIÊN THẦN CLASSES & SCHEDULES ===');
  const ttSchools = schs.filter(s => s.name.toLowerCase().includes('thiên thần'));
  console.log('Thien Than Schools:', ttSchools);

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
