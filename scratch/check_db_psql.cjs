const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /app/.env | grep DATABASE_URL', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.on('close', () => {
      console.log('=== DATABASE_URL ===\n' + out.trim());
      const dbUrl = out.trim().split('=')[1];
      if (dbUrl) {
        conn.exec(`psql "${dbUrl}" -c "SELECT id, teacher_id, date, session, check_in_time FROM attendance ORDER BY date DESC, check_in_time DESC LIMIT 20;"`, (err2, stream2) => {
          let out2 = '';
          stream2.on('data', d => out2 += d.toString());
          stream2.on('close', () => {
            console.log('=== ATTENDANCE RECORDS ===\n' + out2);
            conn.end();
          });
        });
      } else {
        conn.end();
      }
    });
  });
}).connect(config);
