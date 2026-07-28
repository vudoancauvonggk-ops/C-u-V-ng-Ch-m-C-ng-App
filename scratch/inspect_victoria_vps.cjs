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
import { ilike, inArray, eq } from 'drizzle-orm';

async function run() {
  const victoriaSchools = await db.select().from(schools).where(ilike(schools.name, '%Victoria%'));
  console.log("=== VICTORIA SCHOOLS ===");
  console.log(JSON.stringify(victoriaSchools, null, 2));

  const schoolIds = victoriaSchools.map(s => s.id);
  if (schoolIds.length > 0) {
    const classList = await db.select().from(classes).where(inArray(classes.schoolId, schoolIds));
    console.log("=== VICTORIA CLASSES ===");
    console.log(JSON.stringify(classList, null, 2));

    const scheduleList = await db.select().from(schedules).where(inArray(schedules.schoolId, schoolIds));
    console.log("=== VICTORIA SCHEDULES ===");
    console.log(JSON.stringify(scheduleList, null, 2));

    const attendanceList = await db.select().from(attendance).where(inArray(attendance.schoolId, schoolIds));
    console.log("=== VICTORIA ATTENDANCE LOGS COUNT ===", attendanceList.length);
  }
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cat << 'EOF' > /app/inspect_vic.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config inspect_vic.ts && rm /app/inspect_vic.ts', (err2, execStream) => {
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
