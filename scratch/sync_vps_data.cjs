const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const localDataDir = path.join(__dirname, '../data');
if (!fs.existsSync(localDataDir)) {
  fs.mkdirSync(localDataDir, { recursive: true });
}

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Established with VPS 103.82.21.133');
  
  // First, find pm2 process path for office-pro or search for data directories
  conn.exec('pm2 jlist', (err, stream) => {
    if (err) {
      console.error('Error executing pm2 jlist:', err);
      conn.end();
      return;
    }

    let stdout = '';
    stream.on('data', data => { stdout += data.toString(); });
    stream.on('close', async () => {
      let remoteAppPath = '/app';
      try {
        const pm2List = JSON.parse(stdout);
        const officeApp = pm2List.find(p => p.name === 'office-pro' || p.name.includes('office'));
        if (officeApp && officeApp.pm2_env && officeApp.pm2_env.pm_cwd) {
          remoteAppPath = officeApp.pm2_env.pm_cwd;
          console.log(`Found office-pro PM2 path: ${remoteAppPath}`);
        }
      } catch (e) {
        console.log('Could not parse pm2 jlist, falling back to scanning standard paths...');
      }

      const remoteDataPath = path.join(remoteAppPath, 'data').replace(/\\/g, '/');
      console.log(`Scanning remote data path: ${remoteDataPath}`);

      conn.sftp((err, sftp) => {
        if (err) {
          console.error('SFTP Error:', err);
          conn.end();
          return;
        }

        sftp.readdir(remoteDataPath, (err, list) => {
          if (err) {
            console.error(`Error reading remote data dir (${remoteDataPath}):`, err);
            // Fallback: try /root/office-pro/data or /root/app/data
            console.log('Trying alternative remote path: /root/data');
            sftp.readdir('/root/data', (err2, list2) => {
              if (err2) {
                console.error('Alternative path /root/data also failed:', err2);
                conn.end();
                return;
              }
              downloadFiles(sftp, '/root/data', list2);
            });
            return;
          }

          downloadFiles(sftp, remoteDataPath, list);
        });
      });
    });
  });
}).connect(config);

function downloadFiles(sftp, remoteDir, fileList) {
  console.log(`Found ${fileList.length} items in remote data directory:`);
  fileList.forEach(f => console.log(` - ${f.filename}`));

  let pending = fileList.length;
  if (pending === 0) {
    console.log('No data files found on remote VPS.');
    conn.end();
    return;
  }

  fileList.forEach(file => {
    if (file.attrs.isDirectory()) {
      pending--;
      if (pending === 0) conn.end();
      return;
    }

    const remoteFilePath = `${remoteDir}/${file.filename}`;
    const localFilePath = path.join(localDataDir, file.filename);

    console.log(`Downloading ${file.filename} -> ${localFilePath}...`);
    sftp.fastGet(remoteFilePath, localFilePath, (err) => {
      if (err) {
        console.error(`Failed to download ${file.filename}:`, err);
      } else {
        console.log(`Successfully synced: ${file.filename}`);
      }
      pending--;
      if (pending === 0) {
        console.log('--- ALL VPS DATA SYNCED SUCCESSFULLY ---');
        conn.end();
      }
    });
  });
}
