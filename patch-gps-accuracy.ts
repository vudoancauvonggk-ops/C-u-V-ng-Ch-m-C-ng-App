import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement1 = `                              {true && (
                                <button
                                    type="button"
                                    onClick={() => {
                                      if (navigator.geolocation) {
                                         alert('Đang lấy định vị thực tế của bạn. Vui lòng chờ...');
                                         navigator.geolocation.getCurrentPosition(pos => {
                                            const isAccurate = pos.coords.accuracy <= 500;
                                            const accuracyMsg = isAccurate ? \`Độ chính xác: \${Math.round(pos.coords.accuracy)} mét (Tốt)\` : \`CẢNH BÁO: Độ chính xác kém (\${Math.round(pos.coords.accuracy)} mét). Vị trí có thể bị lệch do dùng mạng IP thay vì GPS.\`;
                                            
                                            if (window.confirm(\`Đã tìm thấy toạ độ GPS của bạn.\\n\\n\${accuracyMsg}\\n\\nVĩ độ: \${pos.coords.latitude}\\nKinh độ: \${pos.coords.longitude}\\n\\nXác nhận ghim toạ độ này cho trường \${targetSchool.name}?\`)) {
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
                                         }, err => alert('Lỗi lấy định vị: ' + err.message), { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 });
                                      } else {
                                        alert('Trình duyệt không hỗ trợ GPS');
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[9px] hover:bg-emerald-700 transition self-end whitespace-nowrap"
                                >
                                    CẬP NHẬT GPS HIỆN TẠI CHO TRƯỜNG
                                </button>
                              )}`;

content = content.replace(/\{true && \([\s\S]*?CẬP NHẬT GPS HIỆN TẠI CHO TRƯỜNG[\s\S]*?<\/button>\s*\n\s*\)\}/, replacement1);

const replacement2 = `                           if (navigator.geolocation) {
                              setUpdatingGpsSchoolId('edit');
                              setGpsMessage(null);
                              navigator.geolocation.getCurrentPosition((pos) => {
                                 setEditSchoolData({...editSchoolData, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                 setUpdatingGpsSchoolId(null);
                                 const acc = Math.round(pos.coords.accuracy);
                                 if (acc > 500) {
                                   setGpsMessage({type: 'error', text: \`Lấy được toạ độ nhưng độ chính xác kém (\${acc}m). Vị trí có thể bị lệch, hãy bật GPS/Vị trí chính xác trên điện thoại.\`});
                                 } else {
                                   setGpsMessage({type: 'success', text: \`Lấy toạ độ thành công! (Chính xác \${acc}m)\`});
                                 }
                              }, (err) => {
                                 setUpdatingGpsSchoolId(null);
                                 setGpsMessage({type: 'error', text: 'Lỗi lấy GPS: ' + err.message + '. Vui lòng kiểm tra quyền vị trí trên máy!'});
                              }, { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 });
                           }`;

content = content.replace(/if \(navigator\.geolocation\) \{\s*setUpdatingGpsSchoolId\('edit'\);\s*setGpsMessage\(null\);\s*navigator\.geolocation\.getCurrentPosition\(\(pos\) => \{\s*setEditSchoolData\(\{\.\.\.editSchoolData, lat: pos\.coords\.latitude, lng: pos\.coords\.longitude\}\);\s*setUpdatingGpsSchoolId\(null\);\s*setGpsMessage\(\{type: 'success', text: 'Lấy toạ độ thành công!'\}\);\s*\}, \(err\) => \{\s*setUpdatingGpsSchoolId\(null\);\s*setGpsMessage\(\{type: 'error', text: 'Lỗi lấy GPS: ' \+ err\.message \+ '\. Vui lòng kiểm tra quyền vị trí trên máy!'\}\);\s*\}, \{ enableHighAccuracy: true, timeout: 60000, maximumAge: 0 \}\);\s*\}/, replacement2);


const replacement3 = `                              if (navigator.geolocation) {
                                setUpdatingGpsSchoolId(sch.id);
                                setGpsMessage(null);
                                navigator.geolocation.getCurrentPosition((pos) => {
                                  const updatedSchools = schools.map(s => s.id === sch.id ? { ...s, lat: pos.coords.latitude, lng: pos.coords.longitude } : s);
                                  if (!schools.find(s => s.id === sch.id)) {
                                    updatedSchools.push({...sch, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                  }
                                  onUpdateSchools(updatedSchools);
                                  setUpdatingGpsSchoolId(null);
                                  const acc = Math.round(pos.coords.accuracy);
                                  if (acc > 500) {
                                    setGpsMessage({type: 'error', text: \`Cảnh báo: Đã ghim nhưng sai số cao (\${acc}m). Hãy bật GPS chính xác trên điện thoại.\`});
                                  } else {
                                    setGpsMessage({type: 'success', text: \`Đã ghim GPS thành công cho trường \${sch.name} (\${acc}m)\`});
                                  }
                                }, (err) => {
                                  setUpdatingGpsSchoolId(null);
                                  setGpsMessage({type: 'error', text: 'Lỗi GPS: ' + err.message + '. Hãy kiểm tra quyền định vị trình duyệt.'});
                                }, { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 });
                              }`;

content = content.replace(/if \(navigator\.geolocation\) \{\s*setUpdatingGpsSchoolId\(sch\.id\);\s*setGpsMessage\(null\);\s*navigator\.geolocation\.getCurrentPosition\(\(pos\) => \{\s*const updatedSchools = schools\.map\(s => s\.id === sch\.id \? \{ \.\.\.s, lat: pos\.coords\.latitude, lng: pos\.coords\.longitude \} : s\);\s*if \(!schools\.find\(s => s\.id === sch\.id\)\) \{\s*updatedSchools\.push\(\{\.\.\.sch, lat: pos\.coords\.latitude, lng: pos\.coords\.longitude\}\);\s*\}\s*onUpdateSchools\(updatedSchools\);\s*setUpdatingGpsSchoolId\(null\);\s*setGpsMessage\(\{type: 'success', text: `Đã ghim GPS thành công cho trường \$\{sch\.name\}`\}\);\s*\}, \(err\) => \{\s*setUpdatingGpsSchoolId\(null\);\s*setGpsMessage\(\{type: 'error', text: 'Lỗi GPS: ' \+ err\.message \+ '\. Hãy kiểm tra quyền định vị trình duyệt\.'\}\);\s*\}, \{ enableHighAccuracy: true, timeout: 60000, maximumAge: 0 \}\);\s*\}/, replacement3);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
