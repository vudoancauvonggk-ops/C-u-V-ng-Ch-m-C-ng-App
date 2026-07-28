module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const code = `
const pkg = require('pg');
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  console.log('=== EXECUTING USER CUSTOM SCHOOL MERGES & SEPARATIONS ===');

  // 1. Restore Mầm Non Hoa Hồng Nhỏ (Ms. Lan) as distinct from Mầm Non Hoa Hồng (Ms. Nguyệt)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'sch-1784440450584'"); // MẦM NON HOA HỒNG NHỎ
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'SCH002'"); // Mầm Non Hoa Hồng
  // Move Ms. Lan's Hoa Hồng Nhỏ classes & attendance to sch-1784440450584
  await pool.query("UPDATE classes SET school_id = 'sch-1784440450584' WHERE id IN ('cls-1783602068087', 'cls-1783613224177', 'cls-1784177349702') OR name LIKE '%Hoa Hồng Nhỏ%'");
  await pool.query("UPDATE schedules SET school_id = 'sch-1784440450584' WHERE teacher_id = 'GV_MSLAN' AND (class_id IN ('cls-1783602068087', 'cls-1783613224177', 'cls-1784177349702') OR school_id = 'SCH002')");
  await pool.query("UPDATE attendance SET school_id = 'sch-1784440450584' WHERE teacher_id = 'GV_MSLAN' AND class_id IN ('cls-1783602068087', 'cls-1783613224177', 'cls-1784177349702')");
  console.log('1. Separated Mầm Non Hoa Hồng Nhỏ & Mầm Non Hoa Hồng');

  // 2. Separate Thiên Thần Tý Hon & MẦM NON THIÊN THẦN NHỎ
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'SCH005'"); // Mầm non Thiên Thần Tý Hon
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'sch-1783908892932'"); // Thiên Thần Tý Hon
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'sch-1784440486418'"); // MẦM NON THIÊN THẦN NHỎ
  // Move Ms. Diệu / Tý Hon logs back to SCH005 / sch-1783908892932
  await pool.query("UPDATE attendance SET school_id = 'SCH005' WHERE teacher_id = 'GV_MSDIEU' OR class_id LIKE '%tyhon%' OR class_id IN ('CLS_SCH005_ghpmmchilthinthnthon', 'CLS_SCH005_chithinthnnh')");
  await pool.query("UPDATE classes SET school_id = 'SCH005' WHERE id IN ('CLS_SCH005_ghpmmchilthinthnthon', 'CLS_SCH005_chithinthnnh') OR name LIKE '%Tý Hon%' OR name LIKE '%Tí Hon%'");
  await pool.query("UPDATE schedules SET school_id = 'SCH005' WHERE teacher_id = 'GV_MSDIEU'");
  console.log('2. Separated Thiên Thần Tý Hon & MẦM NON THIÊN THẦN NHỎ');

  // 3. Sao Việt Sunview (no Ms. Bình Nhi) -> Move Ms. Bình Nhi's log & class to Sao Việt (sch-1784356500727)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'sch-1784356500727'"); // Sao Việt
  await pool.query("UPDATE attendance SET school_id = 'sch-1784356500727' WHERE id = 'ATT_1784018087904_0'");
  await pool.query("UPDATE classes SET school_id = 'sch-1784356500727' WHERE id = 'cls-1784018087913'");
  console.log('3. Removed Ms. Bình Nhi from Sao Việt Sunview to Sao Việt');

  // 4. Hoạ My (Mr. An) vs MẦM NON HOẠ MI QUỐC LỘ 13 (Ms. Lan)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'SCH_1783664214934'"); // Hoạ My
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'sch-1784440594206'"); // MẦM NON HOẠ MI QUỐC LỘ 13
  await pool.query("UPDATE attendance SET school_id = 'SCH_1783664214934' WHERE id = 'ATT_1783745905111_0'");
  await pool.query("UPDATE classes SET school_id = 'SCH_1783664214934' WHERE id = 'CLS_1783664214934_59'");
  await pool.query("UPDATE schedules SET school_id = 'SCH_1783664214934' WHERE school_id = 'sch-1784440594206' AND teacher_id != 'GV_MSLAN'");
  console.log('4. Separated Hoạ My & MẦM NON HOẠ MI QUỐC LỘ 13');

  // 5. Merge Iris Q2 into Iris Thảo Điền (sch-1784386970379)
  await pool.query("UPDATE attendance SET school_id = 'sch-1784386970379' WHERE school_id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  await pool.query("UPDATE classes SET school_id = 'sch-1784386970379' WHERE school_id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  await pool.query("UPDATE schedules SET school_id = 'sch-1784386970379' WHERE school_id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  await pool.query("UPDATE schools SET is_deleted = true, deleted_at = NOW() WHERE id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  console.log('5. Merged Iris Q2 into Iris Thảo Điền');

  // 6. Tuổi Tiên: Ms. Huê, Ms. JoJo, Ms. An Nhi, Ms. Quỳnh Anh -> sch-1783691063604 (Tuổi Tiên)
  //    Ms. Hà -> SCH_DYN_ZCJ75J4Q (Tuổi Tiên 2)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL, name = 'Tuổi Tiên 2' WHERE id = 'SCH_DYN_ZCJ75J4Q'");
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL, name = 'Tuổi Tiên' WHERE id = 'sch-1783691063604'");
  
  // Merge Ms. JoJo, Ms. An Nhi, Ms. Quỳnh Anh, Ms. Huê Tuổi Tiên schedules to sch-1783691063604
  await pool.query("UPDATE schedules SET school_id = 'sch-1783691063604' WHERE teacher_id IN ('GV_MSHUE', 'GV_MSNGANJOJO', 'GV_MSANNHI', 'GV_MSQUYNHANH') AND (school_id LIKE '%tuoitien%' OR school_id IN ('sch-1784617031657', 'sch-1784012119209', 'SCH_DYN_D6176260', 'SCH_DYN_9450A645'))");
  await pool.query("UPDATE classes SET school_id = 'sch-1783691063604' WHERE id IN ('cls-1784617031664', 'cls-1784171088637', 'cls-1783862334710', 'cls_simba_quynhanh')");
  await pool.query("UPDATE attendance SET school_id = 'sch-1783691063604' WHERE teacher_id IN ('GV_MSHUE', 'GV_MSNGANJOJO', 'GV_MSANNHI', 'GV_MSQUYNHANH') AND school_id IN ('sch-1784617031657', 'sch-1784012119209', 'SCH_DYN_D6176260', 'SCH_DYN_9450A645', 'SCH_DYN_ZCJ75J4Q')");

  // Move Ms. Hà's Tuổi Tiên schedules, classes, attendance to SCH_DYN_ZCJ75J4Q (Tuổi Tiên 2)
  await pool.query("UPDATE schedules SET school_id = 'SCH_DYN_ZCJ75J4Q' WHERE teacher_id = 'GV_MSHA' AND school_id = 'sch-1783691063604'");
  await pool.query("UPDATE classes SET school_id = 'SCH_DYN_ZCJ75J4Q' WHERE id IN ('cls_simba_yoga', 'cls-1783691122590', 'CLS_SCH_DYN_AB32C73F_donaldtuitin', 'CLS_SCH_DYN_AB32C73F_mickeytuitin', 'cls-1783691318986', 'CLS_SCH_DYN_9450A645_ltuitin', 'cls-1783691162531')");
  await pool.query("UPDATE attendance SET school_id = 'SCH_DYN_ZCJ75J4Q' WHERE teacher_id = 'GV_MSHA' AND school_id = 'sch-1783691063604'");
  console.log('6. Separated Tuổi Tiên (Huê, JoJo, An Nhi, Quỳnh Anh) & Tuổi Tiên 2 (Ms. Hà)');

  console.log('=== ALL USER CUSTOM MERGES & SEPARATIONS APPLIED SUCCESSFULLY ===');
  await pool.end();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/run_user_custom.js\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && node run_user_custom.js && rm /app/run_user_custom.js', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
