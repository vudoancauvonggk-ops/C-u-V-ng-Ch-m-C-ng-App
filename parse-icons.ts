import * as fs from 'fs';
const content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf8');
const tags = [...content.matchAll(/<([A-Z]\w+)/g)].map(m => m[1]);
console.log(Array.from(new Set(tags)).sort().join(', '));
