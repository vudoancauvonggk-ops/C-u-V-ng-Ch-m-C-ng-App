module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const cmd = `cd /app && node -e "
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  console.log('=== FIXING ALL AUDITED SCHOOL DATA INCONSISTENCIES ===');

  // 1. Iris Thảo Điền: sch-1783867922784 -> sch-1784386970379
  await pool.query(\\"UPDATE attendance SET school_id = 'sch-1784386970379' WHERE school_id = 'sch-1783867922784'\\");
  await pool.query(\\"UPDATE classes SET school_id = 'sch-1784386970379' WHERE school_id = 'sch-1783867922784'\\");
  await pool.query(\\"UPDATE schedules SET school_id = 'sch-1784386970379' WHERE school_id = 'sch-1783867922784'\\");
  console.log('1. Fixed Iris Thảo Điền');

  // 2. Mầm Non Hoa: sch-1784431996627 -> sch-1783943877836
  await pool.query(\\"UPDATE attendance SET school_id = 'sch-1783943877836' WHERE school_id = 'sch-1784431996627'\\");
  await pool.query(\\"UPDATE classes SET school_id = 'sch-1783943877836' WHERE school_id = 'sch-1784431996627'\\");
  await pool.query(\\"UPDATE schedules SET school_id = 'sch-1783943877836' WHERE school_id = 'sch-1784431996627'\\");
  console.log('2. Fixed Mầm Non Hoa');

  // 3. Hoạ My: SCH_1783664214934 -> sch-1784440594206
  await pool.query(\\"UPDATE attendance SET school_id = 'sch-1784440594206' WHERE school_id = 'SCH_1783664214934'\\");
  await pool.query(\\"UPDATE classes SET school_id = 'sch-1784440594206' WHERE school_id = 'SCH_1783664214934'\\");
  await pool.query(\\"UPDATE schedules SET school_id = 'sch-1784440594206' WHERE school_id = 'SCH_1783664214934'\\");
  console.log('3. Fixed Hoạ My');

  // 4. Mai Linh: SCH_DYN_71B298ED -> sch-1784440561726
  await pool.query(\\"UPDATE attendance SET school_id = 'sch-1784440561726' WHERE school_id = 'SCH_DYN_71B298ED'\\");
  await pool.query(\\"UPDATE classes SET school_id = 'sch-1784440561726' WHERE school_id = 'SCH_DYN_71B298ED'\\");
  await pool.query(\\"UPDATE schedules SET school_id = 'sch-1784440561726' WHERE school_id = 'SCH_DYN_71B298ED'\\");
  console.log('4. Fixed Mai Linh');

  // 5. Mầm non Thiên Thần Tý Hon: SCH005 -> sch-1784440486418
  await pool.query(\\"UPDATE attendance SET school_id = 'sch-1784440486418' WHERE school_id = 'SCH005'\\");
  await pool.query(\\"UPDATE classes SET school_id = 'sch-1784440486418' WHERE school_id = 'SCH005'\\");
  await pool.query(\\"UPDATE schedules SET school_id = 'sch-1784440486418' WHERE school_id = 'SCH005'\\");
  console.log('5. Fixed Mầm non Thiên Thần Tý Hon');

  // 6. Trường 2/9: sch-1784647321114 -> SCH_1784681560317_GV_MSDUYEN
  await pool.query(\\"UPDATE attendance SET school_id = 'SCH_1784681560317_GV_MSDUYEN' WHERE school_id = 'sch-1784647321114'\\");
  await pool.query(\\"UPDATE classes SET school_id = 'SCH_1784681560317_GV_MSDUYEN' WHERE school_id = 'sch-1784647321114'\\");
  await pool.query(\\"UPDATE schedules SET school_id = 'SCH_1784681560317_GV_MSDUYEN' WHERE school_id = 'sch-1784647321114'\\");
  console.log('6. Fixed Trường 2/9');

  // 7. Restore Bầu trời xanh & Ánh Cầu Vồng
  await pool.query(\\"UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'SCH_1784086041869_GV_MSDUYEN'\\");
  await pool.query(\\"UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'SCH001'\\");
  console.log('7. Restored Bầu trời xanh & Ánh Cầu Vồng');

  console.log('ALL AUDIT FIXES APPLIED SUCCESSFULLY!');
  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => console.log(data.toString()));
    stream.stderr.on('data', data => console.error(data.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
