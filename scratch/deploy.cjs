module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
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
    
    const localDist = path.join(__dirname, '../dist');
    const remoteDist = '/app/dist';

    function uploadFile(localPath, remotePath) {
      return new Promise((resolve, reject) => {
        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    function ensureDir(dir) {
      return new Promise((resolve) => {
        sftp.mkdir(dir, () => resolve());
      });
    }

    async function uploadDir(localDir, remoteDir) {
      await ensureDir(remoteDir);
      const files = fs.readdirSync(localDir);
      for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = path.join(remoteDir, file).replace(/\\/g, '/');
        const stat = fs.statSync(localPath);
        if (stat.isDirectory()) {
          await uploadDir(localPath, remotePath);
        } else {
          console.log(`Uploading ${file}...`);
          await uploadFile(localPath, remotePath);
        }
      }
    }

    uploadDir(localDist, remoteDist).then(() => {
      console.log('Upload finished! Restarting PM2 app...');
      conn.exec('pm2 restart cham-cong-app', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          console.log('Server restarted successfully!');
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    }).catch(err => {
      console.error('Error during upload:', err);
      conn.end();
    });
  });
}).connect(config);
