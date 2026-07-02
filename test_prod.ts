import { exec } from 'child_process';
const child = exec("NODE_ENV=production node dist/server_test.cjs");
child.stdout?.on('data', console.log);
child.stderr?.on('data', console.error);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:3002/');
    console.log("Status:", res.status);
    console.log("Body:", (await res.text()).substring(0, 50));
  } catch (err) {
    console.error(err);
  }
  child.kill();
}, 2000);
