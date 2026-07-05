const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "full: JSON.stringify(err)",
  "full: Object.getOwnPropertyNames(err).reduce((acc, key) => { acc[key] = err[key]; return acc; }, {})"
);
fs.writeFileSync(path, content);
