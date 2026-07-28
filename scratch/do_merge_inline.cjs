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
  const TARGET_SCHOOL_ID = 'SCH_1783619188931';
  const vicSchools = await db.select().from(schools).where(ilike(schools.name, '%Victoria%'));
  const sourceSchoolIds = vicSchools.map(s => s.id).filter(id => id !== TARGET_SCHOOL_ID);

  console.log('Source IDs:', sourceSchoolIds);

  if (sourceSchoolIds.length > 0) {
    await db.update(attendance).set({ schoolId: TARGET_SCHOOL_ID }).where(inArray(attendance.schoolId, sourceSchoolIds));
    await db.update(classes).set({ schoolId: TARGET_SCHOOL_ID }).where(inArray(classes.schoolId, sourceSchoolIds));
    await db.update(schedules).set({ schoolId: TARGET_SCHOOL_ID }).where(inArray(schedules.schoolId, sourceSchoolIds));
    await db.update(schools).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(inArray(schools.id, sourceSchoolIds));
  }

  await db.update(schools).set({ name: 'Victoria', isDeleted: false, deletedAt: null }).where(eq(schools.id, TARGET_SCHOOL_ID));
  console.log('MERGE_COMPLETED_SUCCESSFULLY');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log(data.toString()));
    stream.stderr.on('data', data => console.error(data.toString()));
    stream.on('close', () => {
      console.log('Closed connection');
      conn.end();
    });
  });
}).connect(config);
