const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/const PORT = 3000;/, 'const PORT = 3002;');
fs.writeFileSync('server_test.ts', code);
