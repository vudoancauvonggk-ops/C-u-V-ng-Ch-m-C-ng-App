const fs = require('fs');

let c = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const hooksInjection = `
  const [schoolOrder, setSchoolOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('etms_school_order_v1') || '[]'); } catch { return []; }
  });
  const [userOrder, setUserOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('etms_user_order_v1') || '[]'); } catch { return []; }
  });

  const handleSchoolDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeSchool = schools.find((s: any) => s.id === active.id);
      if (!activeSchool) return;
      const ordered = [...schools].sort((a: any, b: any) => {
        const iA = schoolOrder.indexOf(a.id);
        const iB = schoolOrder.indexOf(b.id);
        if (iA === -1 && iB === -1) return 0;
        if (iA === -1) return 1;
        if (iB === -1) return -1;
        return iA - iB;
      });
      const oldIndex = ordered.findIndex((s: any) => s.id === active.id);
      const newIndex = ordered.findIndex((s: any) => s.id === over.id);
      const newOrdered = arrayMove(ordered, oldIndex, newIndex);
      const newIds = newOrdered.map((s: any) => s.id);
      setSchoolOrder(newIds);
      localStorage.setItem('etms_school_order_v1', JSON.stringify(newIds));
    }
  };

  const handleUserDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeUser = users.find((u: any) => u.id === active.id);
      if (!activeUser) return;
      const ordered = [...users].sort((a: any, b: any) => {
        const iA = userOrder.indexOf(a.id);
        const iB = userOrder.indexOf(b.id);
        if (iA === -1 && iB === -1) return 0;
        if (iA === -1) return 1;
        if (iB === -1) return -1;
        return iA - iB;
      });
      const oldIndex = ordered.findIndex((u: any) => u.id === active.id);
      const newIndex = ordered.findIndex((u: any) => u.id === over.id);
      const newOrdered = arrayMove(ordered, oldIndex, newIndex);
      const newIds = newOrdered.map((u: any) => u.id);
      setUserOrder(newIds);
      localStorage.setItem('etms_user_order_v1', JSON.stringify(newIds));
    }
  };
`;

if (!c.includes('const [schoolOrder')) {
  c = c.replace("const [teacherOrder, setTeacherOrder] = React.useState<string[]>", hooksInjection + "\n  const [teacherOrder, setTeacherOrder] = React.useState<string[]>");
}

const sortableSchoolComponent = `
const SortableSchoolRow = ({ sch, schClasses, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sch.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <div ref={setNodeRef} style={style} className="pt-3 flex items-start justify-between gap-4 relative group">
      <button {...attributes} {...listeners} className="absolute -left-6 top-4 opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-sm">{sch.name}</h4>
        <p className="text-xs text-slate-500 font-sans">{sch.address}</p>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-mono">Quản lý: <b>{sch.contactPerson} ({sch.phone})</b></span>
          <span className="bg-blue-50 text-blue-700 border border-blue-50 px-1.5 py-0.2 rounded font-mono">GPS: <b>{sch.lat.toFixed(4)}, {sch.lng.toFixed(4)}</b></span>
          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold max-w-sm truncate inline-block align-bottom" title={schClasses.map((c: any) => c.name).join(', ')}>
            Lớp học: {schClasses.length > 0 ? (schClasses.length > 5 ? schClasses.slice(0, 5).map((c: any) => c.name).join(', ') + '... (+' + (schClasses.length - 5) + ' lớp)' : schClasses.map((c: any) => c.name).join(', ')) : 'Chưa phân lớp'}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button onClick={() => { const mapLink = \`https://www.google.com/maps/search/?api=1&query=\${sch.lat},\${sch.lng}\`; navigator.clipboard.writeText(\`Định vị trường \${sch.name}:\\n\${mapLink}\`); alert('Đã copy link bản đồ vào bộ nhớ đệm!'); }} className="flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-100 font-bold" title="Chia sẻ link Google Maps">
          <MapPin className="h-3 w-3" /> Bản Đồ
        </button>
        <div className="flex items-center gap-1 mt-1">
          <button onClick={() => onEdit(sch)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="Sửa thông tin">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(sch.id, sch.name)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition" title="Xóa trường học">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
`;

