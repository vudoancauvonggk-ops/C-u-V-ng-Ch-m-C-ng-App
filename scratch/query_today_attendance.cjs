const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  // Query attendance for 2026-07-29 or today
  const dbUrl = 'postgresql://postgres:postgres@localhost:5432/cauvong_db';
  const queryCmd = `docker exec -i $(docker ps -q -f name=postgres || docker ps -q | head -n 1) psql -U postgres -d cauvong_db -c "SELECT id, teacher_id, date, session, check_in_time FROM attendance ORDER BY date DESC, check_in_time DESC LIMIT 20;"`;

  conn.exec(queryCmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('stderr', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== ATTENDANCE RECORDS IN DB ===\n' + out);
      conn.end();
    });
  });
}).connect(config);
