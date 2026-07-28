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
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const cls = await db.select().from(classes).where(eq(classes.isDeleted, false));
      const schs = await db.select().from(schools).where(eq(schools.isDeleted, false));
      const tchs = await db.select().from(teachers);

      const targetSchoolIds = ['sch-1784104493761', 'sch-1784356500727', 'SCH_1784440146071'];

      for (const schoolId of targetSchoolIds) {
        const sch = schs.find(s => s.id === schoolId);
        console.log('=== School:', sch ? sch.name : 'Unknown', '(', schoolId, ') ===');
        const schoolSkds = skds.filter(s => s.schoolId === schoolId);
        schoolSkds.forEach(s => {
          const c = cls.find(cl => cl.id === s.classId);
          const t = tchs.find(tc => tc.id === s.teacherId);
          console.log('  * Sched:', s.id, '| Class:', c?.name, '(', s.classId, ')', '| Teacher:', t?.name, '(', s.teacherId, ')', '| Day:', s.dayOfWeek, '| Session:', s.session);
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
