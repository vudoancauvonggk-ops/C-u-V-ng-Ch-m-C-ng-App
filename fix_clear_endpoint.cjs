const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("await db.update(attendance).set({ photoUrl: '' });", "await db.update(attendance).set({ selfieImage: '' });");
fs.writeFileSync(path, content);
console.log('Fixed server.ts clear endpoint');
