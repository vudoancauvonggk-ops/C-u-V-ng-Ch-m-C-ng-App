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
    console.log('=== RUNNING TRANSACTION FOR I BLOOM / I BUD FIX ===');

    // 1. Re-link attendance logs
    // ATT_1784168023014_2 -> Iris DXH I Bloom (sch-1784387167846), class I Bloom (cls-1784387167855)
    console.log('Re-linking 2026-07-16 attendance...');
    await tx.update(attendance)
      .set({ schoolId: 'sch-1784387167846', classId: 'cls-1784387167855' })
      .where(eq(attendance.id, 'ATT_1784168023014_2'));

    // ATT_1784255329678_0 -> Iris Gia Hoà (SCH_DYN_E57C90A5), class I Bloom (cls-1784387259171)
    console.log('Re-linking 2026-07-17 attendance (1)...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_E57C90A5', classId: 'cls-1784387259171' })
      .where(eq(attendance.id, 'ATT_1784255329678_0'));

    // ATT_1784257655771_0 -> Iris Gia Hoà (SCH_DYN_E57C90A5), class I Bud (cls-1784387286463)
    console.log('Re-linking 2026-07-17 attendance (2)...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_E57C90A5', classId: 'cls-1784387286463' })
      .where(eq(attendance.id, 'ATT_1784257655771_0'));

    // 2. Merge duplicate school Iris Gia Hoà (sch-1784387286455) into Iris Gia Hoà (SCH_DYN_E57C90A5)
    console.log('Moving schedules from duplicate Iris Gia Hoà...');
    await tx.update(schedules)
      .set({ schoolId: 'SCH_DYN_E57C90A5' })
      .where(eq(schedules.schoolId, 'sch-1784387286455'));

    console.log('Moving attendance from duplicate Iris Gia Hoà...');
    await tx.update(attendance)
      .set({ schoolId: 'SCH_DYN_E57C90A5' })
      .where(eq(attendance.schoolId, 'sch-1784387286455'));

    console.log('Moving classes from duplicate Iris Gia Hoà...');
    await tx.update(classes)
      .set({ schoolId: 'SCH_DYN_E57C90A5' })
      .where(eq(classes.schoolId, 'sch-1784387286455'));

    console.log('Soft-deleting duplicate school Iris Gia Hoà...');
    await tx.update(schools)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(eq(schools.id, 'sch-1784387286455'));

    // 3. Soft delete empty virtual schools: I Bloom (SCH_DYN_XGFECJ18) and I Bud (SCH_DYN_NX2X0AFD)
    console.log('Soft-deleting empty virtual schools...');
    await tx.update(schools)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(eq(schools.id, 'SCH_DYN_XGFECJ18'));
    await tx.update(schools)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(eq(schools.id, 'SCH_DYN_NX2X0AFD'));

    // 4. Soft delete empty classes
    console.log('Soft-deleting empty classes...');
    await tx.update(classes)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(eq(classes.id, 'cls-1784104378732'));
    await tx.update(classes)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(eq(classes.id, 'cls-1784104410252'));
    await tx.update(classes)
      .set({ isDeleted: true, deletedAt: new Date().toISOString() })
      .where(eq(classes.id, 'cls-1784104132899'));

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
  conn.exec(`cat << 'EOF' > /app/fix_i_bloom_bud.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config fix_i_bloom_bud.ts && rm fix_i_bloom_bud.ts', (err2, execStream) => {
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
