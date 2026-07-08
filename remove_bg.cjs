const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const \[bgImage, setBgImage\] = useState<string>\(.*?;\s*/g, '');
content = content.replace(/useEffect\(\(\) => \{\s*if \(currentTeacher\) \{\s*const savedBg = localStorage\.getItem\(`teacher_bg_\$\{currentTeacher\.id\}`\);\s*if \(savedBg\) setBgImage\(savedBg\);\s*else setBgImage\(''\);\s*\}\s*\}, \[currentTeacher\]\);\s*/g, '');
content = content.replace(/const handleBgChange = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?\};\s*/g, '');

content = content.replace(/style=\{\{\s*backgroundImage: bgImage \? `url\(\$\{bgImage\}\)` : undefined,\s*backgroundSize: 'cover',\s*backgroundPosition: 'center'\s*\}\}/g, '');

fs.writeFileSync(path, content);
