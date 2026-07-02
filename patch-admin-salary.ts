import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// Update CSV report generation
content = content.replace(
  `        const hasApprovedLeave = changes.some(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth));`,
  `        const hasApprovedLeave = changes.some(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'sick_leave');
        const artEvents = changes.filter(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance');
        let artPerformanceBonus = 0;
        artEvents.forEach(c => {
          const match = c.reason.match(/\\[Số lượng: (\\d+)\\]/);
          if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
          else artPerformanceBonus += 100000;
        });`
);

content = content.replace(
  `        const attendanceBonus = hasApprovedLeave ? 0 : potentialBonus;`,
  `        const attendanceBonus = (hasApprovedLeave ? 0 : potentialBonus) + artPerformanceBonus;`
);

// Update UI salary calculation
content = content.replace(
  `                          const hasApprovedLeave = changes.some((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth));`,
  `                          const hasApprovedLeave = changes.some((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'sick_leave');
                          const artEvents = changes.filter((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance');
                          let artPerformanceBonus = 0;
                          artEvents.forEach((c: any) => {
                            const match = c.reason.match(/\\[Số lượng: (\\d+)\\]/);
                            if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
                            else artPerformanceBonus += 100000;
                          });`
);

content = content.replace(
  `                          const attendanceBonus = hasApprovedLeave ? 0 : potentialBonus;`,
  `                          const attendanceBonus = (hasApprovedLeave ? 0 : potentialBonus) + artPerformanceBonus;`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patched AdminDashboard.tsx for salary rules!');
