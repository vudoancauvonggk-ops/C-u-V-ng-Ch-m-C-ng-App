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
    echo "=== SEARCHING ALL JSON FILES ==="
    find /root /app /home -name "*.json" -not -path "*/node_modules/*" -not -path "*/.npm/*" 2>/dev/null
    echo "=== SEARCHING ALL DOCX/PDF/XLSX FILES ==="
    find /root /app /home \( -name "*.docx" -o -name "*.pdf" -o -name "*.xlsx" -o -name "*.csv" \) -not -path "*/node_modules/*" 2>/dev/null
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
