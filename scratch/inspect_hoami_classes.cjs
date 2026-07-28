module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cd /app && npx tsx -r dotenv/config -e "
    import { db } from './src/db/index.ts';
    import { schools, classes, schedules } from './src/db/schema.ts';
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const targetSchoolIds = [
        'sch_1784301329427', // Hoạ Mi Nâu
        'SCH_DYN_027EF3CC', // Họa Mi
        'SCH_DYN_E8DF7AAA', // Hoa Lan
        'sch-1783602028461', // MN HOẠ MI QL 13
        'SCH_DYN_B636F89E'  // Hoạ mi
      ];

      const schs = await db.select().from(schools);
      const cls = await db.select().from(classes);
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));

      console.log('=== Target Schools Status ===');
      targetSchoolIds.forEach(id => {
        const s = schs.find(sc => sc.id === id);
        console.log(id, ':', s ? s.name : 'Not Found', 'isDeleted:', s ? s.isDeleted : 'N/A');
      });

      console.log('=== Active Classes & Schedules in Targets ===');
      cls.filter(c => targetSchoolIds.includes(c.schoolId) && !c.isDeleted).forEach(c => {
        const schoolObj = schs.find(sc => sc.id === c.schoolId);
        const sCount = skds.filter(s => s.classId === c.id).length;
        console.log('School:', schoolObj ? schoolObj.name : 'Unknown', '| Class:', c.name, '| Id:', c.id, '| Schedules:', sCount);
      });
    }
    run().then(() => process.exit(0)).catch(console.error);
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect(config);
