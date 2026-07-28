module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = { host: '103.82.21.133', port: 22, username: 'root', password: '5A3N84JY026MdF2n' };

const cmd = `cd /app && node -e "
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const MONTH = '2026-07';

  // Tab 2 details
  const { rows: mismatchAtt } = await pool.query(\\\`
    SELECT a.id, a.teacher_id, t.name as teacher_name, a.school_id as att_school, sc.name as att_school_name,
           c.school_id as class_school, cs.name as class_school_name, c.name as class_name, a.date, a.periods
    FROM attendance a
    LEFT JOIN teachers t ON t.id = a.teacher_id
    JOIN classes c ON c.id = a.class_id
    LEFT JOIN schools sc ON sc.id = a.school_id
    LEFT JOIN schools cs ON cs.id = c.school_id
    WHERE a.date LIKE '\${MONTH}%' AND c.school_id != a.school_id
    LIMIT 30
  \\\`);

  const { rows: badClsAtt } = await pool.query(\\\`
    SELECT a.id, a.teacher_id, t.name as teacher_name, a.class_id, a.date, a.periods
    FROM attendance a
    LEFT JOIN teachers t ON t.id = a.teacher_id
    LEFT JOIN classes c ON c.id = a.class_id
    WHERE a.date LIKE '\${MONTH}%' AND c.id IS NULL
    LIMIT 30
  \\\`);

  console.log('Tab2-mismatch count:', mismatchAtt.length);
  if (mismatchAtt.length) console.log(JSON.stringify(mismatchAtt, null, 2));
  console.log('Tab2-orphan class count:', badClsAtt.length);
  if (badClsAtt.length) console.log(JSON.stringify(badClsAtt, null, 2));

  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(config);
