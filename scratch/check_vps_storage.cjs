const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready, checking VPS disk & RAM...');
  conn.exec(`echo "=== O DUNG LUONG (DISK USAGE) ===" && df -h / && echo "" && echo "=== BỘ NHỚ RAM (RAM USAGE) ===" && free -h && echo "" && echo "=== DUNG LUONG MONGO/POSTGRES DIRS ===" && du -sh /var/lib/postgresql 2>/dev/null || true`, (err, stream) => {
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
