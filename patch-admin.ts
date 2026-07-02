import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

content = content.replace(
  /onUpdateSchedules\(updatedSchedules\);\n      \}/,
  `onUpdateSchedules(updatedSchedules);
      }
      
      // Notify substitute teacher if applicable
      if (req.targetTeacherId && req.requestType === 'substitute_teacher') {
         onAddNotification(
           'Phân công dạy dùm mới 📣', 
           \`Bạn được Admin phân công dạy thay vào ngày \${req.date}, ca \${req.session === 'morning' ? 'Sáng' : 'Chiều'}. Vui lòng kiểm tra tab Dạy Dùm để xem chi tiết trường, lớp và đường đi.\`, 
           'info'
         );
      }`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Added substitute notification logic in AdminDashboard!');
