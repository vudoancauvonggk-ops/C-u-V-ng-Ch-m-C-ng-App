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
    import { classes, schools } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const cls1 = await db.select().from(classes).where(eq(classes.id, 'cls-1783872267545'));
      console.log('Class cls-1783872267545 state:', cls1);
      if (cls1.length > 0) {
        const s = await db.select().from(schools).where(eq(schools.id, cls1[0].schoolId));
        console.log('School for cls-1783872267545:', s);
      }

      const cls2 = await db.select().from(classes).where(eq(classes.id, 'cls-1784104463150'));
      console.log('Class cls-1784104463150 state:', cls2);
      if (cls2.length > 0) {
        const s = await db.select().from(schools).where(eq(schools.id, cls2[0].schoolId));
        console.log('School for cls-1784104463150:', s);
      }
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
