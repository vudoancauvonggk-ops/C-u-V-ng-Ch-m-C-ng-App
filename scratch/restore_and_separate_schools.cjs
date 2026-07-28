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
    console.log('=== RESTORING AND SEPARATING SCHOOLS ===');

    const restoreSchool = async (id: string) => {
      console.log('Restoring school:', id);
      await tx.update(schools).set({ isDeleted: false, deletedAt: null }).where(eq(schools.id, id));
    };

    // Restore schools
    await restoreSchool('SCH_DYN_GBLQM8UW'); // 1 Tháng 6
    await restoreSchool('SCH_1784313649490'); // Ánh Cầu Vồng 2
    await restoreSchool('SCH_DYN_E57C90A5'); // Iris Gia Hoà
    await restoreSchool('sch-1784431996627'); // Mầm Non Hoa
    await restoreSchool('sch-1784356710289'); // Mầm non Hoa Dĩ An

    // Clean names
    await tx.update(schools).set({ name: 'Mầm Non Hoa' }).where(eq(schools.id, 'sch-1784431996627'));
    await tx.update(schools).set({ name: 'Mầm non Hoa Dĩ An' }).where(eq(schools.id, 'sch-1784356710289'));

    // Move schedules and attendance back to Mầm Non Hoa (sch-1784431996627)
    console.log('Moving schedules back to Mầm Non Hoa...');
    const mnhSkds = ['sch-1784431976262', 'sch-1784432057444'];
    await tx.update(schedules).set({ schoolId: 'sch-1784431996627' }).where(inArray(schedules.id, mnhSkds));
    await tx.update(attendance).set({ schoolId: 'sch-1784431996627' }).where(inArray(attendance.scheduleId, mnhSkds)); // wait, matching by scheduleId or schoolId is fine

    // Move classes back to Mầm Non Hoa
    const mnhClasses = ['cls-1783873380708', 'cls-1784432057444'];
    await tx.update(classes).set({ schoolId: 'sch-1784431996627' }).where(inArray(classes.id, mnhClasses));

    // Move schedules and attendance back to Mầm non Hoa Dĩ An (sch-1784356710289)
    console.log('Moving schedules back to Mầm non Hoa Dĩ An...');
    const hdaSkds = ['SKD_14fc662f-bc8e-4bc8-85e0-e3bde0332228', 'SKD_22bed532-d6c8-4f4d-b55d-e0fdb38d4857', 'SKD_7d2c79b8-7b54-4e17-baea-10b8ede1a6d1'];
    await tx.update(schedules).set({ schoolId: 'sch-1784356710289' }).where(inArray(schedules.id, hdaSkds));
    await tx.update(attendance).set({ schoolId: 'sch-1784356710289' }).where(inArray(attendance.scheduleId, hdaSkds));

    // Move classes back to Mầm non Hoa Dĩ An
    const hdaClasses = ['SKD_14fc662f-bc8e-4bc8-85e0-e3bde0332228', 'SKD_22bed532-d6c8-4f4d-b55d-e0fdb38d4857', 'SKD_7d2c79b8-7b54-4e17-baea-10b8ede1a6d1'];
    await tx.update(classes).set({ schoolId: 'sch-1784356710289' }).where(inArray(classes.id, hdaClasses));

    console.log('=== SEPARATION COMPLETED ===');
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
  conn.exec(`cat << 'EOF' > /app/restore_and_separate_schools.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config restore_and_separate_schools.ts && rm /app/restore_and_separate_schools.ts', (err2, execStream) => {
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
