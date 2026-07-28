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

async function run() {
  const allSchools = await db.select().from(schools);
  const allAttendance = await db.select().from(attendance);
  const monthLogs = allAttendance.filter(a => a.date && a.date.startsWith('2026-07'));

  const result = monthLogs.map(a => {
    const sch = allSchools.find(s => s.id === a.schoolId);
    return {
      attId: a.id,
      date: a.date,
      teacherId: a.teacherId,
      teacherName: a.teacherName,
      schoolId: a.schoolId,
      schoolName: sch ? sch.name : 'NOT_FOUND',
      classId: a.classId,
      className: a.className,
      periods: a.periods,
      confirmedByAdmin: a.confirmedByAdmin,
      isVerified: a.isVerified
    };
  }).filter(item => (item.confirmedByAdmin || item.isVerified) && item.schoolName.toLowerCase().includes('chồi'));

  console.log('=== APPROVED ATTENDANCE LOGS FOR SCHOOL CHỒI IN 2026-07 ===');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/check_choi_att.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config check_choi_att.ts && rm /app/check_choi_att.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
