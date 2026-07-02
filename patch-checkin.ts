import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const replacement = `
    const targetFlagged = isCheatFlagged || isLateFlagged;
    const targetReason = isCheatFlagged ? cheatReason : lateReason;

    // To prevent multiple logs per class, group by schoolId within this session
    const logsBySchool: Record<string, typeof uncheckedSchedules> = {};
    for (const sched of uncheckedSchedules) {
      if (!logsBySchool[sched.schoolId]) logsBySchool[sched.schoolId] = [];
      logsBySchool[sched.schoolId].push(sched);
    }

    const newLogs: AttendanceLog[] = Object.keys(logsBySchool).map((schoolId, idx) => {
       const isFirst = idx === 0;
       const schedulesForSchool = logsBySchool[schoolId];
       const totalPeriodsForSchool = schedulesForSchool.reduce((sum, s) => sum + s.periods, 0);
       const firstSched = schedulesForSchool[0];
       
       return {
         id: \`ATT_\${Date.now()}_\${idx}\`,
         date: todayStr,
         scheduleId: firstSched.id, // Just reference the first one
         teacherId: currentTeacher.id,
         schoolId: schoolId,
         classId: schedulesForSchool.length > 1 ? 'Nhiều lớp' : firstSched.classId,
         session: firstSched.session,
         checkInTime: timeStr,
         periods: totalPeriodsForSchool,
         lat: userLat,
         lng: userLng,
         distanceMeter: distance,
         selfieImage: capturedImage,
         verificationMethod: scannedQR ? 'BOTH' : 'GPS',
         isVerified: !targetFlagged,
         isFlagged: isFirst ? targetFlagged : false,
         flagReason: isFirst ? targetReason : '',
         confirmedByAdmin: !isFirst && !targetFlagged
       };
    });

    onUpdateAttendance([...attendance, ...newLogs]);

    if (isCheatFlagged) {`;

const regex = /const targetFlagged = isCheatFlagged \|\| isLateFlagged;[\s\S]*?if \(isCheatFlagged\) \{/;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Done');
