import fs from 'fs';
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const regex = /\{\(\(\) => \{\s*const items: \{ schedules\?: any\[\], attendance\?: any \}\[\] = \[\];[\s\S]*?\}\)\(\)\}/g;
const match = content.match(regex);

if (match) {
  const replaceStr = `{(() => {
                                        const items: { schedules?: any[], attendanceGroup?: any[] }[] = [];
                                        
                                        const groupedSchedules: Record<string, any[]> = {};
                                        teacherSchedulesToday.forEach(sch => {
                                           const key = \`\${sch.session}_\${sch.schoolId}\`;
                                           if (!groupedSchedules[key]) groupedSchedules[key] = [];
                                           groupedSchedules[key].push(sch);
                                        });

                                        const groupedAttendance: Record<string, any[]> = {};
                                        teacherAttendanceToday.forEach(a => {
                                           const key = \`\${a.session}_\${a.schoolId}\`;
                                           if (!groupedAttendance[key]) groupedAttendance[key] = [];
                                           groupedAttendance[key].push(a);
                                        });
                                        
                                        Object.keys(groupedSchedules).forEach(key => {
                                           const schs = groupedSchedules[key];
                                           const atts = groupedAttendance[key] || [];
                                           if (atts.length > 0) {
                                             items.push({ schedules: schs, attendanceGroup: atts });
                                           } else {
                                             items.push({ schedules: schs });
                                           }
                                        });
                                        
                                        Object.keys(groupedAttendance).forEach(key => {
                                           if (!groupedSchedules[key]) {
                                             items.push({ attendanceGroup: groupedAttendance[key] });
                                           }
                                        });
                                        
                                        return items.map((item, idx) => {
                                          const schs = item.schedules;
                                          const atts = item.attendanceGroup;
                                          const firstSch = schs ? schs[0] : null;
                                          const firstAtt = atts ? atts[0] : null;
                                          
                                          // check if any of the grouped attendance logs is flagged
                                          const isFlagged = atts ? atts.some((a: any) => a.isFlagged) : false;
                                          
                                          return (
                                            <tr key={idx} className={\`\${isFlagged ? 'bg-red-50/50' : 'hover:bg-slate-50'}\`}>
                                              <td className="p-2 pl-4">
                                                <div className="font-bold text-slate-800 text-xs">Ca {getSessionShort(firstSch ? firstSch.session : firstAtt.session)}</div>
                                                {firstAtt && <div className="text-[10px] text-slate-500 font-mono">{firstAtt.checkInTime}</div>}
                                              </td>
                                              <td className="p-2">
                                                <div className="font-semibold text-slate-700 text-xs">{getSchoolName(firstSch ? firstSch.schoolId : firstAtt.schoolId, firstSch || firstAtt)}</div>
                                                {schs && schs.length > 0 && <div className="text-[10px] text-slate-500 max-w-[180px] whitespace-normal">Lớp: {schs.map((s:any) => \`\${getClassName(s.classId)} (\${s.periods} tiết)\`).join(', ')}</div>}
                                                {(!schs || schs.length === 0) && firstAtt && <div className="text-[10px] text-slate-500 max-w-[180px] whitespace-normal">Lớp: {atts?.map((a:any) => getClassName(a.classId)).join(', ')}</div>}
                                              </td>
                                              <td className="p-2 text-center">
                                                {firstAtt ? (
                                                  <div className="font-mono text-xs flex flex-col items-center">
                                                    <span className={\`font-bold \${firstAtt.distanceMeter > 100 ? 'text-red-600' : 'text-slate-700'}\`}>
                                                      {firstAtt.distanceMeter} mét
                                                    </span>
                                                  </div>
                                                ) : <span className="text-slate-400">-</span>}
                                              </td>
                                              <td className="p-2 text-center text-[10px] font-mono text-slate-600">
                                                {firstAtt ? firstAtt.verificationMethod : '-'}
                                              </td>
                                              <td className="p-2 text-center">
                                                {firstAtt?.selfieImage ? (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedSelfie({ 
                                                        teacherName: teacher.name, 
                                                        imgUrl: firstAtt.selfieImage, 
                                                        time: firstAtt.checkInTime, 
                                                        distance: firstAtt.distanceMeter, 
                                                        method: firstAtt.verificationMethod 
                                                      })
                                                    }}
                                                    className="inline-block relative overflow-hidden h-8 w-8 border border-slate-200 rounded bg-white cursor-pointer hover:scale-105"
                                                  >
                                                    <img src={firstAtt.selfieImage} alt="selfie" className="h-full w-full object-cover rounded" />
                                                  </button>
                                                ) : <span className="text-slate-400 text-[10px]">-</span>}
                                              </td>
                                              <td className="p-2 text-[10px] max-w-[200px] whitespace-normal">
                                                {!firstAtt ? (
                                                   <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Chưa điểm danh</span>
                                                ) : isFlagged ? (
                                                  <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded border border-red-200">{firstAtt.flagReason}</span>
                                                ) : (
                                                  <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Hợp lệ</span>
                                                )}
                                              </td>
                                              <td className="p-2 text-center pr-4">
                                                {firstAtt && (
                                                  <div className="flex items-center justify-center gap-2">
                                                    {atts?.every((a:any) => a.confirmedByAdmin) ? (
                                                      <span className="text-[9px] text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-full">
                                                        ĐÃ DUYỆT
                                                      </span>
                                                    ) : (
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); handleApproveAttendance(atts!.map((a:any) => a.id)); }}
                                                        className={\`text-[9px] font-bold px-2 py-1.5 rounded text-white transition \${isFlagged ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}\`}
                                                      >
                                                        Duyệt
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        });
                                      })()}`;
  content = content.replace(match[0], replaceStr);
  fs.writeFileSync('src/components/AdminDashboard.tsx', content);
  console.log("Patched successfully via regex");
} else {
  console.log("Regex did not match!");
}
