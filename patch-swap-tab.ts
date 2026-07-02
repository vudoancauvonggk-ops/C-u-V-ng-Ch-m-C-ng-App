import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const swapTabHTML = `            {/* TAB: REQUESTS (ĐƠN TỪ) */}
            {mobileTab === 'swap' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <h3 className="font-bold text-sm border-b pb-2">Gửi đơn từ / Xin phép</h3>
                <p className="text-[11px] text-slate-500">Gửi yêu cầu xin nghỉ, dạy thay, đổi ca hoặc báo cáo coi diễn văn nghệ.</p>

                {reqStatusMessage && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold text-center border border-emerald-100">
                    {reqStatusMessage}
                  </div>
                )}

                <form onSubmit={handleRequestShiftChange} className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Loại Đơn *</label>
                    <select 
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 font-medium text-slate-800"
                      value={reqType}
                      onChange={(e) => setReqType(e.target.value as any)}
                    >
                      <option value="sick_leave">Nghỉ ốm / Việc bận cá nhân (Mất chuyên cần)</option>
                      <option value="swap_shift">Đổi ca dạy với Giáo viên khác</option>
                      <option value="substitute_teacher">Dạy thay cho Giáo viên khác (55k/tiết)</option>
                      <option value="art_performance">Coi diễn văn nghệ (100k/trường, Giữ chuyên cần)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày Áp Dụng *</label>
                    <input 
                      type="date"
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      required
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Buổi / Ca *</label>
                    <select 
                      value={reqSession}
                      onChange={(e) => setReqSession(e.target.value)}
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50"
                    >
                      <option value="morning">Buổi Sáng</option>
                      <option value="afternoon">Buổi Chiều</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Lý do chi tiết * (Ghi rõ số lượng và tên trường nếu coi diễn)</label>
                    <textarea 
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                      placeholder="Trình bày lý do..."
                      rows={3}
                      required
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition"
                  >
                    Gửi Đơn Lên Quản Lý
                  </button>
                </form>

                <div className="mt-6 space-y-3">
                  <h4 className="font-bold text-xs text-slate-700 border-b pb-2">Lịch Sử Đơn Từ Của Bạn</h4>
                  {changes.filter(c => c.teacherId === currentTeacher.id).length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">Chưa có đơn nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {changes.filter(c => c.teacherId === currentTeacher.id).map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-blue-900 block">
                                {c.requestType === 'sick_leave' ? 'Nghỉ có phép' : 
                                 c.requestType === 'swap_shift' ? 'Đổi ca dạy' : 
                                 c.requestType === 'art_performance' ? 'Coi diễn văn nghệ' : 'Dạy thay'}
                              </span>
                              <span className="text-[10px] text-slate-500">{c.date} - {c.session === 'morning' ? 'Sáng' : 'Chiều'}</span>
                            </div>
                            <span className={\`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full \${
                              c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              c.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }\`}>
                              {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 mt-1">"{c.reason}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: SALARY SLIP (BẢNG LƯƠNG CHI TIẾT TẠM TÍNH) */}`;

content = content.replace(
  `            {/* TAB: SALARY SLIP (BẢNG LƯƠNG CHI TIẾT TẠM TÍNH) */}`,
  swapTabHTML
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx with swap tab!');
