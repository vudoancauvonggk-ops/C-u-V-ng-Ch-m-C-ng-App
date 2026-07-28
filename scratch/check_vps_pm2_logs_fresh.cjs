const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('tail -n 20 /root/.pm2/logs/cham-cong-app-out.log', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== OUT LOG ===\n' + out);
      conn.exec('tail -n 20 /root/.pm2/logs/cham-cong-app-error.log', (err2, stream2) => {
        let errLog = '';
        stream2.on('data', d => errLog += d.toString());
        stream2.on('close', () => {
          console.log('=== ERROR LOG ===\n' + errLog);
          conn.end();
        });
      });
    });
  });
}).connect(config);
