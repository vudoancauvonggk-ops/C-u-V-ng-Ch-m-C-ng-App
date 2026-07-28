module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`curl -s http://localhost:3000/api/state`, (err, stream) => {
    if (err) throw err;
    let raw = '';
    stream.on('data', d => raw += d);
    stream.on('close', () => {
      conn.end();
      try {
        const json = JSON.parse(raw);
        const schools = json.schools || [];
        const classes = json.classes || [];
        const attendance = json.attendance || [];
        const schedules = json.schedules || [];
        const reportMonth = '2026-07';

        const normalizeStr = (str) => {
          if (!str) return '';
          return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        };

        const getEffectiveSchoolId = (log) => {
          if (log.schoolId) return log.schoolId;
          const cls = classes.find(c => c.id === log.classId && !c.isDeleted);
          return cls?.schoolId || '';
        };

        const scheduleSchoolIds = schedules.filter(s => !s.isDeleted).map(s => s.schoolId);
        const approvedLogs = attendance.filter(a => 
          !a.isDeleted && 
          a.date && a.date.startsWith(reportMonth) && 
          (a.confirmedByAdmin || a.isVerified)
        );
        const attendanceSchoolIds = approvedLogs.map(getEffectiveSchoolId).filter(Boolean);

        const activeSchoolIds = Array.from(new Set([...scheduleSchoolIds, ...attendanceSchoolIds]));
        const activeSchools = activeSchoolIds
          .map(id => schools.find(s => s.id === id))
          .filter(s => s && (!s.isDeleted || attendanceSchoolIds.includes(s.id)));

        console.log('=== ACTIVE SCHOOLS IN REPORT MONTH (' + reportMonth + ') ===');
        console.log('Total Active Schools:', activeSchools.length);

        const calculatedRows = activeSchools.map(sch => {
          const schoolClasses = classes.filter(c => c.schoolId === sch.id && !c.isDeleted);
          const schoolClassIds = new Set(schoolClasses.map(c => c.id));
          const schoolLogs = approvedLogs.filter(a => {
            if (a.schoolId === sch.id) return true;
            if (a.classId && schoolClassIds.has(a.classId)) return true;
            if (!a.schoolId) return getEffectiveSchoolId(a) === sch.id;
            return false;
          });
          const actualPeriods = schoolLogs.reduce((acc, curr) => acc + (curr.periods || 0), 0);
          return {
            schoolId: sch.id,
            displayName: sch.name,
            actualPeriods,
            logsCount: schoolLogs.length
          };
        });

        console.log('\n=== CALCULATED ROWS FOR IRIS SCHOOLS ===');
        const irisRows = calculatedRows.filter(r => normalizeStr(r.displayName).includes('iris'));
        console.log(JSON.stringify(irisRows, null, 2));

        console.log('\n=== DUMP OF APPROVED ATTENDANCE FOR IRIS ===');
        approvedLogs.forEach(a => {
          const s = schools.find(sc => sc.id === a.schoolId);
          const c = classes.find(cl => cl.id === a.classId);
          if ((s?.name || '').toLowerCase().includes('iris') || (c?.name || '').toLowerCase().includes('iris')) {
            console.log('Date:', a.date, '| periods:', a.periods, '| schId:', a.schoolId, '(', s?.name, ') | classId:', a.classId, '(', c?.name, ')');
          }
        });
      } catch(e) { console.error('Parse error:', e); }
    });
  });
}).connect(config);
