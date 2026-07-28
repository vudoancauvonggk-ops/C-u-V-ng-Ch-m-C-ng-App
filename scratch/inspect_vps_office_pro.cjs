const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready for inspecting office-pro data on VPS');
  
  const cmd = `
    echo "=== OFFICE PRO FILES ==="
    ls -la /root/office-pro
    echo "=== OFFICE PRO DATA ==="
    ls -la /root/office-pro/data
    echo "=== OFFICE PRO UPLOADS ==="
    ls -la /root/office-pro/uploads || echo "No /root/office-pro/uploads"
    echo "=== APP DATA ==="
    ls -la /app/data
    echo "=== APP UPLOADS ==="
    ls -la /app/uploads || echo "No /app/uploads"
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
