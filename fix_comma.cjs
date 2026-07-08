const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/backgroundColor: '#f8fafc',\s*,\s*backgroundAttachment: 'local'/g, "backgroundColor: '#f8fafc',\n                backgroundAttachment: 'local'");
fs.writeFileSync(path, content);
