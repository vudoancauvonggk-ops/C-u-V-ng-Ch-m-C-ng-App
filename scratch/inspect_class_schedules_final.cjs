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
    import { classes, schedules, schools, teachers } from './src/db/schema.ts';
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const cls = await db.select().from(classes).where(eq(classes.isDeleted, false));
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const schs = await db.select().from(schools);
      const tchs = await db.select().from(teachers);

      console.log('=== Checking classes with > 2 active schedules ===');
      
      const classScheduleGroups = {};
      skds.forEach(s => {
        if (!classScheduleGroups[s.classId]) {
          classScheduleGroups[s.classId] = [];
        }
        classScheduleGroups[s.classId].push(s);
      });

      let foundCount = 0;
      for (const [classId, list] of Object.entries(classScheduleGroups)) {
        if (list.length > 2) {
          foundCount++;
          const c = cls.find(cl => cl.id === classId);
          if (!c) continue; // Deleted class
          const sch = schs.find(s => s.id === c.schoolId);
          console.log('- Class:', c.name, '(', c.id, ') under school:', sch ? sch.name : 'Unknown', '(', c.schoolId, ') | Active schedules:', list.length);
          list.forEach(s => {
            const t = tchs.find(tc => tc.id === s.teacherId);
            console.log('  * SchedId:', s.id, '| Teacher:', t ? t.name : 'Unknown', '| Day:', s.dayOfWeek, '| Session:', s.session);
          });
        }
      }
      console.log('Total classes with > 2 schedules:', foundCount);
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
