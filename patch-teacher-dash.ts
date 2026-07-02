import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

content = content.replace(
  `  const canViewAllTeachers = currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager' || currentUser?.role === 'training' || userPermsArray.includes('can_view_all_teachers');
  const canViewAllSchedules = currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager' || currentUser?.role === 'training' || userPermsArray.includes('can_view_all_schedules') || userPermsArray.includes('can_edit_schedule');`,
  `  const canViewAllTeachers = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_teachers');
  const canViewAllSchedules = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_schedules') || userPermsArray.includes('can_edit_schedule');`
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx');
