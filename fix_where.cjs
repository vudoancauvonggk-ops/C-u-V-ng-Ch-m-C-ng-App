const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "await db.update(attendance).set({ selfieImage: '' }).where(not(eq(attendance.selfieImage, '')));",
  "await db.update(attendance).set({ selfieImage: '' }).where(isNotNull(attendance.id));"
);
fs.writeFileSync(path, content);
console.log('Fixed where');
