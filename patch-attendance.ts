import fs from 'fs';
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const newAttendanceTab = `        {activeTab === 'attendance' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="attendance_tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Phê Duyệt Lịch Trình Chấm Công Chuyên Cần</h3>
                <p className="text-xs text-slate-500">Giám sát điểm danh theo ngày, kiểm tra sai số định vị GPS, check-in QR Code, và ảnh selfie.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-bold text-slate-600">CHỌN NGÀY:</span>
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      setExpandedAttendanceTeacher(null);
                    }}
                    className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-sans">Locals:</span>
                  <span className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-md border border-red-100 font-bold font-mono">
                    {flaggedCount} PHÁT HIỆN GIAN LẬN
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                    <th className="p-3 w-1/4">Giáo Viên</th>
                    <th className="p-3 w-1/4">Trạng Thái Ngày</th>
                    <th className="p-3">Số Lịch Phân Công</th>
                    <th className="p-3 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {teachers.filter(t => !t.isDeleted).map(teacher => {
                    // Check schedules for this day
                    const dayOfWeekMap = [8, 2, 3, 4, 5, 6, 7]; // 0=Sunday->8, 1=Monday->2
                    const dateObj = new Date(attendanceDate);
                    const dayOfWeek = dayOfWeekMap[dateObj.getDay()];
                    
                    const teacherSchedulesToday = schedules.filter(s => !s.isDeleted && s.teacherId === teacher.id && s.dayOfWeek === dayOfWeek);
                    const teacherAttendanceToday = attendance.filter(a => a.teacherId === teacher.id && a.date === attendanceDate);
                    
                    let statusColor = 'bg-slate-50 text-slate-600 border-slate-200';
                    let statusText = 'KHÔNG CÓ LỊCH DẠY';
                    
                    if (teacherAttendanceToday.length > 0) {
                      if (teacherAttendanceToday.some(a => a.isFlagged)) {
                         statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                         statusText = 'CẦN RÀ SOÁT LẠI (CÓ GIAN LẬN/SAI LỆCH)';
                      } else {
                         statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                         statusText = 'ĐÃ ĐIỂM DANH AN TOÀN';
                      }
                    } else if (teacherSchedulesToday.length > 0) {
                       statusColor = 'bg-red-50 text-red-600 border-red-200';
                       statusText = 'VẮNG MẶT / CHƯA ĐIỂM DANH';
                    }
                    
                    const isExpanded = expandedAttendanceTeacher === teacher.id;

                    return (
                      <React.Fragment key={teacher.id}>
                        <tr 
                          onClick={() => setExpandedAttendanceTeacher(isExpanded ? null : teacher.id)}
                          className={\`cursor-pointer transition hover:bg-slate-50/80 \${isExpanded ? 'bg-slate-50/50' : ''}\`}
                        >
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{teacher.name}</span>
                          </td>
                          <td className="p-3">
                            <span className={\`text-[10px] px-2.5 py-1 rounded border font-bold font-mono \${statusColor}\`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-slate-600 font-mono">{teacherSchedulesToday.length} Lịch phân công</span>
                          </td>
                          <td className="p-3 text-right">
                            <button className="text-xs text-blue-600 font-bold hover:underline">
                              {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                            </button>
                          </td>
                        </tr>
                        
                        {isExpanded && (
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <td colSpan={4} className="p-0">
                              <div className="p-4 border-l-4 border-blue-500 m-3 bg-white rounded-lg shadow-sm">
                                <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" /> 
                                  Chi tiết chấm công ngày {attendanceDate}
                                </h4>
                                
                                {teacherSchedulesToday.length === 0 && teacherAttendanceToday.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic">Không có dữ liệu lịch dạy hoặc điểm danh trong ngày này.</p>
                                ) : (
                                  <table className="w-full border-collapse text-left text-sm whitespace-nowrap mt-2 bg-white shadow-sm border border-slate-100 rounded-lg overflow-hidden">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-semibold">
                                        <th className="p-2 pl-4">Ca / Thời Gian</th>
                                        <th className="p-2">Trường / Lớp</th>
                                        <th className="p-2 text-center">Bán Kính</th>
                                        <th className="p-2 text-center">Phương Thức</th>
                                        <th className="p-2 text-center">Selfie</th>
                                        <th className="p-2">AI / Trạng Thái</th>
                                        <th className="p-2 text-center pr-4">Thao Tác</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(() => {
                                        const items: { schedule?: any, attendance?: any }[] = [];
                                        
                                        teacherSchedulesToday.forEach(sch => {
                                           const attsForSch = teacherAttendanceToday.filter(a => a.session === sch.session && a.schoolId === sch.schoolId);
                                           if (attsForSch.length > 0) {
                                             attsForSch.forEach(a => items.push({ schedule: sch, attendance: a }));
                                           } else {
                                             items.push({ schedule: sch });
                                           }
                                        });
                                        
                                        teacherAttendanceToday.forEach(a => {
                                           if (!items.find(i => i.attendance && i.attendance.id === a.id)) {
                                              items.push({ attendance: a });
                                           }
                                        });
                                        
                                        return items.map((item, idx) => {
                                          const sch = item.schedule;
                                          const att = item.attendance;
                                          
                                          return (
                                            <tr key={idx} className={\`\${att && att.isFlagged ? 'bg-red-50/50' : 'hover:bg-slate-50'}\`}>
                                              <td className="p-2 pl-4">
                                                <div className="font-bold text-slate-800 text-xs">Ca {getSessionShort(sch ? sch.session : att.session)}</div>
                                                {att && <div className="text-[10px] text-slate-500 font-mono">{att.checkInTime}</div>}
                                              </td>
                                              <td className="p-2">
                                                <div className="font-semibold text-slate-700 text-xs">{getSchoolName(sch ? sch.schoolId : att.schoolId)}</div>
                                                {sch && <div className="text-[10px] text-slate-500">Lớp: {getClassName(sch.classId)} ({sch.periods} tiết)</div>}
                                              </td>
                                              <td className="p-2 text-center">
                                                {att ? (
                                                  <div className="font-mono text-xs flex flex-col items-center">
                                                    <span className={\`font-bold \${att.distanceMeter > 100 ? 'text-red-600' : 'text-slate-700'}\`}>
                                                      {att.distanceMeter} mét
                                                    </span>
                                                  </div>
                                                ) : <span className="text-slate-400">-</span>}
                                              </td>
                                              <td className="p-2 text-center text-[10px] font-mono text-slate-600">
                                                {att ? att.verificationMethod : '-'}
                                              </td>
                                              <td className="p-2 text-center">
                                                {att?.selfieImage ? (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedSelfie({ 
                                                        teacherName: teacher.name, 
                                                        imgUrl: att.selfieImage, 
                                                        time: att.checkInTime, 
                                                        distance: att.distanceMeter, 
                                                        method: att.verificationMethod 
                                                      })
                                                    }}
                                                    className="inline-block relative overflow-hidden h-8 w-8 border border-slate-200 rounded bg-white cursor-pointer hover:scale-105"
                                                  >
                                                    <img src={att.selfieImage} alt="selfie" className="h-full w-full object-cover rounded" />
                                                  </button>
                                                ) : <span className="text-slate-400 text-[10px]">-</span>}
                                              </td>
                                              <td className="p-2 text-[10px] max-w-[200px] whitespace-normal">
                                                {!att ? (
                                                   <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Chưa điểm danh</span>
                                                ) : att.flagReason ? (
                                                  <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded border border-red-200">{att.flagReason}</span>
                                                ) : (
                                                  <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Hợp lệ</span>
                                                )}
                                              </td>
                                              <td className="p-2 text-center pr-4">
                                                {att && (
                                                  <div className="flex items-center justify-center gap-2">
                                                    {att.confirmedByAdmin ? (
                                                      <span className="text-[9px] text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-full">
                                                        ĐÃ DUYỆT
                                                      </span>
                                                    ) : (
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); handleApproveAttendance(att.id); }}
                                                        className={\`text-[9px] font-bold px-2 py-1.5 rounded text-white transition \${att.isFlagged ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}\`}
                                                      >
                                                        Duyệt
                                                      </button>
                                                    )}
                                                    {(currentUser?.role === 'admin' || hasPermission('can_approve_attendance')) && (
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          customConfirm('Xóa Chấm Công?', 'Xóa bản ghi này?', () => {
                                                            onUpdateAttendance(attendance.filter(a => a.id !== att.id));
                                                          });
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 p-1"
                                                      ><Trash2 className="w-3.5 h-3.5" /></button>
                                                    )}
                                                  </div>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })
                                      })()}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------TAB 6: SHIFT EXCHANGE COWORKERS ---------------- */}`;

content = content.replace(/\{activeTab === 'attendance' && \([\s\S]*?id="attendance_tab"[\s\S]*?\{\/\* ----------------TAB 6: SHIFT EXCHANGE COWORKERS ---------------- \*\/\}/g, newAttendanceTab);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
