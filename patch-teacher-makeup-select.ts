import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// The replacement should target the select options of makeup form
content = content.replace(
  `                             {schedules.filter(s => !s.isDeleted && s.teacherId === currentTeacher.id).map(s => (
                               <option key={s.id} value={s.id}>{getSchoolName(s.schoolId, s)} - Lớp {getClassName(s.classId)}</option>
                             ))}`,
  `                             {schedules.filter(s => !s.isDeleted && s.teacherId === currentTeacher.id).map(s => (
                               <option key={s.id} value={s.id}>{getSchoolName(s.schoolId, s)} - Lớp {getClassName(s.classId)}</option>
                             ))}
                             {changes.filter(c => c.targetTeacherId === currentTeacher?.id && c.status === 'approved' && c.requestType === 'substitute_teacher').map(c => {
                               const reqDateObj = new Date(c.date);
                               const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                               const originalSchedule = schedules.find(s => s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek && s.session === c.session);
                               if (!originalSchedule) return null;
                               return <option key={\`sub_\${originalSchedule.id}\`} value={originalSchedule.id}>[Dạy Dùm] {getSchoolName(originalSchedule.schoolId, originalSchedule)} - Lớp {getClassName(originalSchedule.classId)} ({c.date})</option>;
                             })}`
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx with makeup form options!');
