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
  const { rows: atts } = await pool.query("SELECT * FROM attendance WHERE id = 'ATT_1784018087904_0'");
  console.log('Att details:', atts[0]);

  let targetSchoolId = 'sch-1784104493761';
  if (atts.length > 0 && atts[0].class_id) {
    const { rows: cls } = await pool.query("SELECT * FROM classes WHERE id = '" + atts[0].class_id + "'");
    console.log('Class details:', cls[0]);
    if (cls[0] && cls[0].school_id && cls[0].school_id !== 'sch-1784356500727') {
      targetSchoolId = cls[0].school_id;
    }
  }

  await pool.query("UPDATE attendance SET school_id = '" + targetSchoolId + "' WHERE school_id = 'sch-1784356500727'");
  await pool.query("UPDATE classes SET school_id = '" + targetSchoolId + "' WHERE school_id = 'sch-1784356500727'");
  console.log('Merged Sao Việt to targetSchoolId:', targetSchoolId);

  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/fix_saoviet.js\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && node fix_saoviet.js && rm /app/fix_saoviet.js', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
