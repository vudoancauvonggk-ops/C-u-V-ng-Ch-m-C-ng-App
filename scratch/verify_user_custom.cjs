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
  const { rows: schools } = await pool.query('SELECT id, name, is_deleted FROM schools WHERE is_deleted = false');
  console.log('=== CURRENT ACTIVE SCHOOLS ===');
  const targetNames = ['Hoa Hồng', 'Thiên Thần', 'Sao Việt', 'Hoạ My', 'Iris', 'Tuổi Tiên'];
  schools.filter(s => targetNames.some(t => s.name.includes(t))).forEach(s => console.log('Active School:', s.id, '|', s.name));

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
