const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '    const sessionSchedules = todaySchedules\n      .filter(s => getSessionShort(s.session) === getSessionShort(selectedSchedule.session))\n      .filter(s => {',
  '    const sessionSchedules = todaySchedules\n      .filter(s => getSessionShort(s.session) === getSessionShort(selectedSchedule.session) && s.schoolId === selectedSchedule.schoolId)\n      .filter(s => {'
);

content = content.replace(
  '<label className="font-bold text-neutral-500 block">Lớp mở màn ca dạy hôm nay:</label>',
  '<label className="font-bold text-neutral-500 block">Chọn lớp muốn điểm danh:</label>'
);

content = content.replace(
  '* Mẹo: Chấm công lớp này sẽ tự động ghi nhận cho toàn bộ các lớp khác trong cùng ca. Bỏ qua nếu đã chấm!',
  '* Mẹo: Chấm công lớp này sẽ tự động ghi nhận cho các lớp khác CÙNG TRƯỜNG trong cùng ca. Nếu bạn dạy trường khác trong cùng ca, vui lòng điểm danh lại cho trường đó!'
);

fs.writeFileSync(path, content);
