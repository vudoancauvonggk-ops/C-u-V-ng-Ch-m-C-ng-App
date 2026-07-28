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
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const cls = await db.select().from(classes).where(eq(classes.isDeleted, false));
      const schs = await db.select().from(schools);
      const tchs = await db.select().from(teachers);

      const ha = tchs.find(t => t.name.includes('Hà'));
      const yen = tchs.find(t => t.name.includes('Yên'));
      const yogaTeacherIds = [ha?.id, yen?.id].filter(Boolean);

      console.log('=== Yoga Teachers ===');
      console.log('Ms. Hà ID:', ha?.id);
      console.log('Ms. Yên ID:', yen?.id);

      console.log('=== Yoga Schedules ===');
      const yogaSkds = skds.filter(s => yogaTeacherIds.includes(s.teacherId));
      for (const s of yogaSkds) {
        const c = cls.find(cl => cl.id === s.classId);
        const sc = schs.find(sch => sch.id === s.schoolId);
        const t = tchs.find(tc => tc.id === s.teacherId);
        
        // Find other schedules in the same school with the same base class name
        const otherSkds = skds.filter(sk => 
          sk.schoolId === s.schoolId && 
          sk.id !== s.id && 
          !yogaTeacherIds.includes(sk.teacherId)
        );

        console.log('Yoga Sched:', s.id, '| School:', sc?.name, '| Class:', c?.name, '(', s.classId, ')', '| Teacher:', t?.name, '| Day:', s.dayOfWeek, '| Session:', s.session);
        if (otherSkds.length > 0) {
          console.log('  -> Other Aerobic schedules at this school:');
          otherSkds.forEach(os => {
            const oc = cls.find(cl => cl.id === os.classId);
            const ot = tchs.find(tc => tc.id === os.teacherId);
            console.log('     * Sched:', os.id, '| Class:', oc?.name, '| Teacher:', ot?.name);
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
