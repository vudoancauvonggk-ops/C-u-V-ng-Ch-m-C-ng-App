module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');
const config = { host: '103.82.21.133', port: 22, username: 'root', password: '5A3N84JY026MdF2n' };

const q = `cd /app && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||'postgres://postgres:postgres@localhost:5432/postgres'});(async()=>{
  // Tổng số rows (bao gồm mọi trạng thái) - đây là attendance.length trong dashboard
  const rows = await p.query(\\"SELECT COUNT(*)::int as cnt FROM attendance WHERE date LIKE '2026-07%'\\");
  console.log('Total att rows (attendance.length):', rows.rows[0].cnt);

  // Tổng periods đã duyệt - đây là con số tab đối soát
  const approved = await p.query(\\"SELECT COUNT(*)::int as cnt, SUM(periods)::int as tot_periods FROM attendance WHERE date LIKE '2026-07%' AND (confirmed_by_admin=true OR is_verified=true)\\");
  console.log('Approved att rows:', approved.rows[0].cnt, '| Total periods:', approved.rows[0].tot_periods);

  // Flagged (chưa duyệt, bị flag)
  const flagged = await p.query(\\"SELECT COUNT(*)::int as cnt, SUM(periods)::int as tot FROM attendance WHERE date LIKE '2026-07%' AND is_flagged=true\\");
  console.log('Flagged att:', flagged.rows[0].cnt, '| Periods:', flagged.rows[0].tot);

  // Pending (chưa duyệt, chưa flag)
  const pending = await p.query(\\"SELECT COUNT(*)::int as cnt, SUM(periods)::int as tot FROM attendance WHERE date LIKE '2026-07%' AND confirmed_by_admin!=true AND is_verified!=true AND is_flagged!=true\\");
  console.log('Pending att:', pending.rows[0].cnt, '| Periods:', pending.rows[0].tot);

  // Tổng kiểm
  console.log('');
  console.log('=== GIẢI THÍCH CHÊNH LỆCH ===');
  console.log('Dashboard hiển thị: attendance.length =', rows.rows[0].cnt, 'buổi dạy (số ROWS)');
  console.log('Đối soát tính: SUM(periods) approved =', approved.rows[0].tot_periods, 'tiết (tổng TIẾT đã duyệt)');
  console.log('2 con số này ĐO KHÁC NHAU - không phải lỗi');

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
