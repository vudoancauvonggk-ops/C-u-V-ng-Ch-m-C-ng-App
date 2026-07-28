const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== CANDIDATES UPLOADS ==="
    ls -la /root/office-pro/uploads/candidates
    echo "=== PUBLIC FILES ==="
    ls -la /root/office-pro/public
    echo "=== OFFICE PRO STATE CONTENT ==="
    cat /root/office-pro/data/office_state.json
    echo "=== APP STATE CONTENT ==="
    cat /app/data/office_state.json
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
