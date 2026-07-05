const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "res.status(500).json({ error: err.message });",
  "console.error('DB ERROR', err); res.status(500).json({ error: err.message, stack: err.stack, details: err.details });"
);
fs.writeFileSync(path, content);
console.log('Fixed log');
