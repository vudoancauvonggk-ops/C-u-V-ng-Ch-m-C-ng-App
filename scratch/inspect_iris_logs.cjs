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
    import { schools, classes, attendance, schedules } from './src/db/schema.ts';
    async function run() {
      const schs = await db.select().from(schools);
      const cls = await db.select().from(classes);
      const att = await db.select().from(attendance);
      const sched = await db.select().from(schedules);

      const irisSchs = schs.filter(s => (s.name || '').toLowerCase().includes('iris'));
      console.log('=== ALL IRIS SCHOOLS IN DB ===');
      irisSchs.forEach(s => console.log(s.id, ':', s.name, 'isDeleted:', (s as any).isDeleted));

      const irisSchIds = new Set(irisSchs.map(s => s.id));
      const irisCls = cls.filter(c => irisSchIds.has(c.schoolId) || (c.name || '').toLowerCase().includes('iris'));
      console.log('\n=== ALL IRIS CLASSES IN DB ===');
      irisCls.forEach(c => console.log(c.id, ':', c.name, '| schoolId:', c.schoolId));

      const irisClsIds = new Set(irisCls.map(c => c.id));

      const julyLogs = att.filter(a => a.date && a.date.startsWith('2026-07') && (a.confirmedByAdmin || a.isVerified) && !(a as any).isDeleted);

      const irisLogs = julyLogs.filter(a => {
        if (a.schoolId && irisSchIds.has(a.schoolId)) return true;
        if (a.classId && irisClsIds.has(a.classId)) return true;
        const targetClass = cls.find(c => c.id === a.classId);
        if (targetClass && irisSchIds.has(targetClass.schoolId)) return true;
        return false;
      });

      console.log('\n=== IRIS APPROVED LOGS IN JULY 2026 ===');
      console.log('Total Iris logs:', irisLogs.length);
      irisLogs.forEach(l => {
        const s = schs.find(sc => sc.id === l.schoolId);
        const c = cls.find(cl => cl.id === l.classId);
        console.log('Log date:', l.date, '| periods:', l.periods, '| schoolId:', l.schoolId, '(', s?.name, ') | classId:', l.classId, '(', c?.name, ')');
      });

      console.log('\n=== IRIS SCHEDULES ===');
      const irisScheds = sched.filter(s => irisSchIds.has(s.schoolId) || irisClsIds.has(s.classId));
      irisScheds.forEach(sc => {
        const s = schs.find(sch => sch.id === sc.schoolId);
        const c = cls.find(cl => cl.id === sc.classId);
        console.log('Schedule day:', sc.dayOfWeek, '| periods:', sc.periods, '| school:', s?.name, '| class:', c?.name);
      });
    }
    run().then(() => process.exit(0)).catch(console.error);
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', d => console.log(d.toString()));
  });
}).connect(config);
