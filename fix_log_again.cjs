const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "res.status(500).json({ error: err.message });",
  "console.error('API ERR:', err); res.status(500).json({ error: err.message, stack: err.stack, details: err.detail || err.code || err.routine });"
);
fs.writeFileSync(path, content);
