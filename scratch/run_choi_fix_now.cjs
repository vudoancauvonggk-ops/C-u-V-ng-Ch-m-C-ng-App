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
  const WRONG_ID = 'SCH_DYN_AD6CQUQY';
  const CORRECT_ID = 'sch-1784104493761'; // Sao Việt Sunview

  await db.update(attendance).set({ schoolId: CORRECT_ID }).where(eq(attendance.schoolId, WRONG_ID));
  await db.update(classes).set({ schoolId: CORRECT_ID }).where(eq(classes.schoolId, WRONG_ID));
  await db.update(schedules).set({ schoolId: CORRECT_ID }).where(eq(schedules.schoolId, WRONG_ID));
  await db.update(schools).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(schools.id, WRONG_ID));

  const checkAtt = await db.select().from(attendance).where(eq(attendance.id, 'ATT_1784275179167_1'));
  console.log('UPDATED_SUCCESSFULLY, NEW SCHOOL ID:', checkAtt[0]?.schoolId);

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
