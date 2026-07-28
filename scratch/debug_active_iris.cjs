module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const script = `
  const { db } = require('./dist/server.cjs');
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`node -e "
    const http = require('http');
    http.get('http://localhost:3000/api/state', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const schs = json.schools || [];
          const cls = json.classes || [];
          const att = json.attendance || [];
          const sched = json.schedules || [];

          console.log('=== IRIS SCHOOLS IN /api/state ===');
          schs.filter(s => (s.name || '').toLowerCase().includes('iris')).forEach(s => {
            console.log('School ID:', s.id, '| Name:', JSON.stringify(s.name), '| isDeleted:', s.isDeleted);
          });

          console.log('=== IRIS CLASSES IN /api/state ===');
          cls.filter(c => (c.name || '').toLowerCase().includes('iris')).forEach(c => {
            console.log('Class ID:', c.id, '| Name:', JSON.stringify(c.name), '| schoolId:', c.schoolId);
          });

          console.log('=== IRIS SCHEDULES ===');
          sched.filter(s => {
            const sch = schs.find(sc => sc.id === s.schoolId);
            return (sch?.name || '').toLowerCase().includes('iris');
          }).forEach(s => {
            const sch = schs.find(sc => sc.id === s.schoolId);
            console.log('Schedule school:', sch?.name, '| day:', s.dayOfWeek, '| periods:', s.periods);
          });

          console.log('=== APPROVED ATTENDANCE IN 2026-07 ===');
          att.filter(a => a.date && a.date.startsWith('2026-07') && (a.confirmedByAdmin || a.isVerified) && !a.isDeleted).forEach(a => {
            const sch = schs.find(s => s.id === a.schoolId);
            const cl = cls.find(c => c.id === a.classId);
            if ((sch?.name || '').toLowerCase().includes('iris') || (cl?.name || '').toLowerCase().includes('iris')) {
              console.log('Iris Log date:', a.date, '| periods:', a.periods, '| school:', sch?.name, '| class:', cl?.name);
            }
          });
        } catch(e) { console.error(e); }
      });
    });
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', d => console.log(d.toString()));
  });
}).connect(config);
