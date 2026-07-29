const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cd /app && node -e "const { db } = require(\'./dist/server.cjs\'); (async () => { const res = await db.execute(require(\'drizzle-orm\').sql\`SELECT id, teacher_id, date, check_in_time FROM attendance ORDER BY date DESC LIMIT 20\`); console.log(res.rows || res); process.exit(0); })();"', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('stderr', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== DB ATTENDANCE RECORDS ===\n' + out);
      conn.end();
    });
  });
}).connect(config);
