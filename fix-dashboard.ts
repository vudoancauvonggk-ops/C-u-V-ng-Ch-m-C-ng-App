import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement = `
                        {todaySchedules.length === 0 && (
                          <div className="text-center py-6 text-neutral-450 border border-wrap border-neutral-100 rounded-3xl p-4">
                            <p className="text-xs text-neutral-400">Bạn chưa có lịch dạy nào trong hôm nay. Nghỉ ngơi nhé!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RECENT CHECKINS LOGGER */}
                    <div className="bg-slate-55 p-4 rounded-3xl border border-blue-100 space-y-2.5 bg-blue-50/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-extrabold text-blue-800 flex items-center gap-1">
                          NHẬT KÝ ĐIỂM DANH HÔM NAY
                        </span>
                      </div>
                      
                      {attendance.filter(a => a.teacherId === currentTeacher.id && a.date === todayStr).length === 0 ? (
                         <div className="text-[10px] text-blue-600/60 font-medium">Chưa có lượt điểm danh nào được ghi nhận.</div>
                      ) : (
                         <div className="space-y-1.5">
                            {attendance.filter(a => a.teacherId === currentTeacher.id && a.date === todayStr).map((att, i) => (
                              <div key={i} className="flex justify-between items-center text-[10px] bg-white p-2 rounded-xl border border-blue-50">
                                <div>
                                  <span className="font-bold text-slate-800">{getSchoolName(att.schoolId)}</span>
                                  <span className="text-slate-500 block">Lớp: {getClassName(att.classId)} ({att.periods} tiết)</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-600">{att.checkInTime}</span>
                              </div>
                            ))}
                         </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                       <h3 className="font-bold text-sm text-slate-800">Lịch sử điểm danh</h3>
                       <button 
                         onClick={() => setShowMakeupForm(!showMakeupForm)}
                         className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                       >
                         {showMakeupForm ? 'Hủy' : '+ Đơn Điểm Danh Bù'}
                       </button>
                    </div>

                    {showMakeupForm && (
                      <form onSubmit={handleMakeupSubmit} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Ngày dạy bù</label>
                          <input type="date" value={makeupDate} onChange={e => setMakeupDate(e.target.value)} required className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Chọn lịch</label>
                          <select value={makeupScheduleId} onChange={e => setMakeupScheduleId(e.target.value)} required className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white">
                             <option value="">-- Chọn lịch --</option>
                             {schedules.filter(s => s.teacherId === currentTeacher.id).map(s => (
                               <option key={s.id} value={s.id}>{getSchoolName(s.schoolId)} - Lớp {getClassName(s.classId)}</option>
                             ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Lý do</label>
                          <input type="text" value={makeupReason} onChange={e => setMakeupReason(e.target.value)} required placeholder="VD: Quên điện thoại, lỗi mạng..." className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white" />
                        </div>
                        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition shadow-sm">Gửi Đơn Xin Chấm Bù</button>
                      </form>
                    )}

                    <div className="flex gap-2">
                      <select value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs">
                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>Tháng {m}</option>)}
                      </select>
                      <select value={historyYear} onChange={e => setHistoryYear(e.target.value)} className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs">
                        {['2024','2025','2026'].map(y => <option key={y} value={y}>Năm {y}</option>)}
                      </select>
                    </div>
`;

const checkInTabStart = `
            {/* TAB: SMARTPHONE LIVE CHECK-IN (GPS / CAMERA / QR SCAN) */}
            {mobileTab === 'checkin' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm">Chấm Công Trực Tuyến</h3>
                  <button onClick={() => setMobileTab('home')} className="text-neutral-500 font-bold">Quay Lại</button>
                </div>

                <form onSubmit={handleCheckInNow} className="space-y-4">
                    
                    {/* Select Schedule subform */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-neutral-500 block">Lớp mở màn ca dạy hôm nay:</label>
                      <div className="text-[10px] text-emerald-600 font-semibold mb-1 italic">
                        * Mẹo: Chấm công lớp này sẽ tự động ghi nhận cho toàn bộ các lớp khác trong cùng ca. Bỏ qua nếu đã chấm!
                      </div>
                      <select
                        value={selectedScheduleId}
                        onChange={e => setSelectedScheduleId(e.target.value)}
                        className="w-full p-2 border border-neutral-200 rounded-xl bg-white text-xs text-neutral-800"
                      >
                        <option value="">-- Chọn Ca Lịch Dạy Hôm Nay --</option>
                        {todaySchedules.map(sc => (
                          <option key={sc.id} value={sc.id}>
                            {getSessionShort(sc.session)} - Lớp {getClassName(sc.classId)} 
                            {(sc as any).isSubstitute && ' (DẠY THẾ)'}
                          </option>
                        ))}
                      </select>
`;

const parts = content.split('                      </select>\n                    </div>\n\n                    <div className="space-y-2.5">');

content = parts[0] + replacement + '                    <div className="space-y-2.5">' + parts[1].replace(/<\/div>\n                  <\/div>\n                \)}/, '</div>\n                  </div>\n                )}\n              </div>\n            )}\n\n' + checkInTabStart + '                    </div>\n');

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Fixed dashboard truly!');
