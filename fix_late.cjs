const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const isLateFlagged = now.getHours() > limitHour || (now.getHours() === limitHour && now.getMinutes() > limitMinute);',
  'const realNow = new Date();\n    const isLateFlagged = realNow.getHours() > limitHour || (realNow.getHours() === limitHour && realNow.getMinutes() > limitMinute);'
);

fs.writeFileSync(path, content);
