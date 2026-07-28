const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready. Installing missing dependencies on VPS...');
  
  const cmd = 'cd /app && npm install multer imapflow mailparser mammoth pdf-parse nodemailer idb-keyval && pm2 restart cham-cong-app';
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    let errOut = '';
    stream.on('data', d => {
      const s = d.toString();
      out += s;
      console.log(s);
    });
    stream.stderr.on('data', d => {
      const s = d.toString();
      errOut += s;
      console.error(s);
    });
    stream.on('close', () => {
      console.log('--- NPM INSTALL & PM2 RESTART FINISHED ---');
      conn.exec('pm2 logs cham-cong-app --lines 25 --nostream', (err2, stream2) => {
        let logs = '';
        stream2.on('data', d => logs += d.toString());
        stream2.on('close', () => {
          console.log('--- LATEST PM2 LOGS ---');
          console.log(logs);
          console.log('-----------------------');
          conn.end();
        });
      });
    });
  });
}).connect(config);
