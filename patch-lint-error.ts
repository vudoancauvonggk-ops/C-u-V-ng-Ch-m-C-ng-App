import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

content = content.replace(
  `navigator.clipboard.writeText(\`Định vị trường \${sch.name}:\\n\${mapLink}\`); customAlert('Thông báo', 'Đã copy link bản đồ vào bộ nhớ đệm!');`,
  `navigator.clipboard.writeText(\`Định vị trường \${sch.name}:\\n\${mapLink}\`); alert('Đã copy link bản đồ vào bộ nhớ đệm!');`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Fixed typescript error in AdminDashboard.tsx!');
