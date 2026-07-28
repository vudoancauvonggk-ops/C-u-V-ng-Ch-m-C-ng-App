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
import { classes, schedules, attendance } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  await db.transaction(async (tx) => {
    console.log('=== SPLITTING DUPED CLASSES WITH MULTIPLE TEACHERS ===');

    // 1. Process Tuổi Tiên - Simba
    console.log('Splitting Tuổi Tiên Simba...');
    // Create Simba (Quỳnh Anh) class
    const newSimbaClass = {
      id: 'cls_simba_quynhanh',
      name: 'Simba (Quỳnh Anh)',
      schoolId: 'sch-1783691063604',
      studentCount: 15,
      standardPeriods: 1,
      isDeleted: false,
      deletedAt: null
    };
    await tx.insert(classes).values(newSimbaClass);

    // Rename original class to Simba (Huê)
    await tx.update(classes).set({ name: 'Simba (Huê)' }).where(eq(classes.id, 'cls-1783691063621'));

    // Move Quỳnh Anh's schedules to the new class
    await tx.update(schedules).set({ classId: 'cls_simba_quynhanh' }).where(eq(schedules.id, 'SKD_08ee9180-4ff4-4d2d-81d6-329167bf5df3'));
    await tx.update(schedules).set({ classId: 'cls_simba_quynhanh' }).where(eq(schedules.id, 'SKD_763a472f-99f4-438c-b847-fb0acf850135'));

    // Move Quỳnh Anh's attendance logs to the new class
    await tx.update(attendance).set({ classId: 'cls_simba_quynhanh' }).where(eq(attendance.id, 'ATT_1784012191945_0'));
    await tx.update(attendance).set({ classId: 'cls_simba_quynhanh' }).where(eq(attendance.id, 'ATT_1784185109328_0'));

    // 2. Process Thiện Mỹ - Chồi
    console.log('Splitting Thiện Mỹ Chồi...');
    // Create Chồi (Bình Nhi) class
    const newChoiClass = {
      id: 'cls_choi_binhnhi',
      name: 'Chồi (Bình Nhi)',
      schoolId: 'sch-1784352811017',
      studentCount: 15,
      standardPeriods: 1,
      isDeleted: false,
      deletedAt: null
    };
    await tx.insert(classes).values(newChoiClass);

    // Rename original class to Chồi (Duyên)
    await tx.update(classes).set({ name: 'Chồi (Duyên)' }).where(eq(classes.id, 'cls-1783876894119'));

    // Move Bình Nhi's schedules to the new class
    await tx.update(schedules).set({ classId: 'cls_choi_binhnhi' }).where(eq(schedules.id, 'SKD_6f50750a-9ad1-46e4-ae69-66c55f0f62b7'));
    await tx.update(schedules).set({ classId: 'cls_choi_binhnhi' }).where(eq(schedules.id, 'SKD_abb32ba3-af67-4ad8-9292-140ec5770aef'));

    // Move Bình Nhi's attendance logs to the new class
    await tx.update(attendance).set({ classId: 'cls_choi_binhnhi' }).where(eq(attendance.id, 'ATT_1784101418117_2'));

    console.log('=== SPLIT COMPLETED SUCCESSFULLY ===');
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
  conn.exec(`cat << 'EOF' > /app/split_duplicate_classes.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config split_duplicate_classes.ts && rm /app/split_duplicate_classes.ts', (err2, execStream) => {
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
