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
import { schools, classes, schedules, attendance } from './src/db/schema.ts';
import { eq, inArray } from 'drizzle-orm';

async function run() {
  await db.transaction(async (tx) => {
    console.log('=== RESTORING THIÊN THẦN NHỎ CLASSES ===');

    const classIds = [
      'cls-1783613383952', // MẦM
      'cls-1783613318623', // LÁ
      'cls-1783613348617', // NT2
      'cls-1783613790315'  // CHỒI
    ];

    // 1. Restore classes and link to main school sch-1784440486418 (MẦM NON THIÊN THẦN NHỎ)
    await tx.update(classes)
      .set({ isDeleted: false, deletedAt: null, schoolId: 'sch-1784440486418' })
      .where(inArray(classes.id, classIds));

    // 2. Re-link schedules to main school sch-1784440486418
    await tx.update(schedules)
      .set({ schoolId: 'sch-1784440486418' })
      .where(inArray(schedules.classId, classIds));

    // 3. Re-link attendance to main school sch-1784440486418
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784440486418' })
      .where(inArray(attendance.classId, classIds));

    console.log('=== CLASSES RESTORED SUCCESSFULLY ===');
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
  conn.exec(`cat << 'EOF' > /app/fix_thienthannho.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config fix_thienthannho.ts && rm /app/fix_thienthannho.ts', (err2, execStream) => {
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
