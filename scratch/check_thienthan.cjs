module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const code = `
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  console.log('=== CHECKING MẦM NON THIÊN THẦN NHỎ TEACHERS ===');

  const schoolId = 'sch-1784440486418';
  
  const classesRes = await pool.query("SELECT id, name FROM classes WHERE school_id = $1 AND is_deleted = false", [schoolId]);
  console.log('Classes for MẦM NON THIÊN THẦN NHỎ:', JSON.stringify(classesRes.rows));

  const classIds = classesRes.rows.map(c => c.id);

  const schedRes = await pool.query("SELECT id, class_id, school_id, teacher_id FROM schedules WHERE (school_id = $1 OR class_id = ANY($2)) AND is_deleted = false", [schoolId, classIds]);
  console.log('Schedules:', JSON.stringify(schedRes.rows));

  const attRes = await pool.query("SELECT id, class_id, school_id, teacher_id, date FROM attendance WHERE (school_id = $1 OR class_id = ANY($2)) AND date LIKE '2026-07%'", [schoolId, classIds]);
  console.log('Attendance 2026-07:', JSON.stringify(attRes.rows));

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /tmp/check_thienthan.js\n${code}\nEOF\ncd /app && NODE_PATH=/app/node_modules node /tmp/check_thienthan.js; rm -f /tmp/check_thienthan.js`, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => process.stdout.write(data.toString()));
    stream.stderr.on('data', data => process.stderr.write(data.toString()));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect(config);
