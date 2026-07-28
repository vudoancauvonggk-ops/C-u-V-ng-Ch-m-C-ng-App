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
    import { schedules, classes, schools, teachers } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const cls = await db.select().from(classes).where(eq(classes.isDeleted, false));
      const schs = await db.select().from(schools).where(eq(schools.isDeleted, false));
      const tchs = await db.select().from(teachers);

      console.log('=== Sao Việt Schools ===');
      schs.filter(s => s.name.includes('Sao Việt')).forEach(s => console.log(s.id, ':', s.name));

      const svSchoolIds = schs.filter(s => s.name.includes('Sao Việt')).map(s => s.id);

      console.log('=== Schedules under Sao Việt schools ===');
      const svSkds = skds.filter(s => svSchoolIds.includes(s.schoolId));
      svSkds.forEach(s => {
        const c = cls.find(cl => cl.id === s.classId);
        const sc = schs.find(sch => sch.id === s.schoolId);
        const t = tchs.find(tc => tc.id === s.teacherId);
        console.log('SchedId:', s.id, '| School:', sc?.name, '| Class:', c?.name, '| Teacher:', t?.name, '| Teacher ID:', s.teacherId);
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
