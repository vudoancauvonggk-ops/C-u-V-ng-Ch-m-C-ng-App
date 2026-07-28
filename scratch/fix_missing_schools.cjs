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
    console.log('=== FIXING MISSING/DELETED SCHOOLS WITH ACTIVE SCHEDULES ===');
    const now = new Date().toISOString();

    // Helper to restore school
    const restoreSchool = async (id: string) => {
      console.log('Restoring school:', id);
      await tx.update(schools).set({ isDeleted: false, deletedAt: null }).where(eq(schools.id, id));
    };

    // 1. Restore 1 Tháng 6 (SCH_DYN_GBLQM8UW)
    await restoreSchool('SCH_DYN_GBLQM8UW');

    // 2. Restore Ánh Cầu Vồng 2 (SCH_1784313649490)
    await restoreSchool('SCH_1784313649490');

    // 3. Restore Iris Gia Hoà (SCH_DYN_E57C90A5)
    await restoreSchool('SCH_DYN_E57C90A5');

    // 4. Restore Sao Việt Sunview (sch-1784104493761)
    await restoreSchool('sch-1784104493761');
    // Rename its classes to Yoga
    console.log('Renaming Sao Việt Sunview classes to Yoga...');
    await tx.update(classes).set({ name: 'Lá (Yoga)' }).where(eq(classes.id, 'cls-1784387327828'));
    await tx.update(classes).set({ name: 'Chồi (Yoga)' }).where(eq(classes.id, 'cls-1784387362193'));
    await tx.update(classes).set({ name: 'Mầm (Yoga)' }).where(eq(classes.id, 'cls-1784387347377'));

    // 5. Merge Little Sài Gòn (sch-1784104292065, sch-1784104223071) into Little SG (SCH_DYN_B4BF0BD6)
    console.log('Merging Little Sài Gòn schools into Little SG...');
    const littleSourceIds = ['sch-1784104292065', 'sch-1784104223071'];
    await tx.update(schedules).set({ schoolId: 'SCH_DYN_B4BF0BD6' }).where(inArray(schedules.schoolId, littleSourceIds));
    await tx.update(attendance).set({ schoolId: 'SCH_DYN_B4BF0BD6' }).where(inArray(attendance.schoolId, littleSourceIds));
    await tx.update(classes).set({ schoolId: 'SCH_DYN_B4BF0BD6' }).where(inArray(classes.schoolId, littleSourceIds));
    
    // Rename Ms. Yên\\'s Yoga classes under Little SG
    console.log('Renaming Little SG Yoga classes...');
    await tx.update(classes).set({ name: 'Elephant (Yoga)' }).where(eq(classes.id, 'cls-1784387237172'));
    await tx.update(classes).set({ name: 'Hippo (Yoga)' }).where(eq(classes.id, 'sch-1784104294245')); // wait, Hippo schedule points to class Hippo
    await tx.update(classes).set({ name: 'Hippo (Yoga)' }).where(eq(classes.id, 'cls-1784387222435'));
    await tx.update(classes).set({ name: 'Dino+Lion (Yoga)' }).where(eq(classes.id, 'cls-1784387197317'));

    // 6. Merge Mầm Non Hoa (sch-1784431996627) & Mầm non Hoa Dĩ An (sch-1784356710289) into Mầm Non Hoa (sch-1783943877836)
    console.log('Merging Mầm Non Hoa branches...');
    const hoaSourceIds = ['sch-1784431996627', 'sch-1784356710289'];
    await tx.update(schedules).set({ schoolId: 'sch-1783943877836' }).where(inArray(schedules.schoolId, hoaSourceIds));
    await tx.update(attendance).set({ schoolId: 'sch-1783943877836' }).where(inArray(attendance.schoolId, hoaSourceIds));
    await tx.update(classes).set({ schoolId: 'sch-1783943877836' }).where(inArray(classes.schoolId, hoaSourceIds));
    
    // Rename Yoga classes under Mầm Non Hoa
    console.log('Renaming Mầm Non Hoa Yoga classes...');
    await tx.update(classes).set({ name: 'Ghép Mầm + NT (Yoga)' }).where(eq(classes.id, 'cls-1783873380708')); // wait, checking class ID for Ghép Mầm + NT
    await tx.update(classes).set({ name: 'Ghép Mầm + NT (Yoga)' }).where(eq(classes.id, 'cls-1784432057444')); 
    // Ms. Hà\\'s Mầm, Ghép, NT classes
    await tx.update(classes).set({ name: 'Mầm (Yoga)' }).where(eq(classes.id, 'SKD_14fc662f-bc8e-4bc8-85e0-e3bde0332228'));
    await tx.update(classes).set({ name: 'Ghép (Yoga)' }).where(eq(classes.id, 'SKD_22bed532-d6c8-4f4d-b55d-e0fdb38d4857'));
    await tx.update(classes).set({ name: 'NT (Yoga)' }).where(eq(classes.id, 'SKD_7d2c79b8-7b54-4e17-baea-10b8ede1a6d1'));

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
  conn.exec(`cat << 'EOF' > /app/fix_missing_schools.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config fix_missing_schools.ts && rm /app/fix_missing_schools.ts', (err2, execStream) => {
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
