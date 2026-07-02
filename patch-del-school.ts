import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement = `                           <button 
                             onClick={() => {
                               if (window.confirm('Bạn có chắc muốn xoá trường này? (Sẽ xoá cả các lịch dạy liên quan đến trường này của bạn)')) {
                                 const isUsedByOthers = schedules.some(s => s.schoolId === sch.id && s.teacherId !== currentTeacher.id && !s.isDeleted);
                                 if (!isUsedByOthers) {
                                    onUpdateSchools(schools.filter(s => s.id !== sch.id));
                                 }
                                 onUpdateSchedules(schedules.filter(s => !(s.schoolId === sch.id && s.teacherId === currentTeacher.id)));
                               }
                             }}
                             className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100 ml-1"
                           >Xoá</button>`;

content = content.replace(/<button \s*onClick=\{\(\) => \{\s*if \(window\.confirm\('Bạn có chắc muốn xoá trường này\? \(Sẽ xoá cả các lịch dạy liên quan đến trường này của bạn\)'\)\) \{\s*onUpdateSchools\(schools\.filter\(s => s\.id !== sch\.id\)\);\s*onUpdateSchedules\(schedules\.filter\(s => !\(s\.schoolId === sch\.id && s\.teacherId === currentTeacher\.id\)\)\);\s*\}\s*\}\}\s*className="text-\[10px\] bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100 ml-1"\s*>Xoá<\/button>/, replacement);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
