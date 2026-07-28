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
import { schools, classes } from './src/db/schema.ts';
import { ilike } from 'drizzle-orm';

async function run() {
  const saoviet = await db.select().from(schools).where(ilike(schools.name, '%Sao Việt%'));
  console.log('=== SAO VIỆT SCHOOLS ===');
  console.log(JSON.stringify(saoviet, null, 2));

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
