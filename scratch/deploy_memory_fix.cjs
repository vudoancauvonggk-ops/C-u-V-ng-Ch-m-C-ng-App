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
  console.log('SSH connection ready for deployment');
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
          console.log(`Uploading ${file} -> ${remotePath}...`);
          await uploadFile(localPath, remotePath);
        }
      }
    }

    async function doDeploy() {
      console.log('Uploading updated dist files...');
      await uploadDir(localDist, remoteDist);

      console.log('Restarting PM2 cham-cong-app...');
      const restartCmd = 'pm2 restart cham-cong-app';
      
      conn.exec(restartCmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => out += d.toString());
        stream.on('close', () => {
          console.log('=== PM2 RESTART OUTPUT ===\n' + out);
          console.log('Deployment completed successfully!');
          conn.end();
        });
      });
    }

    doDeploy().catch(err => {
      console.error('Deployment error:', err);
      conn.end();
    });
  });
}).connect(config);
