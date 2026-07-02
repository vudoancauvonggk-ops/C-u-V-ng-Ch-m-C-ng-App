import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');
content = content.replace('              </div>\n            )}}', '              </div>\n            )}');
fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
