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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("=== UPDATING SCH002 ADDRESS & GPS FOR MẦM NON HOA HỒNG NHỎ ===");
    const res = await client.query(
      \`UPDATE schools 
       SET name = 'MẦM NON HOA HỒNG NHỎ', 
           address = '51 Đường Số 2, Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh',
           lat = 10.837485842711727,
           lng = 106.71633125793281
       WHERE id = 'SCH002' 
       RETURNING *\`
    );
    console.log("Updated SCH002 school:", res.rows[0]);

    await client.query('COMMIT');
    console.log("\\n>>> SUCCESS: SCH002 FULL DETAILS UPDATED <<<");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("FAILED, ROLLBACK EXECUTED:", err);
  } finally {
    client.release();
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
