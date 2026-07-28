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
  console.log('=== FIXING MS DIEU SCHOOL LINK ===');

  // Move Ms. Diệu attendance records away from sch-1784440486418 (MẦM NON THIÊN THẦN NHỎ) to SCH005 (Thiên Thần Tý Hon)
  const res = await pool.query(
    "UPDATE attendance SET school_id = 'SCH005' WHERE teacher_id = 'GV_MSDIEU' AND school_id = 'sch-1784440486418'"
  );
  console.log('Updated attendance rows count:', res.rowCount);

  // Also check if any schedules exist for Ms. Diệu under sch-1784440486418
  const resSched = await pool.query(
    "UPDATE schedules SET school_id = 'SCH005' WHERE teacher_id = 'GV_MSDIEU' AND school_id = 'sch-1784440486418'"
  );
  console.log('Updated schedules rows count:', resSched.rowCount);

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /tmp/fix_dieu.js\n${code}\nEOF\ncd /app && NODE_PATH=/app/node_modules node /tmp/fix_dieu.js; rm -f /tmp/fix_dieu.js`, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => process.stdout.write(data.toString()));
    stream.stderr.on('data', data => process.stderr.write(data.toString()));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect(config);
