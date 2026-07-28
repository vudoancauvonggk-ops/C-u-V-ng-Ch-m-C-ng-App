module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = { host: '103.82.21.133', port: 22, username: 'root', password: '5A3N84JY026MdF2n' };

// FIXES:
// A) Cô Lan att trỏ HHN (SCH_DYN_GZ6TXXN6) → chuyển về SCH002 (Mầm Non Hoa Hồng)
//    Đồng thời cũng cập nhật class.school_id về SCH002 (vì class vẫn trỏ HHN)
// B) Cô Lan att trỏ HM (SCH_DYN_8ZCTOZMI) → chuyển về sch-1784440594206 (MẦM NON HOẠ MI QUỐC LỘ 13)
// C) Cô Yên att trỏ I Bud (SCH_DYN_9F693F23) → chuyển về sch-1784386970379 (Iris Thảo Điền)
//    Class CLS_SCH_DYN_9F693F23_iristhoin → cập nhật school_id về sch-1784386970379

const q1 = `cd /app && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@localhost:5432/postgres'});(async()=>{
  // Fix A: Cô Lan HHN -> Mầm Non Hoa Hồng (SCH002)
  const a = await p.query(\\"UPDATE attendance SET school_id='SCH002' WHERE school_id='SCH_DYN_GZ6TXXN6' AND date LIKE '2026-07%' AND teacher_id='GV_MSLAN'\\");
  console.log('Fix A (HHN->SCH002) att:',a.rowCount);

  // Fix A2: Cập nhật class trỏ HHN về SCH002
  const a2 = await p.query(\\"UPDATE classes SET school_id='SCH002' WHERE school_id='SCH_DYN_GZ6TXXN6'\\");
  console.log('Fix A2 classes:',a2.rowCount);

  // Fix B: Cô Lan HM -> MẦM NON HOẠ MI QUỐC LỘ 13
  const b = await p.query(\\"UPDATE attendance SET school_id='sch-1784440594206' WHERE school_id='SCH_DYN_8ZCTOZMI' AND date LIKE '2026-07%'\\");
  console.log('Fix B (HM->HOAMI QL13) att:',b.rowCount);

  // Fix B2: Cập nhật class trỏ HM về HOAMI QL13
  const b2 = await p.query(\\"UPDATE classes SET school_id='sch-1784440594206' WHERE school_id='SCH_DYN_8ZCTOZMI'\\");
  console.log('Fix B2 classes:',b2.rowCount);

  // Fix C: Cô Yên I Bud -> Iris Thảo Điền
  const c = await p.query(\\"UPDATE attendance SET school_id='sch-1784386970379' WHERE school_id='SCH_DYN_9F693F23' AND date LIKE '2026-07%'\\");
  console.log('Fix C (IBud->Iris Thao Dien) att:',c.rowCount);

  // Fix C2: Cập nhật class
  const c2 = await p.query(\\"UPDATE classes SET school_id='sch-1784386970379' WHERE school_id='SCH_DYN_9F693F23'\\");
  console.log('Fix C2 classes:',c2.rowCount);

  // Verify: không còn att nào trỏ deleted school trong 07/2026
  const v = await p.query(\\"SELECT a.school_id,sc.name,COUNT(*) as cnt FROM attendance a LEFT JOIN schools sc ON sc.id=a.school_id WHERE a.date LIKE '2026-07%' AND (sc.is_deleted=true OR sc.id IS NULL) GROUP BY a.school_id,sc.name\\");
  console.log('Remaining deleted school att:',v.rows.length===0?'CLEAR':JSON.stringify(v.rows));

  // Verify Tab4: deleted schools with approved att
  const v2 = await p.query(\\"SELECT a.school_id,sc.name,COUNT(*)::int as cnt FROM attendance a LEFT JOIN schools sc ON sc.id=a.school_id WHERE a.date LIKE '2026-07%' AND (a.confirmed_by_admin=true OR a.is_verified=true) AND (sc.is_deleted=true OR sc.id IS NULL) GROUP BY a.school_id,sc.name\\");
  console.log('Tab4 remaining issues:',v2.rows.length===0?'CLEAR':JSON.stringify(v2.rows));

  await p.end();
})().catch(e=>console.error(e.message))"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(q1, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect(config);
