import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// The replacement should be targeted at the Dạy Dùm tab rendering
const substituteTabHTML = `            {/* TAB: DAY DUM (SUBSTITUTE SHIFTS) */}
            {mobileTab === 'substitute_tab' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <h3 className="font-bold text-sm border-b pb-2">Lịch Dạy Dùm Được Phân Công</h3>
                <p className="text-[11px] text-slate-500">Danh sách các ca bạn được phân công dạy thay. Nếu qua ngày, bạn cần làm đơn điểm danh bù.</p>
                
                <div className="space-y-4 mt-4">
                  {changes.filter(c => c.targetTeacherId === currentTeacher.id && c.status === 'approved' && c.requestType === 'substitute_teacher').length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">Chưa có lịch dạy dùm nào được phân công.</p>
                  ) : (
                    changes.filter(c => c.targetTeacherId === currentTeacher.id && c.status === 'approved' && c.requestType === 'substitute_teacher').map(c => {
                      const reqDateObj = new Date(c.date);
                      const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                      const originalSchedules = activeSchedules.filter(s => s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek && s.session === c.session);
                      
                      if (originalSchedules.length === 0) {
                         return (
                           <div key={c.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                              <p className="text-red-500 font-bold mb-1">Lịch Không Tồn Tại</p>
                              <p className="text-[10px] text-slate-500">Ngày {c.date} ca {c.session === 'morning' ? 'Sáng' : 'Chiều'} không có lịch dạy nào của giáo viên gốc.</p>
                           </div>
                         );
                      }

                      const isToday = c.date === todayStr;

                      return (
                        <div key={c.id} className="space-y-3">
                          {originalSchedules.map(originalSchedule => {
                            const schSchool = schools.find(sch => sch.id === originalSchedule.schoolId);
                            const schClass = classes.find(cl => cl.id === originalSchedule.classId);
                            const origTeacher = allowedTeachers.find(t => t.id === c.originalTeacherId) || { name: 'Giáo viên gốc' };
                            
                            // Prevent double rendering if there are multiple classes in the same session, 
                            // maybe just group them? For now render each as a block
                            
                            return (
                              <div key={originalSchedule.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                                  {c.date} - Ca {c.session === 'morning' ? 'Sáng' : 'Chiều'}
                                </div>
                                
                                <h4 className="font-bold text-blue-900 mt-2 mb-1">Dạy thay cho: {origTeacher.name}</h4>
                                <div className="space-y-1 mb-3 text-slate-700">
                                  <p><span className="font-semibold text-slate-500">Trường:</span> {schSchool?.name}</p>
                                  <p><span className="font-semibold text-slate-500">Lớp:</span> {schClass?.name}</p>
                                  <p><span className="font-semibold text-slate-500">Địa chỉ:</span> {schSchool?.address}</p>
                                </div>

                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      if (schSchool?.address) {
                                        window.open(\`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(schSchool.address)}\`, '_blank');
                                      }
                                    }}
                                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1 hover:bg-slate-50 transition"
                                  >
                                    <MapPin className="w-3.5 h-3.5" /> Chỉ Đường
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      if (isToday) {
                                        setSelectedScheduleId(originalSchedule.id);
                                        setMobileTab('checkin');
                                      } else {
                                        setMakeupDate(c.date);
                                        setMakeupScheduleId(originalSchedule.id);
                                        setShowMakeupForm(true);
                                        setMobileTab('home');
                                      }
                                    }}
                                    className={\`flex-1 font-bold py-2 rounded-xl text-center transition flex items-center justify-center gap-1 shadow-sm \${isToday ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}\`}
                                  >
                                    {isToday ? <Camera className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                    {isToday ? 'Chấm công ngay' : 'Xin chấm công bù'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            
            {/* TAB: SALARY SLIP (BẢNG LƯƠNG CHI TIẾT TẠM TÍNH) */}`;

// First, we need to extract the exact text of the existing substitute_tab we added earlier, or we can just replace the whole thing if we know exactly what it is. Wait, since we are re-patching, let's just grep for the old one and replace it. But I don't know the exact string.
// Let's use a regex to replace everything between {/* TAB: DAY DUM (SUBSTITUTE SHIFTS) */} and {/* TAB: SALARY SLIP
content = content.replace(
  /\{\/\* TAB: DAY DUM \(SUBSTITUTE SHIFTS\) \*\/\}[\s\S]*?\{\/\* TAB: SALARY SLIP \(BẢNG LƯƠNG CHI TIẾT TẠM TÍNH\) \*\/\}/,
  substituteTabHTML
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx with fixed check-in logic!');
