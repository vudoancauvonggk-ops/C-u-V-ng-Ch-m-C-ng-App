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
    import { schedules, schools, classes } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const schs = await db.select().from(schools);
      const cls = await db.select().from(classes);

      console.log('=== Active schedules pointing to deleted schools ===');
      const grouped = {};
      skds.forEach(s => {
        const sch = schs.find(sc => sc.id === s.schoolId);
        if (sch && sch.isDeleted) {
          if (!grouped[s.schoolId]) {
            grouped[s.schoolId] = { school: sch, schedules: [] };
          }
          grouped[s.schoolId].schedules.push(s);
        }
      });

      console.log('Found schools:', Object.keys(grouped).length);
      for (const [schoolId, info] of Object.entries(grouped)) {
        console.log('- School:', info.school.name, '(', schoolId, ') | Active schedules:', info.schedules.length);
        info.schedules.forEach(s => {
          const c = cls.find(cl => cl.id === s.classId);
          console.log('  * SchedId:', s.id, '| Class:', c ? c.name : 'Unknown', '| Day:', s.dayOfWeek, '| Session:', s.session);
        });
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
