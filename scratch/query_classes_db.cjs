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
  conn.exec("cd /app && npx tsx -r dotenv/config -e \"import { db } from './src/db/index.ts'; import { classes, schools } from './src/db/schema.ts'; import { eq } from 'drizzle-orm'; db.select().from(classes).then(cls => { cls.forEach(c => console.log(c.id, c.name, 'school:', c.schoolId, 'isDeleted:', c.isDeleted)) })\"", (err, stream) => {
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
