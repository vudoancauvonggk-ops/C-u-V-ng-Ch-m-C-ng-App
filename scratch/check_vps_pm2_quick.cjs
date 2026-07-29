const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 jlist', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== PM2 PROCESSES ===');
      try {
        const list = JSON.parse(out);
        list.forEach(p => console.log(`ID: ${p.pm_id} | Name: ${p.name} | Status: ${p.pm2_env.status} | Restarts: ${p.pm2_env.restart_time} | Mem: ${(p.monit.memory/(1024*1024)).toFixed(1)}MB`));
      } catch (e) {
        console.log(out);
      }
      conn.end();
    });
  });
}).connect(config);
