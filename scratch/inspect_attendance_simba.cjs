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
    import { attendance, teachers } from './src/db/schema.ts';
    import { eq, and } from 'drizzle-orm';
    async function run() {
      const atts = await db.select().from(attendance);
      const tchs = await db.select().from(teachers);

      console.log('=== Attendance for Simba (cls-1783691063621) ===');
      atts.filter(a => a.classId === 'cls-1783691063621').forEach(a => {
        const t = tchs.find(tc => tc.id === a.teacherId);
        console.log('AttId:', a.id, '| Date:', a.date, '| Teacher:', t ? t.name : 'Unknown', '| Periods:', a.periods);
      });

      console.log('=== Attendance for Chồi (cls-1783876894119) ===');
      atts.filter(a => a.classId === 'cls-1783876894119').forEach(a => {
        const t = tchs.find(tc => tc.id === a.teacherId);
        console.log('AttId:', a.id, '| Date:', a.date, '| Teacher:', t ? t.name : 'Unknown', '| Periods:', a.periods);
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
