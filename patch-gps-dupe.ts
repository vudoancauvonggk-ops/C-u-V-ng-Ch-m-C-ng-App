import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');
const lines = content.split('\n');
const newLines = [...lines.slice(0, 1516), ...lines.slice(1558)];
fs.writeFileSync('src/components/TeacherDashboard.tsx', newLines.join('\n'));
console.log('Removed duplicate');
