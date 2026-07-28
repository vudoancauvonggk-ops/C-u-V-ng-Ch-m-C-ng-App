module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');
const config = { host: '103.82.21.133', port: 22, username: 'root', password: '5A3N84JY026MdF2n' };

// Check duplicates detail: same teacher+date+class but different att ID = multiple sessions or real dup?
const q = `cd /app && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@localhost:5432/postgres'});(async()=>{
  const r = await p.query(\\"SELECT a.id,a.date,a.teacher_id,t.name as tname,a.class_id,c.name as cname,a.school_id,sc.name as scname,a.periods,a.confirmed_by_admin,a.is_verified FROM attendance a LEFT JOIN teachers t ON t.id=a.teacher_id LEFT JOIN classes c ON c.id=a.class_id LEFT JOIN schools sc ON sc.id=a.school_id WHERE (a.teacher_id='GV_MSAO' OR a.teacher_id='GV_MSYEN' OR a.teacher_id='GV_MSHA' OR a.teacher_id='GV_MSNGUYET') AND a.date LIKE '2026-07%' AND a.class_id IN ('CLS_SCH_DYN_A7EAAC62_khmphtrthngthi','cls-1784104072898','CLS_SCH_DYN_DB1BB488_lpghp','CLS_SCH_DYN_06E63138_ghpkhangnguyn') ORDER BY a.teacher_id,a.date,a.class_id\\");
  console.log(JSON.stringify(r.rows,null,2));
  await p.end();
})().catch(e=>console.error(e.message))"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(q, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(config);
