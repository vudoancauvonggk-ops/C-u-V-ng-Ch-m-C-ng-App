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
  const { rows: atts } = await pool.query(\\"SELECT id, date, teacher_id, school_id, class_id FROM attendance WHERE date LIKE '2026-07%' AND (confirmed_by_admin = true OR is_verified = true)\\\");

  const deletedIds = [
    'sch-1783867922784',
    'sch-1784431996627',
    'SCH_1783664214934',
    'SCH001',
    'SCH_DYN_71B298ED',
    'SCH005',
    'sch-1784647321114',
    'SCH_1784086041869_GV_MSDUYEN',
    'sch-1784356500727'
  ];

  for (const delId of deletedIds) {
    const s = schools.find(x => x.id === delId);
    const sAtts = atts.filter(a => a.school_id === delId);
    console.log('=== DELETED SCHOOL:', s ? s.name : delId, '===');
    console.log('Att count:', sAtts.length);
    for (const a of sAtts) {
      const cls = classes.find(c => c.id === a.class_id);
      console.log('  AttID:', a.id, '| Date:', a.date, '| Teacher:', a.teacher_id, '| Class:', cls ? cls.name : 'N/A', '| ClassSchoolID:', cls ? cls.school_id : 'N/A');
    }

    const activeMatches = schools.filter(x => !x.is_deleted && x.name.toLowerCase().includes(s ? s.name.toLowerCase().slice(0, 4) : ''));
    console.log('  Active Matches:', activeMatches.map(m => m.id + ': ' + m.name));
  }

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
