import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const notifCode = `
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ thông báo (Push Notifications).');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Đã bật thông báo! Hệ thống sẽ nhắc nhở bạn khi ứng dụng đang mở.');
      new Notification('Đã bật thông báo', {
        body: 'Bạn sẽ nhận được nhắc nhở điểm danh trước mỗi ca dạy.',
        icon: '/favicon.ico'
      });
    } else {
      alert('Bạn đã từ chối quyền gửi thông báo.');
    }
  };

  const handleExportCalendar = () => {
    // Generate .ics file for all schedules
    let icsContent = "BEGIN:VCALENDAR\\nVERSION:2.0\\nPRODID:-//Hệ thống Quản lý Giáo viên//VN\\n";
    
    // Map schedules to next 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
       const targetDate = new Date(today);
       targetDate.setDate(today.getDate() + i);
       const targetDayNum = targetDate.getDay() === 0 ? 8 : targetDate.getDay() + 1;
       const daySchedules = activeSchedules.filter(s => s.dayOfWeek === targetDayNum);
       
       daySchedules.forEach(sc => {
          // Attempt to parse time
          const schoolName = getSchoolName(sc.schoolId);
          const className = getClassName(sc.classId);
          const dateStr = targetDate.toISOString().replace(/[-:]/g, '').split('T')[0];
          
          let hourStr = "073000";
          if (sc.session.includes('Chiều') || sc.session.toLowerCase() === 'afternoon') hourStr = "133000";
          
          icsContent += "BEGIN:VEVENT\\n";
          icsContent += \`UID:\${sc.id}_\${dateStr}\\n\`;
          icsContent += \`DTSTAMP:\${dateStr}T\${hourStr}Z\\n\`;
          icsContent += \`DTSTART;TZID=Asia/Ho_Chi_Minh:\${dateStr}T\${hourStr}\\n\`;
          icsContent += \`SUMMARY:Dạy lớp \${className} - \${schoolName}\\n\`;
          icsContent += \`DESCRIPTION:Nhắc nhở chấm công định vị cho lớp \${className} (\${sc.periods} tiết)\\n\`;
          icsContent += "BEGIN:VALARM\\nTRIGGER:-PT15M\\nACTION:DISPLAY\\nDESCRIPTION:Nhắc nhở chấm công!\\nEND:VALARM\\n";
          icsContent += "END:VEVENT\\n";
       });
    }
    
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Lich_Day_Giao_Vien.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
`;

if (!content.includes('handleExportCalendar')) {
  content = content.replace('const handleCheckInNow = (e: React.FormEvent) => {', notifCode + '\n  const handleCheckInNow = (e: React.FormEvent) => {');
}

const notifUI = `
                <div className="flex gap-2">
                  <button onClick={handleEnableNotifications} className="flex-1 bg-amber-50 text-amber-700 p-2.5 rounded-2xl border border-amber-100 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1">
                    <Bell className="w-3 h-3" /> BẬT THÔNG BÁO APP
                  </button>
                  <button onClick={handleExportCalendar} className="flex-1 bg-blue-50 text-blue-700 p-2.5 rounded-2xl border border-blue-100 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" /> THÊM LỊCH VÀO ĐIỆN THOẠI
                  </button>
                </div>
`;

content = content.replace(/\{todaySchedules\.length === 0 && \(/, notifUI + '\n                        {todaySchedules.length === 0 && (');


fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Added notifications and calendar export');
