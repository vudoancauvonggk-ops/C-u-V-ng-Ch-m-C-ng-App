const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready for checking attendance issue logs');
  
  const cmd = `
    echo "=== PM2 STATUS ==="
    pm2 jlist
    echo "=== RECENT OUT LOGS ==="
    tail -n 60 /root/.pm2/logs/cham-cong-app-out.log
    echo "=== RECENT ERROR LOGS ==="
    tail -n 60 /root/.pm2/logs/cham-cong-app-error.log
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect(config);
