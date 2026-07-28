module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const cmd = `cd /app && npx tsx -r dotenv/config -e "
import { db } from './src/db/index.ts';
import { schools, classes, schedules, attendance } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const schs = await db.select().from(schools);
  console.log('=== ALL SCHOOLS ===');
  schs.forEach(s => {
    if (s.name.includes('Chồi') || s.name.includes('chồi') || s.name.trim() === 'Chồi') {
      console.log('ID:', s.id, '| Name:', JSON.stringify(s.name), '| isDeleted:', s.isDeleted);
    }
  });

  const atts = await db.select().from(attendance);
  const mAtts = atts.filter(a => a.date && a.date.startsWith('2026-07') && (a.confirmedByAdmin || a.isVerified));
  
  mAtts.forEach(a => {
    const s = schs.find(x => x.id === a.schoolId);
    if (s && (s.name.includes('Chồi') || s.name.includes('chồi'))) {
      console.log('Att MATCH:', a.id, '| Teacher:', a.teacherId, '| TeacherName:', a.teacherName, '| School:', s.name, 'Date:', a.date);
    }
  });

  const schds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
  schds.forEach(sc => {
    const s = schs.find(x => x.id === sc.schoolId);
    if (s && (s.name.includes('Chồi') || s.name.includes('chồi'))) {
      console.log('Schedule MATCH:', sc.id, '| Teacher:', sc.teacherId, '| School:', s.name);
    }
  });

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log('OUT:', data.toString()));
    stream.stderr.on('data', data => console.error('ERR:', data.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
