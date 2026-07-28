module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const migrationCode = `
import { db } from './src/db/index.ts';
import { schools, classes, schedules, attendance, schoolCancellations } from './src/db/schema.ts';
import { ilike, inArray, eq } from 'drizzle-orm';

async function run() {
  const TARGET_SCHOOL_ID = 'SCH_1783619188931'; // Victoria

  const vicSchools = await db.select().from(schools).where(ilike(schools.name, '%Victoria%'));
  const sourceSchoolIds = vicSchools.map(s => s.id).filter(id => id !== TARGET_SCHOOL_ID);

  console.log("Found source school IDs to merge:", sourceSchoolIds);

  if (sourceSchoolIds.length > 0) {
    // 1. Update attendance logs
    const resAtt = await db.update(attendance)
      .set({ schoolId: TARGET_SCHOOL_ID })
      .where(inArray(attendance.schoolId, sourceSchoolIds));
    console.log('Attendance logs updated to TARGET_SCHOOL_ID');

    // 2. Update classes
    const resCls = await db.update(classes)
      .set({ schoolId: TARGET_SCHOOL_ID })
      .where(inArray(classes.schoolId, sourceSchoolIds));
    console.log('Classes updated to TARGET_SCHOOL_ID');

    // 3. Update schedules
    const resSch = await db.update(schedules)
      .set({ schoolId: TARGET_SCHOOL_ID })
      .where(inArray(schedules.schoolId, sourceSchoolIds));
    console.log('Schedules updated to TARGET_SCHOOL_ID');

    // 4. Mark source schools as deleted
    await db.update(schools)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(inArray(schools.id, sourceSchoolIds));
    console.log('Source schools marked as deleted');
  }

  // Ensure target school "Victoria" is active
  await db.update(schools)
    .set({ name: 'Victoria', isDeleted: false, deletedAt: null })
    .where(eq(schools.id, TARGET_SCHOOL_ID));

  console.log('SUCCESS_MERGE_COMPLETED');
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cat << 'EOF' > /app/run_merge_vic2.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config run_merge_vic2.ts && rm /app/run_merge_vic2.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', (data) => {
          console.log('STDOUT:', data.toString());
        });
        execStream.stderr.on('data', (data) => {
          console.error('STDERR:', data.toString());
        });
        execStream.on('close', () => {
          console.log('Finished execution');
          conn.end();
        });
      });
    });
  });
}).connect(config);
