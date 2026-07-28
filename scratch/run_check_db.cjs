const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const localFile = path.join(__dirname, 'check_dao_detail.ts');
    const remoteFile = '/app/scratch/check_dao_detail.ts';

    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) {
        console.error('Upload failed:', err);
        conn.end();
        return;
      }
      console.log('Upload finished! Running script on VPS...');
      conn.exec(`cd /app && npx tsx -r dotenv/config scratch/check_dao_detail.ts`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    });
  });
}).connect(config);
