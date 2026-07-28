module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const code = `
import { db } from './src/db/index.ts';
import { schools, classes, schedules, attendance } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const allSchools = await db.select().from(schools);
  const allClasses = await db.select().from(classes);
  const allSchedules = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
  const allAttendance = await db.select().from(attendance);

  const monthLogs = allAttendance.filter(a => !a.isDeleted && a.date && a.date.startsWith('2026-07') && (a.confirmedByAdmin || a.isVerified));

  console.log('=== 1. DELETED SCHOOLS WITH APPROVED 2026-07 ATTENDANCE LOGS ===');
  const deletedSchoolsWithAtt = allSchools.filter(s => s.isDeleted && monthLogs.some(a => a.schoolId === s.id));
  if (deletedSchoolsWithAtt.length === 0) {
    console.log('NONE! (All clean)');
  } else {
    for (const s of deletedSchoolsWithAtt) {
      const sAtt = monthLogs.filter(a => a.schoolId === s.id);
      console.log('Deleted School:', s.id, '| Name:', s.name, '| 2026-07 Att Count:', sAtt.length);
      sAtt.forEach(a => console.log('   -> Att ID:', a.id, '| Date:', a.date, '| Teacher:', a.teacherId, '| ClassID:', a.classId));
    }
  }

  console.log('\\n=== 2. SCHOOLS WITH APPROVED 2026-07 ATTENDANCE BUT 0 SCHEDULES ===');
  const schoolIdsWithAtt = Array.from(new Set(monthLogs.map(a => a.schoolId)));
  const noScheduleSchools = [];
  for (const schId of schoolIdsWithAtt) {
    const sch = allSchools.find(s => s.id === schId);
    const hasSchedules = allSchedules.some(sc => sc.schoolId === schId);
    if (!hasSchedules) {
      const atts = monthLogs.filter(a => a.schoolId === schId);
      noScheduleSchools.push({ schId, name: sch?.name, isDeleted: sch?.isDeleted, count: atts.length });
    }
  }
  if (noScheduleSchools.length === 0) {
    console.log('NONE! (All clean)');
  } else {
    console.log(JSON.stringify(noScheduleSchools, null, 2));
  }

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/audit_inline.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config audit_inline.ts && rm /app/audit_inline.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log('OUT:', data.toString()));
        execStream.stderr.on('data', data => console.error('ERR:', data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
