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
    import { schools, classes, attendance, schedules, teachers } from './src/db/schema.ts';
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const schs = await db.select().from(schools);
      const cls = await db.select().from(classes);
      const atts = await db.select().from(attendance);
      const skds = await db.select().from(schedules);
      const tchs = await db.select().from(teachers);

      const targetSchools = schs.filter(s => s.name.includes('I Bloom') || s.name.includes('I Bud'));
      console.log('=== Target Schools ===');
      targetSchools.forEach(s => console.log(s.id, ':', s.name, 'isDeleted:', s.isDeleted));

      const targetSchoolIds = targetSchools.map(s => s.id);

      console.log('=== Attendance Records under I Bloom / I Bud ===');
      const filteredAtts = atts.filter(a => targetSchoolIds.includes(a.schoolId));
      filteredAtts.forEach(a => {
        const sch = schs.find(s => s.id === a.schoolId);
        const cl = cls.find(c => c.id === a.classId);
        const t = tchs.find(tc => tc.id === a.teacherId);
        console.log('AttId:', a.id, '| School:', sch?.name, '(', a.schoolId, ')', '| Class:', cl ? cl.name : 'Unknown', '| Teacher:', t ? t.name : 'Unknown', '| Date:', a.date, '| Periods:', a.periods);
      });

      console.log('=== Active Schedules under I Bloom / I Bud ===');
      const filteredSkds = skds.filter(s => targetSchoolIds.includes(s.schoolId) && !s.isDeleted);
      filteredSkds.forEach(s => {
        const sch = schs.find(sc => sc.id === s.schoolId);
        const cl = cls.find(c => c.id === s.classId);
        const t = tchs.find(tc => tc.id === s.teacherId);
        console.log('SchedId:', s.id, '| School:', sch?.name, '| Class:', cl ? cl.name : 'Unknown', '| Teacher:', t ? t.name : 'Unknown');
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
