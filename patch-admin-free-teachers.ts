import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// 1. Add getAvailableTeachersForDateSession helper
content = content.replace(
  `  const hasPermission = (perm: string) => {`,
  `  const getAvailableTeachersForDateSession = (dateStr: string, session: string, excludeTeacherId: string) => {
    if (!dateStr || !session) return teachers.filter(t => t.id !== excludeTeacherId && t.status === 'active');
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay() === 0 ? 8 : dateObj.getDay() + 1; // 2-8
    
    return teachers.filter(t => {
      if (t.id === excludeTeacherId) return false;
      if (t.status !== 'active') return false;
      const hasConflict = schedules.some(s => s.teacherId === t.id && s.dayOfWeek === dayOfWeek && s.session === session);
      return !hasConflict;
    });
  };

  const hasPermission = (perm: string) => {`
);

// 2. Fix the select dropdowns in changes grid
content = content.replace(
  `                            {teachers.filter(t => t.id !== req.teacherId && t.status === 'active').map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}`,
  `                            {getAvailableTeachersForDateSession(req.date, req.session, req.teacherId).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}`
);

// 3. Fix the select dropdown in edit modal
content = content.replace(
  `                      {rawTeachers.filter(t => !t.isDeleted && t.id !== editingChange.teacherId).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}`,
  `                      {getAvailableTeachersForDateSession(editingChange.date, editingChange.session, editingChange.teacherId).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}`
);

// 4. Update the logic for hasApprovedLeave for substitute_teacher as well (mất chuyên cần)
content = content.replace(
  `const hasApprovedLeave = changes.some(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'sick_leave');`,
  `const hasApprovedLeave = changes.some(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth) && (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher'));`
);

content = content.replace(
  `const hasApprovedLeave = changes.some((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'sick_leave');`,
  `const hasApprovedLeave = changes.some((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher'));`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patched AdminDashboard.tsx for free teachers and salary logic!');
