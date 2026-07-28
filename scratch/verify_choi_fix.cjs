module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const cmd = `cd /app && npx tsx -r dotenv/config -e "
import { db } from './src/db/index.ts';
import { attendance, schools } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const atts = await db.select().from(attendance).where(eq(attendance.id, 'ATT_1784275179167_1'));
  console.log('ATT_1784275179167_1 CURRENT SCHOOL ID:', atts[0]?.schoolId);

  const schs = await db.select().from(schools);
  const choiSchools = schs.filter(s => s.name.trim() === 'Chồi');
  console.log('CHOI SCHOOLS COUNT:', choiSchools.length);

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log('OUT:', data.toString()));
    stream.stderr.on('data', data => console.error('ERR:', data.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
