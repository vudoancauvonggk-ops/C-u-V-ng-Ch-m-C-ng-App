const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  const dbUrl = 'postgres://postgres:postgres@localhost:5432/postgres';
  const queryCmd = `psql "${dbUrl}" -c "SELECT count(*) FROM attendance WHERE date = '2026-07-29'; SELECT count(*) FROM audit_logs WHERE created_at LIKE '2026-07-29%'; SELECT count(*) FROM change_requests WHERE date = '2026-07-29';"`;

  conn.exec(queryCmd, (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== DB COUNT FOR TODAY 2026-07-29 ===\n' + out);
      conn.end();
    });
  });
}).connect(config);
