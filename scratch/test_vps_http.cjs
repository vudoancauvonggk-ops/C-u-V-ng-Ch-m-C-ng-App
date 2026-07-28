const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -I http://127.0.0.1:3000', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== HTTP TEST RESULT ===\n' + out);
      conn.end();
    });
  });
}).connect(config);
