const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const localUploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Established for Uploads Sync');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    function syncDir(remoteDir, localDir) {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      sftp.readdir(remoteDir, (err, list) => {
        if (err) {
          console.log(`No uploads directory at ${remoteDir}`);
          conn.end();
          return;
        }

        let pending = list.length;
        if (pending === 0) {
          console.log(`Uploads dir ${remoteDir} is empty.`);
          conn.end();
          return;
        }

        list.forEach(item => {
          const remoteItemPath = `${remoteDir}/${item.filename}`;
          const localItemPath = path.join(localDir, item.filename);

          if (item.attrs.isDirectory()) {
            syncDir(remoteItemPath, localItemPath);
            pending--;
            if (pending === 0) conn.end();
          } else {
            console.log(`Downloading upload asset: ${item.filename}...`);
            sftp.fastGet(remoteItemPath, localItemPath, (err) => {
              if (err) console.error(`Error downloading ${item.filename}:`, err);
              else console.log(`Synced asset: ${item.filename}`);
              pending--;
              if (pending === 0) {
                console.log('--- ALL UPLOADS SYNCED ---');
                conn.end();
              }
            });
          }
        });
      });
    }

    syncDir('/root/office-pro/uploads', localUploadsDir);
  });
}).connect(config);
