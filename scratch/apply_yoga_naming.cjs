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
    console.log('=== APPLYING YOGA CLASS NAMING RULE ===');

    // 1. Tuổi Tiên School
    console.log('Updating Tuổi Tiên school classes...');
    // Create Simba (Yoga)
    const newSimbaYogaClass = {
      id: 'cls_simba_yoga',
      name: 'Simba (Yoga)',
      schoolId: 'sch-1783691063604',
      studentCount: 15,
      standardPeriods: 1,
      isDeleted: false,
      deletedAt: null
    };
    await tx.insert(classes).values(newSimbaYogaClass);

    // Move Ms. Hà\\'s Simba schedule to Simba (Yoga)
    await tx.update(schedules).set({ classId: 'cls_simba_yoga' }).where(eq(schedules.id, 'SKD_982ac685-ae86-47fe-8f49-a49ce0d81d88'));
    
    // Move Ms. Hà\\'s Simba attendance log to Simba (Yoga)
    await tx.update(attendance).set({ classId: 'cls_simba_yoga' }).where(eq(attendance.id, 'ATT_1783925621916_0'));

    // Rename other Tuổi Tiên Yoga classes
    await tx.update(classes).set({ name: 'VIP7 (Yoga)' }).where(eq(classes.id, 'cls-1783691318986'));
    await tx.update(classes).set({ name: 'Lá (Yoga)' }).where(eq(classes.id, 'CLS_SCH_DYN_9450A645_ltuitin'));
    await tx.update(classes).set({ name: 'Vip5 (Yoga)' }).where(eq(classes.id, 'cls-1783691162531'));
    
    // Rename original Simba (Huê) to Simba (Aerobic) or just Simba
    await tx.update(classes).set({ name: 'Simba' }).where(eq(classes.id, 'cls-1783691063621'));

    // 2. Victoria School
    console.log('Updating Victoria school classes...');
    await tx.update(classes).set({ name: 'Hippo (Yoga)' }).where(eq(classes.id, 'cls-1784387115719'));

    // 3. Trẻ Thông Thái School
    console.log('Updating Trẻ Thông Thái school classes...');
    await tx.update(classes).set({ name: 'Ghép (Yoga)' }).where(eq(classes.id, 'cls-1783691284938'));

    console.log('=== YOGA NAMING RULE APPLIED SUCCESSFULLY ===');
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
  conn.exec(`cat << 'EOF' > /app/apply_yoga_naming.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config apply_yoga_naming.ts && rm /app/apply_yoga_naming.ts', (err2, execStream) => {
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