const sortableReportComponent = `
const SortableReportRow = ({ teacher, totalPeriods, formatVND, baseLessonsSalary, allowance, hasApprovedLeave, attendanceBonus, finalWage }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: teacher.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition relative">
      <td className="p-3 font-mono font-bold text-slate-700 flex items-center gap-2">
        <button {...attributes} {...listeners} className="text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {teacher.id}
      </td>
      <td className="p-3 font-semibold text-slate-900">{teacher.name}</td>
      <td className="p-3 text-center font-mono font-bold text-blue-600">{totalPeriods} tiết</td>
      <td className="p-3 text-right font-mono">{formatVND(teacher.hourlyRate)}</td>
      <td className="p-3 text-right font-mono text-slate-600 font-medium">{formatVND(baseLessonsSalary)}</td>
      <td className="p-3 text-right font-mono text-slate-600">
        {formatVND(allowance)} {hasApprovedLeave && <span className="block text-[9px] text-orange-500 italic">Xăng xe</span>}
      </td>
      <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
        +{formatVND(attendanceBonus)}
        {hasApprovedLeave && <span className="block text-[9px] font-sans font-normal text-slate-400">Có đơn xin nghỉ</span>}
      </td>
      <td className="p-3 text-right font-mono text-red-600 font-semibold">-{formatVND(teacher.deduction)}</td>
      <td className="p-3 text-right font-mono font-bold text-slate-950 text-base">{formatVND(finalWage)}</td>
    </tr>
  );
};
`;

const sortableUserComponent = `
const SortableUserRow = ({ u, linkedTeacher, onEdit, onDelete, onResetPwd }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: u.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition relative">
      <td className="p-4 font-bold text-slate-900 font-mono flex items-center gap-2">
        <button {...attributes} {...listeners} className="text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {u.username}
      </td>
      <td className="p-4 font-mono text-slate-400">{u.password}</td>
      <td className="p-4">
        <span className={\`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider \${
          u.role === 'admin' 
            ? 'bg-red-50 text-red-600 border border-red-100' 
            : u.role === 'manager'
            ? 'bg-amber-50 text-amber-600 border border-amber-100'
            : 'bg-blue-50 text-blue-600 border border-blue-100'
        }\`}>
          {u.role === 'admin' ? '🔥 Admin' : u.role === 'manager' ? '⚡ Quản lý' : '🍀 Giáo viên'}
        </span>
      </td>
      <td className="p-4">
        {linkedTeacher ? (
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800">{linkedTeacher.name}</span>
            <span className="block text-[9px] font-mono text-slate-400">Mã: {linkedTeacher.id}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px] italic">Không liên kết</span>
        )}
      </td>
      <td className="p-4 max-w-xs">
        {u.role === 'admin' ? (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">Tất cả đặc quyền hệ thống</span>
        ) : u.role === 'manager' ? (
          <div className="flex flex-wrap gap-1">
            {u.permissions?.map((p: string) => (
              <span key={p} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                {p === 'manage_teachers' ? 'Nhân Sự' : p === 'manage_schedules' ? 'Xếp Lịch' : p === 'manage_schools' ? 'Trường Học' : p === 'approve_requests' ? 'Duyệt Đơn' : 'Báo Cáo'}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Quyền xem lịch và check-in</span>
        )}
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => onEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Sửa tài khoản">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={() => onResetPwd(u)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition" title="Cấp lại mật khẩu">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(u)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Khóa tài khoản">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
`;

if (!c.includes('const SortableSchoolRow')) {
  c = c.replace('export default function AdminDashboard', sortableSchoolComponent + '\n' + sortableReportComponent + '\n' + sortableUserComponent + '\nexport default function AdminDashboard');
}

// Replace mappings in JSX
const schoolMapRegex = /\{schools\.filter\([^)]*\)\)\.map\(\(sch\) => \{[\s\S]*?<\/div>\n\s*\)\n\s*\}\)\}/g;
if (c.match(schoolMapRegex)) {
  c = c.replace(schoolMapRegex, `
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSchoolDragEnd}>
                    <SortableContext items={schools.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                      {schools
                        .filter((s: any) => handleQueryFilter(s, ['id', 'name', 'address', 'contactPerson']))
                        .sort((a: any, b: any) => {
                          if (searchTerm) return 0;
                          const iA = schoolOrder.indexOf(a.id);
                          const iB = schoolOrder.indexOf(b.id);
                          if (iA === -1 && iB === -1) return 0;
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map((sch: any) => {
                          const schClasses = classes.filter((c: any) => c.schoolId === sch.id);
                          return (
                            <SortableSchoolRow 
                              key={sch.id}
                              sch={sch}
                              schClasses={schClasses}
                              onEdit={(s: any) => { setEditingSchool(s); setShowSchoolModal(true); }}
                              onDelete={handleDeleteSchool}
                            />
                          );
                        })}
                    </SortableContext>
                  </DndContext>
  `.trim());
}

