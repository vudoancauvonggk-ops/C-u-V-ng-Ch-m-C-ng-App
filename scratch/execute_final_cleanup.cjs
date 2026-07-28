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
    console.log('=== EXECUTING COMPREHENSIVE DATABASE CLEANUP ===');
    const now = new Date().toISOString();

    // Helper to soft-delete a school
    const deleteSchool = async (id: string) => {
      console.log('Soft-deleting school:', id);
      await tx.update(schools).set({ isDeleted: true, deletedAt: now }).where(eq(schools.id, id));
    };

    // Helper to soft-delete a class
    const deleteClass = async (id: string) => {
      console.log('Soft-deleting class:', id);
      await tx.update(classes).set({ isDeleted: true, deletedAt: now }).where(eq(classes.id, id));
    };

    // 1. Dino (SCH_DYN_YBRTYLWF) -> Happy Land (SCH_DYN_7D7F4D38), class Ghép - Dino (cls-1784435524775)
    console.log('Processing Dino school...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_7D7F4D38', classId: 'cls-1784435524775' })
      .where(eq(attendance.schoolId, 'SCH_DYN_YBRTYLWF'));
    await deleteSchool('SCH_DYN_YBRTYLWF');
    await deleteClass('cls-1783872034243');

    // 2. Rainy (SCH_DYN_COWBWZFU) -> Sao Việt Q9 (SCH_1784440146071), class Nhà trẻ- Rainy (CLS_1784440169218_506)
    console.log('Processing Rainy school...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_1784440146071', classId: 'CLS_1784440169218_506' })
      .where(eq(attendance.schoolId, 'SCH_DYN_COWBWZFU'));
    await deleteSchool('SCH_DYN_COWBWZFU');
    await deleteClass('cls-1783872089449');

    // 3. Dino+Lion (SCH_DYN_91YJ2BRL) -> Little Sài Gòn (sch-1784104292065), class Dino+Lion (cls-1784387197317)
    console.log('Processing Dino+Lion school...');
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784104292065', classId: 'cls-1784387197317' })
      .where(eq(attendance.schoolId, 'SCH_DYN_91YJ2BRL'));
    await deleteSchool('SCH_DYN_91YJ2BRL');
    await deleteClass('cls-1784104223078');

    // 4. ML (SCH_DYN_PQV83S7G) -> MẦM NON MAI LINH (sch-1784440561726)
    console.log('Processing ML school...');
    // Relink LÁ and MẦM attendance logs
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784440561726' })
      .where(eq(attendance.schoolId, 'SCH_DYN_PQV83S7G'));
    await deleteSchool('SCH_DYN_PQV83S7G');

    // 5. HM (SCH_DYN_8ZCTOZMI) -> Họa Mi (SCH_DYN_027EF3CC)
    console.log('Processing HM school...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_027EF3CC' })
      .where(eq(attendance.schoolId, 'SCH_DYN_8ZCTOZMI'));
    await deleteSchool('SCH_DYN_8ZCTOZMI');
    await deleteClass('cls-1783613656883');

    // 6. Hoa Hồng Nhỏ (sch_1784177349692) & HHN (SCH_DYN_GZ6TXXN6) -> MẦM NON HOA HỒNG NHỎ (sch-1784440450584)
    console.log('Processing Hoa Hồng Nhỏ and HHN schools...');
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784440450584' })
      .where(eq(attendance.schoolId, 'sch_1784177349692'));
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784440450584' })
      .where(eq(attendance.schoolId, 'SCH_DYN_GZ6TXXN6'));
    await deleteSchool('sch_1784177349692');
    await deleteSchool('SCH_DYN_GZ6TXXN6');
    await deleteClass('cls-1783613261784');
    await deleteClass('cls-1783863658269');
    await deleteClass('cls-1783613224166');

    // 7. Họa Mi Quốc Lộ 13 (sch-1784440373475) -> Họa Mi QL 13 (sch-1783602028461)
    console.log('Merging Họa Mi Quốc Lộ 13 into Họa Mi QL 13...');
    await tx.update(schedules).set({ schoolId: 'sch-1783602028461' }).where(eq(schedules.schoolId, 'sch-1784440373475'));
    await tx.update(attendance).set({ schoolId: 'sch-1783602028461' }).where(eq(attendance.schoolId, 'sch-1784440373475'));
    await tx.update(classes).set({ schoolId: 'sch-1783602028461' }).where(eq(classes.schoolId, 'sch-1784440373475'));
    await deleteSchool('sch-1784440373475');

    // 8. Moon (SCH_DYN_JQB57AR0) -> Sao Việt Q9 (SCH_1784440146071), class Ghép- Moon (CLS_1784440146071_973)
    console.log('Processing Moon school...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_1784440146071', classId: 'CLS_1784440146071_973' })
      .where(eq(attendance.schoolId, 'SCH_DYN_JQB57AR0'));
    await deleteSchool('SCH_DYN_JQB57AR0');
    await deleteClass('cls-1783872290484');

    // 9. Hippo (SCH_DYN_W7II1LJZ) -> Little Sài Gòn (sch-1784104292065), class Hippo (cls-1784387222435)
    console.log('Processing Hippo school...');
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784104292065', classId: 'cls-1784387222435' })
      .where(eq(attendance.schoolId, 'SCH_DYN_W7II1LJZ'));
    await deleteSchool('SCH_DYN_W7II1LJZ');
    await deleteClass('cls-1784104319857');

    // 10. TTN (SCH_DYN_MGR3MI75) -> MẦM NON THIÊN THẦN NHỎ (sch-1784440486418)
    console.log('Processing TTN school...');
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784440486418' })
      .where(eq(attendance.schoolId, 'SCH_DYN_MGR3MI75'));
    await deleteSchool('SCH_DYN_MGR3MI75');
    await deleteClass('cls-1783613383952');
    await deleteClass('cls-1783613318623');
    await deleteClass('cls-1783613348617');
    await deleteClass('cls-1783613790315');

    // 11. Monkey (SCH_DYN_09QYNESQ) -> Happy Land (SCH_DYN_7D7F4D38), class NT- Monkey (cls-1784435399691)
    console.log('Processing Monkey school...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_7D7F4D38', classId: 'cls-1784435399691' })
      .where(eq(attendance.schoolId, 'SCH_DYN_09QYNESQ'));
    await deleteSchool('SCH_DYN_09QYNESQ');
    await deleteClass('cls-1783871976252');

    // 12. Merge MẦM NON THIÊN THẦN NHỎ with trailing space (sch-1784440685298) into sch-1784440486418
    console.log('Merging MẦM NON THIÊN THẦN NHỎ with trailing space...');
    await tx.update(schedules).set({ schoolId: 'sch-1784440486418' }).where(eq(schedules.schoolId, 'sch-1784440685298'));
    await tx.update(attendance).set({ schoolId: 'sch-1784440486418' }).where(eq(attendance.schoolId, 'sch-1784440685298'));
    await tx.update(classes).set({ schoolId: 'sch-1784440486418' }).where(eq(classes.schoolId, 'sch-1784440685298'));
    await deleteSchool('sch-1784440685298');

    // 13. Other empty active schools without any attendance
    await deleteSchool('SCH_DYN_LK9W3N4L'); // V Bud
    await deleteSchool('SCH_DYN_DKQLX7FB'); // Nhỏ

    console.log('=== DATABASE CLEANUP COMPLETED ===');
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
  conn.exec(`cat << 'EOF' > /app/execute_final_cleanup.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config execute_final_cleanup.ts && rm /app/execute_final_cleanup.ts', (err2, execStream) => {
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
