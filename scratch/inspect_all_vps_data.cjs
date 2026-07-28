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
    import { schools, classes, schedules } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const schs = await db.select().from(schools).where(eq(schools.isDeleted, false));
      console.log('=== SCHOOLS ===');
      schs.forEach(s => console.log(JSON.stringify({ id: s.id, name: s.name })));

      const cls = await db.select().from(classes).where(eq(classes.isDeleted, false));
      console.log('=== CLASSES ===');
      cls.forEach(c => console.log(JSON.stringify({ id: c.id, name: c.name, schoolId: c.schoolId })));

      const skd = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      console.log('=== SCHEDULES ===');
      skd.forEach(s => console.log(JSON.stringify({ id: s.id, schoolId: s.schoolId, classId: s.classId })));
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