const reportMapRegex = /\{teachers\.map\(\(teacher\) => \{[\s\S]*?<\/tr>\n\s*\)\n\s*\}\)\}/g;
if (c.match(reportMapRegex)) {
  c = c.replace(reportMapRegex, `
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeacherDragEnd}>
                    <SortableContext items={teachers.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                      {[...teachers]
                        .sort((a: any, b: any) => {
                          const iA = teacherOrder.indexOf(a.id);
                          const iB = teacherOrder.indexOf(b.id);
                          if (iA === -1 && iB === -1) return 0;
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map((teacher: any) => {
                          const tLogs = attendance.filter((a: any) => a.teacherId === teacher.id && a.date.startsWith(reportMonth) && (a.confirmedByAdmin || a.isVerified));
                          const approvedSubRequests = changes.filter((c: any) => c.status === 'approved' && c.targetTeacherId === teacher.id && c.date.startsWith(reportMonth));
                          const substituteLogs = tLogs.filter((log: any) => approvedSubRequests.some((req: any) => req.date === log.date && getSessionShort(req.session) === getSessionShort(log.session)));
                          const regularLogs = tLogs.filter((log: any) => !approvedSubRequests.some((req: any) => req.date === log.date && getSessionShort(req.session) === getSessionShort(log.session)));

                          const regularPeriods = regularLogs.reduce((sum: number, curr: any) => sum + curr.periods, 0);
                          const substitutePeriods = substituteLogs.reduce((sum: number, curr: any) => sum + curr.periods, 0);
                          const totalPeriods = regularPeriods + substitutePeriods;
                          
                          const baseLessonsSalary = regularPeriods * teacher.hourlyRate + substitutePeriods * 55000;
                          const hasApprovedLeave = changes.some((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth));
                          const allowance = teacher.monthlyAllowance || 500000;
                          const potentialBonus = teacher.bonus || 300000;
                          const attendanceBonus = hasApprovedLeave ? 0 : potentialBonus;
                          const finalWage = baseLessonsSalary + allowance + attendanceBonus - teacher.deduction;

                          return (
                            <SortableReportRow
                              key={teacher.id}
                              teacher={teacher}
                              totalPeriods={totalPeriods}
                              formatVND={formatVND}
                              baseLessonsSalary={baseLessonsSalary}
                              allowance={allowance}
                              hasApprovedLeave={hasApprovedLeave}
                              attendanceBonus={attendanceBonus}
                              finalWage={finalWage}
                            />
                          );
                        })}
                    </SortableContext>
                  </DndContext>
  `.trim());
}

const userMapRegex = /\{users\.map\(\(u\) => \{[\s\S]*?<\/tr>\n\s*\)\n\s*\}\)\}/g;
if (c.match(userMapRegex)) {
  c = c.replace(userMapRegex, `
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUserDragEnd}>
                    <SortableContext items={users.map((u: any) => u.id)} strategy={verticalListSortingStrategy}>
                      {[...users]
                        .sort((a: any, b: any) => {
                          const iA = userOrder.indexOf(a.id);
                          const iB = userOrder.indexOf(b.id);
                          if (iA === -1 && iB === -1) return 0;
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map((u: any) => {
                          const linkedTeacher = rawTeachers.find((t: any) => t.id === u.teacherId);
                          return (
                            <SortableUserRow
                              key={u.id}
                              u={u}
                              linkedTeacher={linkedTeacher}
                              onEdit={(u: any) => { setEditingUser(u); setShowUserModal(true); }}
                              onDelete={(u: any) => { if(window.confirm('Chắc chắn khóa / xóa tài khoản này?')) { handleUserAction('delete', u); } }}
                              onResetPwd={(u: any) => { if(window.confirm('Cấp lại mật khẩu mới cho tài khoản này?')) { handleUserAction('reset_password', u); } }}
                            />
                          );
                        })}
                    </SortableContext>
                  </DndContext>
  `.trim());
}

fs.writeFileSync('src/components/AdminDashboard.tsx', c);
console.log('Patch complete.');
