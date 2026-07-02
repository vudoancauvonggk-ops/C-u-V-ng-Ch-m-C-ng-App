import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// Modify the calculation in TeacherDashboard.tsx
content = content.replace(
  `  // Áp dụng Phụ cấp xăng xe (500k) và Phụ cấp chuyên cần (300k - mất nếu đã nghỉ/xin phép)
  const hasApprovedLeave = currentTeacher ? changes.some(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth)) : false;
  const currentAllowance = currentTeacher ? (currentTeacher.monthlyAllowance || 500000) : 0;
  const potentialBonus = currentTeacher ? (currentTeacher.bonus || 300000) : 0;
  const currentBonus = currentTeacher ? (hasApprovedLeave ? 0 : potentialBonus) : 0;

  const netEarnings = currentTeacher ? totalWagesEarned + currentAllowance + currentBonus - currentTeacher.deduction : 0;`,
  `  // Áp dụng Phụ cấp xăng xe (500k) và Phụ cấp chuyên cần (300k - mất nếu đã nghỉ/xin phép)
  const hasApprovedLeave = currentTeacher ? changes.some(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'sick_leave') : false;
  const artEvents = currentTeacher ? changes.filter(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance') : [];
  let artPerformanceBonus = 0;
  artEvents.forEach(c => {
    const match = c.reason.match(/\\[Số lượng: (\\d+)\\]/);
    if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
    else artPerformanceBonus += 100000;
  });

  const currentAllowance = currentTeacher ? (currentTeacher.monthlyAllowance || 500000) : 0;
  const potentialBonus = currentTeacher ? (currentTeacher.bonus || 300000) : 0;
  const currentBonus = currentTeacher ? (hasApprovedLeave ? 0 : potentialBonus) + artPerformanceBonus : 0;

  const netEarnings = currentTeacher ? totalWagesEarned + currentAllowance + currentBonus - currentTeacher.deduction : 0;`
);

// Update UI to display art_performance
content = content.replace(
  `                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Khuyến khích chuyên cần:</span>
                      <div className="text-right">
                        {currentBonus > 0 ? (
                            <span className="font-mono text-emerald-600">+{currentBonus.toLocaleString('vi-VN')} đ</span>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="font-mono text-red-500 line-through text-[10px]">{potentialBonus.toLocaleString('vi-VN')} đ</span>
                                <span className="text-[9px] text-red-500 italic">Mất chuyên cần do xin phép/nghỉ</span>
                            </div>
                        )}
                      </div>
                    </div>`,
  `                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Thưởng chuyên cần / Văn nghệ:</span>
                      <div className="text-right flex flex-col items-end">
                        {hasApprovedLeave ? (
                          <span className="font-mono text-red-500 line-through text-[10px]">{potentialBonus.toLocaleString('vi-VN')} đ</span>
                        ) : (
                          <span className="font-mono text-emerald-600 text-xs">+{potentialBonus.toLocaleString('vi-VN')} đ</span>
                        )}
                        {artPerformanceBonus > 0 && (
                          <span className="font-mono text-blue-600 text-xs mt-0.5">+{artPerformanceBonus.toLocaleString('vi-VN')} đ (Văn nghệ)</span>
                        )}
                        {hasApprovedLeave && (
                          <span className="text-[9px] text-red-500 italic mt-0.5">Mất C.Cần do xin phép/nghỉ</span>
                        )}
                      </div>
                    </div>`
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx salary slip calculation!');
