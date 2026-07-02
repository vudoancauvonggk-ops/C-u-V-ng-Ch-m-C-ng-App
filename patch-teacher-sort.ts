import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement = `    .sort((a, b) => {
      // Sáng first, then Chiều
      const getWeight = (session: string) => {
         const s = session?.toLowerCase() || '';
         if (s === 'morning' || s.includes('sáng')) return 100;
         if (s === 'afternoon' || s.includes('chiều')) return 200;
         // If it's a time string like "07:30"
         const match = s.match(/^(\d{1,2})[:h]/);
         if (match) return parseInt(match[1]) * 10;
         return 300;
      };
      return getWeight(a.session) - getWeight(b.session);
    })`;

content = content.replace(/\.sort\(\(a, b\) => \{[\s\S]*?return aMorning \? -1 : 1;\s*\}\)/g, replacement);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Fixed sort');
