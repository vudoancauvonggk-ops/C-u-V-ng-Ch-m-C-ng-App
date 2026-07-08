const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `    // Real-time dynamic dates
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // Create actual ISO date string for today using local time
    const todayStr = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;`;

const replacement = `    // Real-time dynamic dates
    const now = adminOverrideDate ? new Date(adminOverrideDate) : new Date();
    const timeStr = (adminOverrideDate ? new Date() : now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // Create actual ISO date string for today using local time
    const todayStr = adminOverrideDate || \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}\`;`;

content = content.replace(targetStr, replacement);
fs.writeFileSync(path, content);
