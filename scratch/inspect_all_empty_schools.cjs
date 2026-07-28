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
    import { schools, classes, attendance, schedules } from './src/db/schema.ts';
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const schs = await db.select().from(schools).where(eq(schools.isDeleted, false));
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const atts = await db.select().from(attendance);
      const cls = await db.select().from(classes).where(eq(classes.isDeleted, false));

      console.log('=== Checking for active schools with 0 schedules ===');
      const activeSchoolIds = new Set(skds.map(s => s.schoolId));
      const emptySchools = schs.filter(s => !activeSchoolIds.has(s.id));
      
      console.log('Found empty schools:', emptySchools.length);
      for (const s of emptySchools) {
        const schoolAtts = atts.filter(a => a.schoolId === s.id);
        console.log('- School:', s.name, '(', s.id, ') | Attendance count:', schoolAtts.length);
        if (schoolAtts.length > 0) {
          schoolAtts.forEach(a => {
            const c = cls.find(cl => cl.id === a.classId);
            console.log('  * AttId:', a.id, '| Date:', a.date, '| Class:', c ? c.name : 'Unknown', '(', a.classId, ')');
          });
        }
      }
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
