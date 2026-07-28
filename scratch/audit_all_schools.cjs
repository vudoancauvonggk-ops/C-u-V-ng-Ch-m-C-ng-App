module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const code = `
import { db } from './src/db/index.ts';
import { schools, classes, schedules, attendance } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const allSchools = await db.select().from(schools);
  const allClasses = await db.select().from(classes);
  const allSchedules = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
  const allAttendance = await db.select().from(attendance);

  const monthLogs = allAttendance.filter(a => !(a as any).isDeleted && a.date && a.date.startsWith('2026-07') && (a.confirmedByAdmin || a.isVerified));

  console.log('=== 1. AUDIT: SCHOOLS NAMED AFTER CLASS NAMES ===');
  const classLikeKeywords = ['mầm', 'chồi', 'lá', 'nhà trẻ', 'hippo', 'lion', 'elephant', 'dinosaur', 'dragon', 'vip', 'simba'];
  const suspiciousSchools = allSchools.filter(s => {
    const nameLower = s.name.trim().toLowerCase();
    return classLikeKeywords.some(kw => nameLower === kw || nameLower.startsWith(kw + ' '));
  });

  for (const s of suspiciousSchools) {
    const sClasses = allClasses.filter(c => c.schoolId === s.id && !c.isDeleted);
    const sAtt = monthLogs.filter(a => a.schoolId === s.id);
    const sSch = allSchedules.filter(sc => sc.schoolId === s.id);
    console.log(\`Suspicious School: [\${s.id}] "\${s.name}" | isDeleted: \${s.isDeleted} | Classes: \${sClasses.length} | 2026-07 Att: \${sAtt.length} | Schedules: \${sSch.length}\`);
    if (sAtt.length > 0) {
      sAtt.forEach(a => console.log(\`   -> Att ID: \${a.id} | Date: \${a.date} | Teacher: \${a.teacherId} | ClassID: \${a.classId} | ClassName: \${a.className}\`));
    }
  }

  console.log('\\n=== 2. AUDIT: DELETED SCHOOLS WITH APPROVED 2026-07 ATTENDANCE LOGS ===');
  const deletedSchoolsWithAtt = allSchools.filter(s => s.isDeleted && monthLogs.some(a => a.schoolId === s.id));
  for (const s of deletedSchoolsWithAtt) {
    const sAtt = monthLogs.filter(a => a.schoolId === s.id);
    console.log(\`Deleted School with Att: [\${s.id}] "\${s.name}" | 2026-07 Att Count: \${sAtt.length}\`);
    sAtt.forEach(a => {
      const cls = allClasses.find(c => c.id === a.classId);
      console.log(\`   -> Att ID: \${a.id} | Date: \${a.date} | Teacher: \${a.teacherId} | ClassName: \${a.className || cls?.name} | RealClassSchoolID: \${cls?.schoolId}\`);
    });
  }

  console.log('\\n=== 3. AUDIT: SCHOOLS WITH ATTENDANCE LOGS BUT 0 SCHEDULES IN 2026-07 ===');
  const schoolIdsWithAtt = Array.from(new Set(monthLogs.map(a => a.schoolId)));
  for (const schId of schoolIdsWithAtt) {
    const sch = allSchools.find(s => s.id === schId);
    const hasSchedules = allSchedules.some(sc => sc.schoolId === schId);
    if (!hasSchedules) {
      const atts = monthLogs.filter(a => a.schoolId === schId);
      console.log(\`School with 0 Schedules: [\${schId}] "\${sch?.name}" | isDeleted: \${sch?.isDeleted} | 2026-07 Att Count: \${atts.length}\`);
      atts.forEach(a => {
        console.log(\`   -> Att ID: \${a.id} | Date: \${a.date} | Teacher: \${a.teacherId} | ClassID: \${a.classId}\`);
      });
    }
  }

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/audit_schools.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config audit_schools.ts && rm /app/audit_schools.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
