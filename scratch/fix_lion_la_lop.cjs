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
  await db.transaction(async (tx) => {
    console.log('=== RUNNING TRANSACTION FOR LION / LÁ / LỚP FIX ===');

    // 1. Re-link Lion attendance logs to Happy Land (SCH_DYN_7D7F4D38), class NT- Lion (cls-1784435412481)
    console.log('Re-linking Lion attendance logs...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_7D7F4D38', classId: 'cls-1784435412481' })
      .where(eq(attendance.id, 'ATT_1784184115842_1'));

    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_7D7F4D38', classId: 'cls-1784435412481' })
      .where(eq(attendance.id, 'ATT_1784012275640_2'));

    // 2. Re-link Lá attendance log to Sao Việt Sunview (sch-1784104493761), class Lá (cls-1784387327828)
    console.log('Re-linking Lá attendance log...');
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784104493761', classId: 'cls-1784387327828' })
      .where(eq(attendance.id, 'ATT_1784275179167_0'));

    // 3. Soft-delete virtual schools
    console.log('Soft-deleting virtual schools...');
    const now = new Date().toISOString();
    await tx.update(schools).set({ isDeleted: true, deletedAt: now }).where(eq(schools.id, 'SCH_DYN_TL6CXMUA')); // Lion
    await tx.update(schools).set({ isDeleted: true, deletedAt: now }).where(eq(schools.id, 'SCH_DYN_TR72EP74')); // Lá
    await tx.update(schools).set({ isDeleted: true, deletedAt: now }).where(eq(schools.id, 'SCH_DYN_MDKYB272')); // Lớp

    // 4. Soft-delete empty classes
    console.log('Soft-deleting empty classes...');
    await tx.update(classes).set({ isDeleted: true, deletedAt: now }).where(eq(classes.id, 'cls-1783872267545'));
    await tx.update(classes).set({ isDeleted: true, deletedAt: now }).where(eq(classes.id, 'cls-1784104463150'));

    console.log('=== FIX COMPLETED SUCCESSFULLY ===');
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
  conn.exec(`cat << 'EOF' > /app/fix_lion_la_lop.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config fix_lion_la_lop.ts && rm fix_lion_la_lop.ts', (err2, execStream) => {
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
