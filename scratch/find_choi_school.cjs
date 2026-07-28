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
  const allSchedules = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
  const allAttendance = await db.select().from(attendance);

  const monthLogs = allAttendance.filter(a => a.date && a.date.startsWith('2026-07'));

  console.log('=== SEARCHING FOR SCHOOLS NAMED EXACTLY OR CONTAINING CHỒI ===');
  const choiSchools = allSchools.filter(s => s.name.toLowerCase().includes('chồi'));
  choiSchools.forEach(s => console.log('School:', s.id, '| Name:', JSON.stringify(s.name), '| isDeleted:', s.isDeleted));

  console.log('=== SCHEDULES LINKED TO CHỒI SCHOOLS OR MS YEN ===');
  allSchedules.forEach(s => {
    const sch = allSchools.find(x => x.id === s.schoolId);
    if (s.teacherId === 'GV_MSYEN' || (sch && sch.name.toLowerCase().includes('chồi'))) {
      console.log('Schedule ID:', s.id, '| Teacher:', s.teacherId, '| SchoolID:', s.schoolId, '| SchoolName:', sch ? sch.name : 'UNKNOWN', '| ClassID:', s.classId);
    }
  });

  console.log('=== 2026-07 ATTENDANCE LOGS LINKED TO CHỒI SCHOOLS OR MS YEN ===');
  monthLogs.forEach(a => {
    const sch = allSchools.find(x => x.id === a.schoolId);
    if (a.teacherId === 'GV_MSYEN' || (sch && sch.name.toLowerCase().includes('chồi'))) {
      console.log('Att ID:', a.id, '| Date:', a.date, '| Teacher:', a.teacherId, '| SchoolID:', a.schoolId, '| SchoolName:', sch ? sch.name : 'UNKNOWN', '| ClassID:', a.classId);
    }
  });

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/find_choi.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config find_choi.ts && rm /app/find_choi.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
