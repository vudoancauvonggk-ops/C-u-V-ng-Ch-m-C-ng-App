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
  const { rows: classes } = await pool.query('SELECT id, name, school_id FROM classes');
  const { rows: schs } = await pool.query('SELECT id, school_id, teacher_id, class_id FROM schedules WHERE is_deleted = false');
  const { rows: atts } = await pool.query(\\"SELECT id, date, teacher_id, school_id, class_id FROM attendance WHERE date LIKE '2026-07%'\\\");

  console.log('=== 1. HOA HỒNG SCHOOLS ===');
  const hoaHongSch = schools.filter(s => s.name.includes('Hoa Hồng') || s.name.includes('hoa hồng'));
  console.log(JSON.stringify(hoaHongSch, null, 2));

  console.log('=== 2. THIÊN THẦN SCHOOLS & ATTENDANCE ===');
  const thienThanSch = schools.filter(s => s.name.toLowerCase().includes('thiên thần'));
  console.log(JSON.stringify(thienThanSch, null, 2));
  const thienThanAtt = atts.filter(a => thienThanSch.some(s => s.id === a.school_id));
  console.log('Att for thien than:', JSON.stringify(thienThanAtt, null, 2));

  console.log('=== 3. MS BINH NHI ATTENDANCE / SCHEDULES ===');
  const binhNhiAtt = atts.filter(a => a.teacher_id === 'GV_MSBINHNHI' || (a.teacher_id && a.teacher_id.includes('BINHNHI')));
  console.log('Att:', JSON.stringify(binhNhiAtt, null, 2));

  console.log('=== 4. HOẠ MY SCHOOLS & ATTENDANCE ===');
  const hoaMySch = schools.filter(s => s.name.toLowerCase().includes('hoạ m') || s.name.toLowerCase().includes('họa m'));
  console.log(JSON.stringify(hoaMySch, null, 2));
  const hoaMyAtt = atts.filter(a => hoaMySch.some(s => s.id === a.school_id));
  console.log('Att for hoamy:', JSON.stringify(hoaMyAtt, null, 2));

  console.log('=== 5. IRIS SCHOOLS & SCHEDULES ===');
  const irisSch = schools.filter(s => s.name.toLowerCase().includes('iris'));
  console.log(JSON.stringify(irisSch, null, 2));

  console.log('=== 6. TUỔI TIÊN SCHOOLS & SCHEDULES ===');
  const tuoiTienSch = schools.filter(s => s.name.toLowerCase().includes('tuổi tiên'));
  console.log(JSON.stringify(tuoiTienSch, null, 2));
  const tuoiTienSchedules = schs.filter(sc => tuoiTienSch.some(s => s.id === sc.school_id));
  console.log('Tuoi Tien Schedules:', JSON.stringify(tuoiTienSchedules, null, 2));

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
