import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// 1. Change the text for substitute_teacher request
content = content.replace(
  `<option value="substitute_teacher">Dạy thay cho Giáo viên khác (55k/tiết)</option>`,
  `<option value="substitute_teacher">Nhờ người dạy thay (55.000 VNĐ/tiết)</option>`
);

// 2. Change the text in the history log
content = content.replace(
  `reqType === 'sick_leave' ? 'nghỉ ốm' : 'dạy thay/thay ca'`,
  `reqType === 'sick_leave' ? 'nghỉ ốm' : reqType === 'substitute_teacher' ? 'nhờ người dạy thay' : 'đổi ca'`
);

content = content.replace(
  `reqType === 'sick_leave' ? 'xin nghỉ' : 'dạy thay'`,
  `reqType === 'sick_leave' ? 'xin nghỉ' : reqType === 'substitute_teacher' ? 'nhờ dạy thay' : 'đổi ca'`
);

content = content.replace(
  `c.requestType === 'art_performance' ? 'Coi diễn văn nghệ' : 'Dạy thay'}`,
  `c.requestType === 'art_performance' ? 'Coi diễn văn nghệ' : 'Nhờ người dạy thay'}`
);

// 3. Update salary slip logic (mất chuyên cần)
content = content.replace(
  `const hasApprovedLeave = currentTeacher ? changes.some(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'sick_leave') : false;`,
  `const hasApprovedLeave = currentTeacher ? changes.some(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher')) : false;`
);

// 4. Add new tab ID
content = content.replace(
  `const [mobileTab, setMobileTab] = useState<'home' | 'schedule' | 'checkin' | 'salary' | 'swap' | 'school' | 'account'>('home');`,
  `const [mobileTab, setMobileTab] = useState<'home' | 'schedule' | 'checkin' | 'salary' | 'swap' | 'substitute_tab' | 'school' | 'account'>('home');`
);

// 5. Add substitute tab button to bottom navigation
content = content.replace(
  `                { id: 'salary', label: 'Lương', icon: DollarSign },
                { id: 'swap', label: 'Đơn Từ', icon: ArrowLeftRight },
                { id: 'school', label: 'Định Vị', icon: MapPin },`,
  `                { id: 'salary', label: 'Lương', icon: DollarSign },
                { id: 'swap', label: 'Đơn Từ', icon: ArrowLeftRight },
                { id: 'substitute_tab', label: 'Dạy Dùm', icon: CalendarPlus },
                { id: 'school', label: 'Định Vị', icon: MapPin },`
);

// We need CalendarPlus icon from lucide-react. Let's see if it's imported.
content = content.replace(
  `import { User, ShieldAlert, LogOut, CheckCircle2, Navigation2, Camera, QrCode, Video, Image as ImageIcon, RotateCcw, AlertTriangle, AlertCircle, X, Check, Save, Plus, ArrowLeftRight, Clock, UserCheck, CheckSquare, Settings, DollarSign, Calendar, RefreshCcw, Bell, EyeOff, MapPin, Download, Lock, CheckCircle, Navigation, Shield, UserCog, Mail, Phone, LockIcon, Key, Fingerprint, SmartPhone as Smartphone } from 'lucide-react';`,
  `import { User, ShieldAlert, LogOut, CheckCircle2, Navigation2, Camera, QrCode, Video, Image as ImageIcon, RotateCcw, AlertTriangle, AlertCircle, X, Check, Save, Plus, ArrowLeftRight, Clock, UserCheck, CheckSquare, Settings, DollarSign, Calendar, CalendarPlus, RefreshCcw, Bell, EyeOff, MapPin, Download, Lock, CheckCircle, Navigation, Shield, UserCog, Mail, Phone, LockIcon, Key, Fingerprint, SmartPhone as Smartphone } from 'lucide-react';`
);

// 6. Generate the content for substitute_tab (Dạy Dùm)
const substituteTabHTML = `            {/* TAB: DAY DUM (SUBSTITUTE SHIFTS) */}
            {mobileTab === 'substitute_tab' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <h3 className="font-bold text-sm border-b pb-2">Lịch Dạy Dùm Được Phân Công</h3>
                <p className="text-[11px] text-slate-500">Danh sách các ca bạn được phân công dạy thay. Hãy chú ý thời gian và địa điểm.</p>
                
                <div className="space-y-4 mt-4">
                  {changes.filter(c => c.targetTeacherId === currentTeacher.id && c.status === 'approved' && c.requestType === 'substitute_teacher').length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">Chưa có lịch dạy dùm nào được phân công.</p>
                  ) : (
                    changes.filter(c => c.targetTeacherId === currentTeacher.id && c.status === 'approved' && c.requestType === 'substitute_teacher').map(c => {
                      // Find the original schedule from the original teacher
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

                      return (
                        <div key={c.id} className="space-y-3">
                          {originalSchedules.map(originalSchedule => {
                            const schSchool = schools.find(sch => sch.id === originalSchedule.schoolId);
                            const schClass = classes.find(cl => cl.id === originalSchedule.classId);
                            const origTeacher = allowedTeachers.find(t => t.id === c.originalTeacherId) || { name: 'Giáo viên gốc' };
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
                                  <p><span className="font-semibold text-slate-500">Người liên hệ:</span> {schSchool?.contactPerson}</p>
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
                                      setEditingScheduleItem(originalSchedule);
                                      setCheckinDate(c.date);
                                      setCheckinSession(c.session);
                                      setMobileTab('checkin');
                                      setReqStatusMessage('');
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-center transition flex items-center justify-center gap-1 shadow-sm"
                                  >
                                    <Camera className="w-3.5 h-3.5" /> Chấm công dạy thay
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

content = content.replace(
  `            {/* TAB: SALARY SLIP (BẢNG LƯƠNG CHI TIẾT TẠM TÍNH) */}`,
  substituteTabHTML
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx with new substitute tab and logic!');
