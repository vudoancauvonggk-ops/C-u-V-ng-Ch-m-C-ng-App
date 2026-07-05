const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "res.status(500).json({ error: err.message, stack: err.stack, details: err.details });",
  "res.status(500).json({ error: err.message, stack: err.stack, full: JSON.stringify(err) });"
);
fs.writeFileSync(path, content);
