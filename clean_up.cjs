const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/reader\.readAsDataURL\(file\);\s*\}\s*\};\s*/g, '');
content = content.replace(/backgroundColor: bgImage \? 'transparent' : '#f8fafc',/g, "backgroundColor: '#f8fafc',");
content = content.replace(/backgroundImage: bgImage \? `url\(\$\{bgImage\}\)` : 'none',/g, "");
content = content.replace(/\{bgImage && <div className="absolute inset-0 bg-white\/70 pointer-events-none z-0" \/>\}/g, "");
content = content.replace(/backgroundSize: 'cover',\s*backgroundPosition: 'center'/g, "");
fs.writeFileSync(path, content);
