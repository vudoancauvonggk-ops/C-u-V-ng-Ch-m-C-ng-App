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
import { ilike, inArray, eq } from 'drizzle-orm';

async function run() {
  const choiSchools = await db.select().from(schools).where(ilike(schools.name, '%Chồi%'));
  console.log('=== SCHOOLS WITH NAME LIKE CHỒI ===');
  console.log(JSON.stringify(choiSchools, null, 2));

  // Find attendance logs for month 2026-07
  const allAtt = await db.select().from(attendance);
  const monthLogs = allAtt.filter(a => a.date && a.date.startsWith('2026-07'));

  // Get school details for all active or logged schools in 2026-07
  const allSchools = await db.select().from(schools);
  
  const choiLog = monthLogs.find(a => {
    const sch = allSchools.find(s => s.id === a.schoolId);
    return sch && sch.name.trim() === 'Chồi';
  }) || monthLogs.filter(a => {
    const sch = allSchools.find(s => s.id === a.schoolId);
    return sch && sch.name.includes('Chồi');
  });

  console.log('=== MONTH LOGS MATCHING SCHOOL CHỒI ===');
  console.log(JSON.stringify(choiLog, null, 2));

  // Also check all schedules
  const allSchedules = await db.select().from(schedules);
  const choiSchedules = allSchedules.filter(s => {
    const sch = allSchools.find(sc => sc.id === s.schoolId);
    return sch && sch.name.includes('Chồi');
  });
  console.log('=== SCHEDULES FOR SCHOOL CHỒI ===');
  console.log(JSON.stringify(choiSchedules, null, 2));

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log(data.toString()));
    stream.stderr.on('data', data => console.error(data.toString()));
    stream.on('close', () => {
      conn.end();
    });
  });
}).connect(config);
