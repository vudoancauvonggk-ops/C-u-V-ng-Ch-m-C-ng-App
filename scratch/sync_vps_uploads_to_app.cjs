const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready. Syncing all uploads and data on VPS...');
  
  const cmd = `
    mkdir -p /app/uploads/candidates
    cp -r /root/office-pro/uploads/* /app/uploads/
    cp -n /root/office-pro/data/* /app/data/
    echo "=== SYNC COMPLETED ==="
    ls -la /app/uploads/candidates
    ls -la /app/data
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
