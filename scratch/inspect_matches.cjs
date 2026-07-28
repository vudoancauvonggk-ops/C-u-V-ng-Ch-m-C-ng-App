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
    import { schedules, classes, schools, teachers } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const skds = await db.select().from(schedules);
      const cls = await db.select().from(classes);
      const schs = await db.select().from(schools);
      const tchs = await db.select().from(teachers);

      console.log('=== Simba Schedules info ===');
      const simbaSkds = skds.filter(s => s.classId === 'cls-1783691063621');
      for (const s of simbaSkds) {
        const t = tchs.find(tc => tc.id === s.teacherId);
        console.log('SchedId:', s.id, '| Teacher:', t?.name, '| Day:', s.dayOfWeek, '| Session:', s.session, '| Deleted:', s.isDeleted);
      }

      console.log('=== All active/deleted classes named Simba ===');
      cls.filter(c => c.name.includes('Simba')).forEach(c => {
        const sch = schs.find(s => s.id === c.schoolId);
        console.log(c.id, ':', c.name, 'under school:', sch ? sch.name : 'Unknown', 'isDeleted:', c.isDeleted);
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
