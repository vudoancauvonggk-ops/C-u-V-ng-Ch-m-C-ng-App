import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/const res = \n        const upsert/g, 'const upsert');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed syntax error');
