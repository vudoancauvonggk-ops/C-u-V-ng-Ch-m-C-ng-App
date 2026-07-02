import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement = `                              {true && (
                                <button
                                    type="button"
                                    onClick={() => {
                                      if (navigator.geolocation) {
                                         alert('Đang lấy định vị thực tế của bạn...');
                                         navigator.geolocation.getCurrentPosition(pos => {
                                            if (window.confirm(\`Đã tìm thấy toạ độ GPS của bạn.\n\nVĩ độ: \${pos.coords.latitude}\nKinh độ: \${pos.coords.longitude}\n\nXác nhận ghim toạ độ này cho trường \${targetSchool.name}?\`)) {
                                               const updatedSchools = schools.map(s => {
                                                 if (s.id === targetSchool.id) return { ...s, lat: pos.coords.latitude, lng: pos.coords.longitude };
                                                 return s;
                                               });
                                               if (!schools.find(s => s.id === targetSchool.id)) {
                                                 updatedSchools.push({...targetSchool, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                               }
                                               onUpdateSchools(updatedSchools);
                                               alert('Đã cập nhật toạ độ trường thành công!');
                                            }
                                         }, err => alert('Lỗi lấy định vị: ' + err.message), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                                      } else {
                                        alert('Trình duyệt không hỗ trợ GPS');
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[9px] hover:bg-emerald-700 transition self-end whitespace-nowrap"
                                >
                                    CẬP NHẬT GPS HIỆN TẠI CHO TRƯỜNG
                                </button>
                              )}`;

content = content.replace(/\{true && \([\s\S]*?LƯU ĐỊA ĐIỂM TRƯỜNG TRÊN GPS[\s\S]*?<\/button>\s*\n\s*\)\}/, replacement);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
