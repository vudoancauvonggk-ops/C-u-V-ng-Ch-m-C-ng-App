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
  const schoolIds = victoriaSchools.map(s => s.id);
  const att = await db.select().from(attendance).where(inArray(attendance.schoolId, schoolIds));
  console.log("=== ATTENDANCE LOGS FOR VICTORIA SCHOOLS ===");
  console.log(JSON.stringify(att, null, 2));
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/inspect_vic_att.ts\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config inspect_vic_att.ts && rm /app/inspect_vic_att.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    });
  });
}).connect(config);
