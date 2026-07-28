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
    import { eq } from 'drizzle-orm';
    async function run() {
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const cls = await db.select().from(classes);
      const schs = await db.select().from(schools);
      const tchs = await db.select().from(teachers);

      const targetSchedules = skds.filter(s => {
        const schoolObj = schs.find(sc => sc.id === s.schoolId);
        const classObj = cls.find(c => c.id === s.classId);
        const sName = schoolObj ? schoolObj.name : '';
        const cName = classObj ? classObj.name : '';
        return sName.includes('1/6') || sName.includes('1 Tháng 6') || cName.includes('1/6') || cName.includes('1 Tháng 6');
      });

      console.log('=== MATCHING SCHEDULES ===');
      targetSchedules.forEach(s => {
        const schoolObj = schs.find(sc => sc.id === s.schoolId);
        const classObj = cls.find(c => c.id === s.classId);
        const teacherObj = tchs.find(t => t.id === s.teacherId);
        console.log({
          scheduleId: s.id,
          schoolId: s.schoolId,
          schoolName: schoolObj?.name,
          classId: s.classId,
          className: classObj?.name,
          teacherName: teacherObj?.name
        });
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
