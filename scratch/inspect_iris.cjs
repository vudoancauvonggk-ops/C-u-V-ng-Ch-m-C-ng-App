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
    import { schools, classes } from './src/db/schema.ts';
    import { eq } from 'drizzle-orm';
    async function run() {
      const schs = await db.select().from(schools);
      const cls = await db.select().from(classes);

      console.log('=== IRIS SCHOOLS ===');
      schs.filter(s => s.name.includes('Iris')).forEach(s => console.log(s.id, ':', s.name, '| tuitionRate:', s.tuitionRate, '| isInvoice:', s.isInvoice, '| classesCount:', s.classesCount));

      console.log('=== IRIS CLASSES ===');
      cls.filter(c => c.name.includes('Bloom') || c.name.includes('Bud') || c.name.includes('Gia Hoà') || c.name.includes('DXH')).forEach(c => {
        const s = schs.find(sc => sc.id === c.schoolId);
        console.log(c.id, ':', c.name, 'under school:', s ? s.name : 'Unknown', '(', c.schoolId, ')');
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
