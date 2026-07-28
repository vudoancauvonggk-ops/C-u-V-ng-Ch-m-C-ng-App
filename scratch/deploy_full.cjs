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
  console.log('SSH connection ready for deployment');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const localDist = path.join(__dirname, '../dist');
    const remoteDist = '/app/dist';
    const localData = path.join(__dirname, '../data');
    const remoteData = '/app/data';

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
      console.log('Uploading dist assets...');
      await uploadDir(localDist, remoteDist);

      if (fs.existsSync(localData)) {
        console.log('Uploading data configurations...');
        await uploadDir(localData, remoteData);
      }

      console.log('Upload finished! Restarting PM2 app [cham-cong-app]...');
      conn.exec('pm2 restart cham-cong-app', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          console.log('PM2 restart signal sent. Verifying status...');
          conn.exec('pm2 show cham-cong-app', (err2, stream2) => {
            let out = '';
            stream2.on('data', d => out += d.toString());
            stream2.on('close', () => {
              console.log(out);
              console.log('--- DEPLOYMENT COMPLETED SUCCESSFULLY ---');
              conn.end();
            });
          });
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    }

    doDeploy().catch(err => {
      console.error('Error during deployment:', err);
      conn.end();
    });
  });
}).connect(config);
