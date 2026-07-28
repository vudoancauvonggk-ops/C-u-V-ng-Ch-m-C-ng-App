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
  console.log('=== APPLYING EXACT USER REQUIREMENTS ===');

  // 1. Restore Mầm non Hoa Hồng Nhỏ (Ms. Lan) as separate from Mầm non Hoa Hồng (Ms. Nguyệt)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id IN ('sch-1784440450584', 'SCH002')");
  await pool.query("UPDATE classes SET school_id = 'sch-1784440450584' WHERE name LIKE '%Hoa Hồng Nhỏ%' OR id IN ('cls-1783602068087', 'cls-1783613224177', 'cls-1784177349702')");
  await pool.query("UPDATE schedules SET school_id = 'sch-1784440450584' WHERE teacher_id = 'GV_MSLAN' AND (class_id IN ('cls-1783602068087', 'cls-1783613224177', 'cls-1784177349702') OR school_id = 'SCH002')");
  await pool.query("UPDATE attendance SET school_id = 'sch-1784440450584' WHERE teacher_id = 'GV_MSLAN' AND (class_id IN ('cls-1783602068087', 'cls-1783613224177', 'cls-1784177349702') OR school_id = 'SCH002')");

  // 2. Separate Thiên Thần Tý Hon (Ms. Diệu) & MẦM NON THIÊN THẦN NHỎ (Ms. Lan)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id IN ('SCH005', 'sch-1783908892932', 'sch-1784440486418')");
  await pool.query("UPDATE classes SET school_id = 'sch-1783908892932' WHERE name LIKE '%Tý Hon%' OR name LIKE '%Tí Hon%' OR id IN ('CLS_SCH005_ghpmmchilthinthnthon', 'CLS_SCH005_chithinthnnh')");
  await pool.query("UPDATE schedules SET school_id = 'sch-1783908892932' WHERE teacher_id = 'GV_MSDIEU'");
  await pool.query("UPDATE attendance SET school_id = 'sch-1783908892932' WHERE teacher_id = 'GV_MSDIEU' OR class_id LIKE '%tyhon%' OR class_id IN ('CLS_SCH005_ghpmmchilthinthnthon', 'CLS_SCH005_chithinthnnh')");

  // 3. Remove Ms. Bình Nhi from Sao Việt Sunview -> move to Sao Việt (sch-1784356500727)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id = 'sch-1784356500727'");
  await pool.query("UPDATE classes SET school_id = 'sch-1784356500727' WHERE id = 'cls-1784018087913'");
  await pool.query("UPDATE attendance SET school_id = 'sch-1784356500727' WHERE id = 'ATT_1784018087904_0' OR teacher_id = 'GV_MSBINHNHI'");

  // 4. Separate Hoạ My (Mr. An) & MẦM NON HOẠ MI QUỐC LỘ 13 (Ms. Lan)
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL WHERE id IN ('SCH_1783664214934', 'sch-1784440594206')");
  await pool.query("UPDATE classes SET school_id = 'SCH_1783664214934' WHERE id = 'CLS_1783664214934_59'");
  await pool.query("UPDATE attendance SET school_id = 'SCH_1783664214934' WHERE id = 'ATT_1783745905111_0'");

  // 5. Merge Iris Q2 (SCH_DYN_DB1BB488) into Iris Thảo Điền (sch-1784386970379)
  await pool.query("UPDATE attendance SET school_id = 'sch-1784386970379' WHERE school_id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  await pool.query("UPDATE classes SET school_id = 'sch-1784386970379' WHERE school_id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  await pool.query("UPDATE schedules SET school_id = 'sch-1784386970379' WHERE school_id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");
  await pool.query("UPDATE schools SET is_deleted = true, deleted_at = NOW() WHERE id IN ('SCH_DYN_DB1BB488', 'sch-1784356386156', 'sch-1784354696592')");

  // 6. Tuổi Tiên: Ms. Huê, Ms. JoJo, Ms. An Nhi, Ms. Quỳnh Anh -> sch-1783691063604 ("Tuổi Tiên")
  //    Ms. Hà -> SCH_DYN_ZCJ75J4Q ("Tuổi Tiên 2")
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL, name = 'Tuổi Tiên' WHERE id = 'sch-1783691063604'");
  await pool.query("UPDATE schools SET is_deleted = false, deleted_at = NULL, name = 'Tuổi Tiên 2' WHERE id = 'SCH_DYN_ZCJ75J4Q'");

  await pool.query("UPDATE schedules SET school_id = 'sch-1783691063604' WHERE teacher_id IN ('GV_MSHUE', 'GV_MSNGANJOJO', 'GV_MSANNHI', 'GV_MSQUYNHANH') AND (school_id LIKE '%tuoitien%' OR school_id IN ('sch-1784617031657', 'sch-1784012119209', 'SCH_DYN_D6176260', 'SCH_DYN_9450A645'))");
  await pool.query("UPDATE classes SET school_id = 'sch-1783691063604' WHERE id IN ('cls-1784617031664', 'cls-1784171088637', 'cls-1783862334710', 'cls_simba_quynhanh')");
  await pool.query("UPDATE attendance SET school_id = 'sch-1783691063604' WHERE teacher_id IN ('GV_MSHUE', 'GV_MSNGANJOJO', 'GV_MSANNHI', 'GV_MSQUYNHANH') AND school_id IN ('sch-1784617031657', 'sch-1784012119209', 'SCH_DYN_D6176260', 'SCH_DYN_9450A645', 'SCH_DYN_ZCJ75J4Q')");

  await pool.query("UPDATE schedules SET school_id = 'SCH_DYN_ZCJ75J4Q' WHERE teacher_id = 'GV_MSHA' AND school_id = 'sch-1783691063604'");
  await pool.query("UPDATE classes SET school_id = 'SCH_DYN_ZCJ75J4Q' WHERE id IN ('cls_simba_yoga', 'cls-1783691122590', 'CLS_SCH_DYN_AB32C73F_donaldtuitin', 'CLS_SCH_DYN_AB32C73F_mickeytuitin', 'cls-1783691318986', 'CLS_SCH_DYN_9450A645_ltuitin', 'cls-1783691162531')");
  await pool.query("UPDATE attendance SET school_id = 'SCH_DYN_ZCJ75J4Q' WHERE teacher_id = 'GV_MSHA' AND school_id = 'sch-1783691063604'");

  console.log('EXACT USER SPEC APPLIED SUCCESSFULLY!');
  await pool.end();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cat << 'EOF' > /app/apply_exact.js\n${code}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && node apply_exact.js && rm /app/apply_exact.js', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('data', data => console.log(data.toString()));
        execStream.stderr.on('data', data => console.error(data.toString()));
        execStream.on('close', () => conn.end());
      });
    });
  });
}).connect(config);
