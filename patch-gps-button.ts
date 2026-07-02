import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// Inject loading state
const stateInjection = `  const [editingSchool, setEditingSchool] = useState<string | null | undefined>(undefined);
  const [editSchoolData, setEditSchoolData] = useState<any>({});
  const [updatingGpsSchoolId, setUpdatingGpsSchoolId] = useState<string | null>(null);
  const [gpsMessage, setGpsMessage] = useState<{type: 'error'|'success', text: string} | null>(null);`;

content = content.replace(/const \[editingSchool, setEditingSchool\] = useState<string \| null \| undefined>\(undefined\);\n  const \[editSchoolData, setEditSchoolData\] = useState<any>\(\{\}\);/g, stateInjection);


const schoolsTabReplacement = `
            {mobileTab === 'school' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold">Quản lý Định vị Trường</h3>
                  <button onClick={() => setEditingSchool(null)} className="text-emerald-600 text-xs font-bold">+ THÊM TRƯỜNG</button>
                </div>
                
                <p className="text-[11px] text-neutral-500 mb-4">
                  Cập nhật định vị chính xác theo thời gian thực để hỗ trợ chấm công bằng GPS. Các thay đổi sẽ được đồng bộ lên Admin.
                </p>

                {gpsMessage && (
                  <div className={\`p-3 rounded-xl text-xs font-bold flex justify-between items-center \${gpsMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}\`}>
                    {gpsMessage.text}
                    <button onClick={() => setGpsMessage(null)} className="ml-2 underline opacity-80">Đóng</button>
                  </div>
                )}

                {editingSchool !== undefined ? (
                  <form onSubmit={handleSaveSchoolEdit} className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <h4 className="font-bold text-slate-800 text-sm mb-3">
                      {editingSchool ? 'Chỉnh sửa trường học' : 'Thêm trường mới'}
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Tên Trường / Điểm Trường</label>
                      <input 
                        type="text" 
                        value={editSchoolData.name || ''} 
                        onChange={e => setEditSchoolData({...editSchoolData, name: e.target.value})}
                        required
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
                        placeholder="VD: THPT Lê Hồng Phong"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Địa chỉ</label>
                      <input 
                        type="text" 
                        value={editSchoolData.address || ''} 
                        onChange={e => setEditSchoolData({...editSchoolData, address: e.target.value})}
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
                        placeholder="Số nhà, Tên đường..."
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                       <label className="text-xs font-bold text-slate-700 block">Định vị GPS</label>
                       <div className="flex gap-2 items-center">
                          <input type="number" readOnly value={editSchoolData.lat || 0} className="w-1/2 p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500" placeholder="Vĩ độ" />
                          <input type="number" readOnly value={editSchoolData.lng || 0} className="w-1/2 p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500" placeholder="Kinh độ" />
                       </div>
                       <button 
                         type="button"
                         disabled={updatingGpsSchoolId === 'edit'}
                         onClick={() => {
                           if (navigator.geolocation) {
                              setUpdatingGpsSchoolId('edit');
                              setGpsMessage(null);
                              navigator.geolocation.getCurrentPosition((pos) => {
                                 setEditSchoolData({...editSchoolData, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                 setUpdatingGpsSchoolId(null);
                                 setGpsMessage({type: 'success', text: 'Lấy toạ độ thành công!'});
                              }, (err) => {
                                 setUpdatingGpsSchoolId(null);
                                 setGpsMessage({type: 'error', text: 'Lỗi lấy GPS: ' + err.message + '. Vui lòng kiểm tra quyền vị trí trên máy!'});
                              }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                           } else {
                              setGpsMessage({type: 'error', text: 'Trình duyệt không hỗ trợ GPS'});
                           }
                         }}
                         className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold mt-2 flex justify-center items-center gap-1.5 disabled:opacity-50"
                       >
                         <MapPin className="w-3.5 h-3.5" /> 
                         {updatingGpsSchoolId === 'edit' ? 'ĐANG LẤY TOẠ ĐỘ...' : 'GẮN VỊ TRÍ HIỆN TẠI'}
                       </button>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setEditingSchool(undefined)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs">Huỷ</button>
                      <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">Lưu Thay Đổi</button>
                    </div>
                  </form>
                ) : (
                <div className="space-y-4">
                  {Array.from(new Set(activeSchedules.map(s => s.schoolId))).map(schoolId => {
                    const sch = schools.find(s => s.id === schoolId) || { id: schoolId, name: schoolId, address: 'Chưa cập nhật địa chỉ', lat: 0, lng: 0 };
                    return (
                      <div key={sch.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Building className="w-4 h-4 text-emerald-600"/> {sch.name}</h4>
                           <button 
                             onClick={() => {
                               setEditingSchool(sch.id);
                               setEditSchoolData(sch);
                             }}
                             className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200"
                           >Sửa</button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5 leading-relaxed">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0"/> {sch.address || 'Chưa cập nhật địa chỉ'}
                        </p>
                        
                        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100 flex items-center justify-between">
                          <div className="text-[10px] text-slate-500">
                            <strong>Toạ độ GPS hiện tại:</strong><br/>
                            {sch.lat !== 0 && sch.lng !== 0 ? (
                              <span className="text-emerald-600 font-mono">{sch.lat.toFixed(5)}, {sch.lng.toFixed(5)}</span>
                            ) : (
                              <span className="text-rose-500">Chưa được thiết lập</span>
                            )}
                          </div>
                          {sch.lat !== 0 && (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <a 
                            href={sch.lat && sch.lng && sch.lat !== 0 && sch.lng !== 0 
                                  ? \`https://www.google.com/maps/search/?api=1&query=\${sch.lat},\${sch.lng}\`
                                  : \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(sch.address || sch.name)}\`} 
                            target="_blank" rel="noreferrer"
                            className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold rounded-xl text-center transition inline-block"
                          >
                            TÌM ĐƯỜNG MÁP
                          </a>
                          <button 
                            disabled={updatingGpsSchoolId === sch.id}
                            onClick={() => {
                              if (navigator.geolocation) {
                                setUpdatingGpsSchoolId(sch.id);
                                setGpsMessage(null);
                                navigator.geolocation.getCurrentPosition((pos) => {
                                  const updatedSchools = schools.map(s => s.id === sch.id ? { ...s, lat: pos.coords.latitude, lng: pos.coords.longitude } : s);
                                  if (!schools.find(s => s.id === sch.id)) {
                                    updatedSchools.push({...sch, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                  }
                                  onUpdateSchools(updatedSchools);
                                  setUpdatingGpsSchoolId(null);
                                  setGpsMessage({type: 'success', text: \`Đã ghim GPS thành công cho trường \${sch.name}\`});
                                }, (err) => {
                                  setUpdatingGpsSchoolId(null);
                                  setGpsMessage({type: 'error', text: 'Lỗi GPS: ' + err.message + '. Hãy kiểm tra quyền định vị trình duyệt.'});
                                }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                              } else {
                                setGpsMessage({type: 'error', text: 'Trình duyệt không hỗ trợ GPS'});
                              }
                            }}
                            className={\`flex-1 py-2 text-white text-[10px] font-bold rounded-xl text-center transition shadow \${updatingGpsSchoolId === sch.id ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}\`}
                          >
                            {updatingGpsSchoolId === sch.id ? 'ĐANG LẤY...' : 'LƯU ĐỊA ĐIỂM GPS'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}
`;

content = content.replace(/\{mobileTab === 'school' && \([\s\S]*?<\/div>\s*\n\s*\)\}/, schoolsTabReplacement.trim());

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
