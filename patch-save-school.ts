import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement1 = `  const handleSaveSchoolEdit = (e: React.FormEvent) => {
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

content = content.replace(/const handleSaveSchoolEdit = \(e: React\.FormEvent\) => \{[\s\S]*?alert\('Đã lưu thông tin trường!'\);\s*\};/, replacement1);

const replacement2 = `                           <button 
                             onClick={() => {
                               setEditingSchool(sch.id);
                               setEditSchoolData(sch);
                             }}
                             className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200"
                           >Sửa</button>
                           <button 
                             onClick={() => {
                               if (window.confirm('Bạn có chắc muốn xoá trường này? (Sẽ xoá cả các lịch dạy liên quan đến trường này của bạn)')) {
                                 onUpdateSchools(schools.filter(s => s.id !== sch.id));
                                 onUpdateSchedules(schedules.filter(s => !(s.schoolId === sch.id && s.teacherId === currentTeacher.id)));
                               }
                             }}
                             className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100 ml-1"
                           >Xoá</button>`;

content = content.replace(/<button \s*onClick=\{\(\) => \{\s*setEditingSchool\(sch\.id\);\s*setEditSchoolData\(sch\);\s*\}\}\s*className="text-\[10px\] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200"\s*>Sửa<\/button>/, replacement2);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
