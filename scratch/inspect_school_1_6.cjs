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

      const school16 = schs.find(s => s.name.includes('1/6') && !s.isDeleted);
      console.log('=== School 1/6 ===', school16 ? school16.id : 'Not Found', school16 ? school16.name : '');

      if (school16) {
        console.log('=== Active Classes under 1/6 ===');
        const classes16 = cls.filter(c => c.schoolId === school16.id && !c.isDeleted);
        classes16.forEach(c => {
          const sCount = skds.filter(s => s.classId === c.id).length;
          console.log(c.id, ':', c.name, '| Schedules count:', sCount);
        });

        console.log('=== Active Schedules under 1/6 ===');
        const skds16 = skds.filter(s => s.schoolId === school16.id);
        skds16.forEach(s => {
          const c = cls.find(cl => cl.id === s.classId);
          const t = tchs.find(tc => tc.id === s.teacherId);
          console.log('ScheduleId:', s.id, '| Class:', c ? c.name : 'Unknown', '| Teacher:', t ? t.name : 'Unknown', '(', s.teacherId, ')', '| Day:', s.dayOfWeek, '| Session:', s.session);
        });
      }

      console.log('=== Schedules of Teacher Pham Thanh An ===');
      const teacherAn = tchs.find(t => t.name.toLowerCase().includes('thanh an') || t.id.toLowerCase().includes('an'));
      if (teacherAn) {
        console.log('Teacher:', teacherAn.id, teacherAn.name);
        const skdsAn = skds.filter(s => s.teacherId === teacherAn.id);
        skdsAn.forEach(s => {
          const c = cls.find(cl => cl.id === s.classId);
          const sc = schs.find(sch => sch.id === s.schoolId);
          console.log('ScheduleId:', s.id, '| School:', sc ? sc.name : 'Unknown', '| Class:', c ? c.name : 'Unknown', '| Day:', s.dayOfWeek, '| Session:', s.session);
        });
      } else {
        console.log('Teacher Pham Thanh An not found in teachers table.');
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
