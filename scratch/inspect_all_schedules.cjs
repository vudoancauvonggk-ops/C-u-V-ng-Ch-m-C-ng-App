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
    import { schools, classes, schedules, teachers } from './src/db/schema.ts';
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const schs = await db.select().from(schools);
      const cls = await db.select().from(classes);
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const tchs = await db.select().from(teachers);

      console.log('=== ACTIVE SCHEDULES IN VPS ===');
      const result = skds.map(s => {
        const teacher = tchs.find(t => t.id === s.teacherId);
        const classObj = cls.find(c => c.id === s.classId);
        const schoolObj = schs.find(sc => sc.id === s.schoolId);
        return {
          scheduleId: s.id,
          teacherName: teacher ? teacher.name : 'Unknown',
          className: classObj ? classObj.name : 'Unknown',
          schoolName: schoolObj ? schoolObj.name : 'Unknown',
          dayOfWeek: s.dayOfWeek,
          session: s.session
        };
      });
      
      console.log(JSON.stringify(result, null, 2));
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
