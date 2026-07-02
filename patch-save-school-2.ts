import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const oldFunc = `  const handleSaveSchoolEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchool) {
      const originalSchool = schools.find(s => s.id === editingSchool);
      const isNameOrAddressChanged = originalSchool && (originalSchool.name !== editSchoolData.name || originalSchool.address !== editSchoolData.address);
      const usedByOtherTeachers = schedules.some(s => s.schoolId === editingSchool && s.teacherId !== currentTeacher.id && !s.isDeleted);
      
      if (isNameOrAddressChanged && usedByOtherTeachers) {
         const newSchoolId = 'SCH_' + Date.now();
         const newSchool = { ...editSchoolData, id: newSchoolId };
         
         const updatedSchedules = schedules.map(s => {
            if (s.schoolId === editingSchool && s.teacherId === currentTeacher.id) {
               return { ...s, schoolId: newSchoolId };
            }
            return s;
         });
         
         onUpdateSchools([...schools, newSchool]);
         onUpdateSchedules(updatedSchedules);
      } else {
         const updated = schools.map(s => s.id === editingSchool ? { ...s, ...editSchoolData } : s);
         onUpdateSchools(updated);
      }
    } else {
      const newSch = { ...editSchoolData, id: 'SCH_' + Date.now() };
      onUpdateSchools([...schools, newSch]);
    }
    setEditingSchool(undefined);
    alert('Đã lưu thông tin trường!');
  };`;

const newFunc = `  const handleSaveSchoolEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchool) {
      const originalSchool = schools.find(s => s.id === editingSchool);
      const isNameOrAddressChanged = !originalSchool || originalSchool.name !== editSchoolData.name || originalSchool.address !== editSchoolData.address;
      const usedByOtherTeachers = schedules.some(s => s.schoolId === editingSchool && s.teacherId !== currentTeacher.id && !s.isDeleted);
      
      if (isNameOrAddressChanged && usedByOtherTeachers) {
         const newSchoolId = 'SCH_' + Date.now();
         const newSchool = { ...editSchoolData, id: newSchoolId };
         
         const updatedSchedules = schedules.map(s => {
            if (s.schoolId === editingSchool && s.teacherId === currentTeacher.id) {
               return { ...s, schoolId: newSchoolId };
            }
            return s;
         });
         
         onUpdateSchools([...schools, newSchool]);
         onUpdateSchedules(updatedSchedules);
      } else {
         if (originalSchool) {
             const updated = schools.map(s => s.id === editingSchool ? { ...s, ...editSchoolData } : s);
             onUpdateSchools(updated);
         } else {
             const newSchool = { ...editSchoolData, id: editingSchool };
             onUpdateSchools([...schools, newSchool]);
         }
      }
    } else {
      const newSch = { ...editSchoolData, id: 'SCH_' + Date.now() };
      onUpdateSchools([...schools, newSch]);
    }
    setEditingSchool(undefined);
    alert('Đã lưu thông tin trường!');
  };`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
