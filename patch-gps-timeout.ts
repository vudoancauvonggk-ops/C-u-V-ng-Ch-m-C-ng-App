import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

content = content.replace(/\{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 \}/g, "{ enableHighAccuracy: true, timeout: 60000, maximumAge: 0 }");

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
