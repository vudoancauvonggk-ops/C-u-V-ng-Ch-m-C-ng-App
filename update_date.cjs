const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "const [mobileTab, setMobileTab] = useState<'home' | 'schedule' | 'checkin' | 'salary' | 'swap' | 'substitute_tab' | 'school' | 'account'>('home');",
  "const [mobileTab, setMobileTab] = useState<'home' | 'schedule' | 'checkin' | 'salary' | 'swap' | 'substitute_tab' | 'school' | 'account'>('home');\n  const [adminOverrideDate, setAdminOverrideDate] = useState<string>('');"
);

content = content.replace(
  "const dToday = new Date(); const todayStr = `${dToday.getFullYear()}-${String(dToday.getMonth() + 1).padStart(2, '0')}-${String(dToday.getDate()).padStart(2, '0')}`;\n  const todayJS = new Date().getDay();",
  `const dToday = adminOverrideDate ? new Date(adminOverrideDate) : new Date(); 
  const todayStr = adminOverrideDate || \`\${dToday.getFullYear()}-\${String(dToday.getMonth() + 1).padStart(2, '0')}-\${String(dToday.getDate()).padStart(2, '0')}\`;
  const todayJS = dToday.getDay();`
);

fs.writeFileSync(path, content);
