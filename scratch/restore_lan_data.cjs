module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const vpsCode = `
const { Pool } = require('pg');
require('dotenv').config({ path: '/app/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres' });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("=== 1. RESTORING 5 DELETED SCHEDULES FOR MS LAN ===");
    const idsToRestore = [
      'sch-1783863614044',
      'SKD_9265fea7-567f-4355-9f01-31f33bb1e6e6',
      'sch-1783864001920',
      'sch-1783864042686',
      'sch-1783864022980'
    ];

    const restoreRes = await client.query(
      "UPDATE schedules SET is_deleted = false, deleted_at = null WHERE id = ANY($1::text[]) RETURNING id, day_of_week, session, school_id, class_id",
      [idsToRestore]
    );
    console.log("Restored schedules count:", restoreRes.rowCount);
    console.table(restoreRes.rows);

    console.log("\\n=== 2. REMAPPING TODAY'S (2026-07-27) ATTENDANCE FOR MS LAN ===");
    
    // Update attendance for temp schedule sch-1785114783963 (LÁ/9:00) -> SKD_9265fea7-567f-4355-9f01-31f33bb1e6e6
    const u1 = await client.query(
      \`UPDATE attendance 
       SET school_id = 'SCH002', class_id = 'cls-1783613224166', schedule_id = 'SKD_9265fea7-567f-4355-9f01-31f33bb1e6e6' 
       WHERE teacher_id = 'GV_MSLAN' AND date = '2026-07-27' AND (schedule_id = 'sch-1785114783963' OR school_id = 'sch-1785114801676') AND (class_id = 'cls-1785114801684' OR class_id = 'cls-1783613224166')
       RETURNING id, school_id, class_id, schedule_id\`
    );
    console.log("Updated LÁ attendance:", u1.rows);

    // Update attendance for temp schedule sch-1785114808924 (MẦM/9:30) -> sch-1783863614044
    const u2 = await client.query(
      \`UPDATE attendance 
       SET school_id = 'SCH002', class_id = 'cls-1783863658269', schedule_id = 'sch-1783863614044' 
       WHERE teacher_id = 'GV_MSLAN' AND date = '2026-07-27' AND (schedule_id = 'sch-1785114808924' OR school_id = 'sch-1785114801676') AND (class_id = 'cls-1785114825868' OR class_id = 'cls-1783863658269')
       RETURNING id, school_id, class_id, schedule_id\`
    );
    console.log("Updated MẦM attendance:", u2.rows);

    console.log("\\n=== 3. CLEANING UP TEMP SCHEDULES, CLASSES, AND SCHOOL CREATED TODAY ===");
    const delTempSched = await client.query("DELETE FROM schedules WHERE id IN ('sch-1785114783963', 'sch-1785114808924')");
    console.log("Deleted temp schedules count:", delTempSched.rowCount);

    const delTempCls = await client.query("DELETE FROM classes WHERE id IN ('cls-1785114801684', 'cls-1785114825868')");
    console.log("Deleted temp classes count:", delTempCls.rowCount);

    const delTempSch = await client.query("DELETE FROM schools WHERE id = 'sch-1785114801676'");
    console.log("Deleted temp school count:", delTempSch.rowCount);

    await client.query('COMMIT');
    console.log("\\n>>> SUCCESS: DATA RESTORED & CLEANED UP <<<");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("FAILED, ROLLBACK EXECUTED:", err);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
`;

const b64 = Buffer.from(vpsCode).toString('base64');
const cmd = `cd /app && node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let stdout = '';
    let stderr = '';
    stream.on('close', () => {
      console.log(stdout);
      if (stderr) console.log("STDERR:", stderr);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    }).stderr.on('data', (data) => {
      stderr += data.toString();
    });
  });
}).connect(config);
