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
import { eq, inArray } from 'drizzle-orm';

async function run() {
  const WRONG_SCHOOL_ID = 'SCH_DYN_AD6CQUQY'; // School erroneously named "Chồi"
  const CORRECT_SCHOOL_ID = 'sch-1784104493761'; // Sao Việt Sunview

  console.log('=== REASSIGNING CHỒI (SCH_DYN_AD6CQUQY) DATA TO SAO VIỆT SUNVIEW (sch-1784104493761) ===');

  // 1. Update attendance logs
  const attRes = await db.update(attendance)
    .set({ schoolId: CORRECT_SCHOOL_ID })
    .where(eq(attendance.schoolId, WRONG_SCHOOL_ID));
  console.log('Updated attendance logs from WRONG_SCHOOL_ID to CORRECT_SCHOOL_ID');

  // 2. Update classes
  const clsRes = await db.update(classes)
    .set({ schoolId: CORRECT_SCHOOL_ID })
    .where(eq(classes.schoolId, WRONG_SCHOOL_ID));
  console.log('Updated classes from WRONG_SCHOOL_ID to CORRECT_SCHOOL_ID');

  // 3. Update schedules if any
  const schRes = await db.update(schedules)
    .set({ schoolId: CORRECT_SCHOOL_ID })
    .where(eq(schedules.schoolId, WRONG_SCHOOL_ID));
  console.log('Updated schedules from WRONG_SCHOOL_ID to CORRECT_SCHOOL_ID');

  // 4. Ensure WRONG_SCHOOL_ID is soft deleted
  await db.update(schools)
    .set({ isDeleted: true, deletedAt: new Date().toISOString() })
    .where(eq(schools.id, WRONG_SCHOOL_ID));
  console.log('Marked WRONG_SCHOOL_ID as deleted');

  console.log('=== FIX COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/fix_choi.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config fix_choi.ts && rm /app/fix_choi.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
