import fs from 'fs';
let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

content = content.replace(/const isMorning = selectedSchedule\.session === 'morning';/, "const isMorning = typeof selectedSchedule.session === 'string' && (selectedSchedule.session.toLowerCase() === 'morning' || selectedSchedule.session.toLowerCase().includes('sáng') || selectedSchedule.session.startsWith('0') || selectedSchedule.session.startsWith('10') || selectedSchedule.session.startsWith('11') || selectedSchedule.session.startsWith('7') || selectedSchedule.session.startsWith('8') || selectedSchedule.session.startsWith('9'));");

// Also fix getSessionShort
content = content.replace(/const getSessionShort = \(session: string\) => \{[\s\S]*?return session;\s*\};/, `const getSessionShort = (session: string) => {
    if (!session) return '';
    const s = session.toLowerCase();
    if (s === 'morning' || s.includes('sáng') || s.startsWith('0') || s.startsWith('7') || s.startsWith('8') || s.startsWith('9') || s.startsWith('10') || s.startsWith('11')) return 'Sáng';
    if (s === 'afternoon' || s.includes('chiều') || s.startsWith('1') || s.startsWith('2')) return 'Chiều';
    return session;
  };`);

// And fix the sort logic in todaySchedules
content = content.replace(/\.sort\(\(a, b\) => \(a\.session === 'morning' \? -1 : 1\)\)/g, `.sort((a, b) => {
      const aMorning = typeof a.session === 'string' && (a.session.toLowerCase() === 'morning' || a.session.toLowerCase().includes('sáng') || /^[0-9]/.test(a.session));
      return aMorning ? -1 : 1;
    })`);

// And fix session comparison when checking if checked in
content = content.replace(/a\.session === sc\.session/g, "getSessionShort(a.session) === getSessionShort(sc.session)");
content = content.replace(/s\.session === selectedSchedule\.session/g, "getSessionShort(s.session) === getSessionShort(selectedSchedule.session)");
content = content.replace(/a\.session === s\.session/g, "getSessionShort(a.session) === getSessionShort(s.session)");

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Done morning patch');
