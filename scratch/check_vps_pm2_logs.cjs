const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready for log extraction');
  conn.exec('pm2 logs cham-cong-app --lines 50 --nostream', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('--- PM2 LOGS ---');
      console.log(out);
      console.log('----------------');
      conn.end();
    });
  });
}).connect(config);
