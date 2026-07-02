import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const regex = /\{todaySchedules\.map\(sc => \([\s\S]*?\}\)\}/;

const replacement = `{todaySchedules.map(sc => {
  const isCheckedIn = attendance.some(a => a.teacherId === currentTeacher.id && a.date === todayStr && a.session === sc.session);
  return (
    <div key={sc.id} className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl border border-neutral-150 transition flex items-center justify-between gap-3 text-xs shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-neutral-800">Thứ {sc.dayOfWeek}</span>
          <span className={\`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold \${
            sc.session === 'morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
          }\`}>
            {getSessionShort(sc.session).toUpperCase()}
          </span>
        </div>
        <p className="font-bold text-slate-900 text-sm">{getClassName(sc.classId)}</p>
        <p className="text-[11px] text-neutral-500 truncate max-w-44">{getSchoolName(sc.schoolId)}</p>
      </div>

      <div className="text-right shrink-0">
        <span className="text-[10px] font-mono text-neutral-400 block font-bold mb-1">Số tiết: {sc.periods}t</span>
        {isCheckedIn ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            ✓ Đã chấm
          </span>
        ) : (
          <button 
            onClick={() => {
              setSelectedScheduleId(sc.id);
              setMobileTab('checkin');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 px-3 rounded-full text-[10px] transition"
          >
            Điểm Danh
          </button>
        )}
      </div>
    </div>
  );
})}`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Done');
