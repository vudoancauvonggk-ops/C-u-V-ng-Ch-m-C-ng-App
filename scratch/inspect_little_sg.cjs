module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cd /app && npx tsx -r dotenv/config -e "
    import { db } from './src/db/index.ts';
    import { schools } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const schs = await db.select().from(schools);
      console.log('=== Little SG / Sài Gòn schools ===');
      schs.filter(s => s.name.toLowerCase().includes('little') || s.name.toLowerCase().includes('sài gòn') || s.name.toLowerCase().includes('sg')).forEach(s => {
        console.log(s.id, ':', s.name, '| isDeleted:', s.isDeleted);
      });
    }
    run().then(() => process.exit(0)).catch(console.error);
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect(config);
