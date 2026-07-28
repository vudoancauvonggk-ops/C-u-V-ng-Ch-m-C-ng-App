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
  conn.exec(`node -e "
    const http = require('http');
    http.get('http://localhost:3000/api/state', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        const schs = json.schools || [];
        const cls = json.classes || [];
        const att = json.attendance || [];
        
        console.log('=== IRIS SCHOOLS ===');
        const irisSchs = schs.filter(s => (s.name || '').toLowerCase().includes('iris'));
        irisSchs.forEach(s => console.log(s.id, ':', s.name));

        const irisSchIds = new Set(irisSchs.map(s => s.id));
        const irisCls = cls.filter(c => irisSchIds.has(c.schoolId) || (c.name || '').toLowerCase().includes('iris'));
        console.log('\n=== IRIS CLASSES ===');
        irisCls.forEach(c => console.log(c.id, ':', c.name, '| schoolId:', c.schoolId));
        const irisClsIds = new Set(irisCls.map(c => c.id));

        const julyLogs = att.filter(a => a.date && a.date.startsWith('2026-07') && (a.confirmedByAdmin || a.isVerified) && !a.isDeleted);
        const irisLogs = julyLogs.filter(a => irisSchIds.has(a.schoolId) || irisClsIds.has(a.classId));

        console.log('\n=== IRIS JULY LOGS (' + irisLogs.length + ') ===');
        irisLogs.forEach(l => {
          const s = schs.find(sc => sc.id === l.schoolId);
          const c = cls.find(cl => cl.id === l.classId);
          console.log('Date:', l.date, '| periods:', l.periods, '| school:', s?.name, '(', l.schoolId, ') | class:', c?.name, '(', l.classId, ')');
        });
      });
    });
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', d => console.log(d.toString()));
  });
}).connect(config);
