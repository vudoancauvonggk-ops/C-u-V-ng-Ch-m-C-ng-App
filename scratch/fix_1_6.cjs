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
import { eq } from 'drizzle-orm';

async function run() {
  const sourceClassId = 'CLS_1784313741139_643'; // Ghép (incorrectly under 1/6)
  const targetClassId = 'CLS_1784313731210_789'; // Ghép (correctly under 1 Tháng 6)
  const destSchoolId = 'SCH_DYN_GBLQM8UW'; // 1 Tháng 6

  console.log('=== FIXING 1/6 AND 1 THÁNG 6 CLASS MERGE ===');

  await db.transaction(async (tx) => {
    // Re-link schedules
    console.log('Moving schedules...');
    await tx.update(schedules).set({ classId: targetClassId, schoolId: destSchoolId }).where(eq(schedules.classId, sourceClassId));

    // Re-link attendance
    console.log('Moving attendance...');
    await tx.update(attendance).set({ classId: targetClassId, schoolId: destSchoolId }).where(eq(attendance.classId, sourceClassId));

    // Re-link cancellations
    console.log('Moving cancellations...');
    await tx.update(schoolCancellations).set({ classId: targetClassId, schoolId: destSchoolId }).where(eq(schoolCancellations.classId, sourceClassId));

    // Soft delete source class
    console.log('Soft-deleting source class...');
    await tx.update(classes).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(classes.id, sourceClassId));

    console.log('=== MERGE COMPLETED ===');
  });
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cat << 'EOF' > /app/fix_1_6.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config fix_1_6.ts && rm fix_1_6.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect(config);
