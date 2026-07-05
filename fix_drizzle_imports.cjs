const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { eq } from 'drizzle-orm';",
  "import { eq, not, ne, isNotNull } from 'drizzle-orm';"
);
fs.writeFileSync(path, content);
console.log('Fixed imports');
