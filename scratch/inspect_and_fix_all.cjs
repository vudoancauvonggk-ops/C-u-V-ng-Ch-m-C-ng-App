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

    console.log("=== 1. UN-DELETING CLASSES THAT HAVE ACTIVE SCHEDULES OR ATTENDANCE ===");
    // Get all class IDs referenced by active schedules or July attendance
    const activeClassIdsRes = await client.query(
      \`SELECT DISTINCT class_id FROM schedules WHERE is_deleted = false AND class_id IS NOT NULL 
       UNION 
       SELECT DISTINCT class_id FROM attendance WHERE date >= '2026-07-01' AND class_id IS NOT NULL\`
    );
    const referencedClassIds = activeClassIdsRes.rows.map(r => r.class_id);

    const fixClassesRes = await client.query(
      "UPDATE classes SET is_deleted = false, deleted_at = null WHERE id = ANY($1::text[]) AND is_deleted = true RETURNING id, name, school_id",
      [referencedClassIds]
    );
    console.log("Restored deleted classes count:", fixClassesRes.rowCount);
    console.table(fixClassesRes.rows);

    console.log("\\n=== 2. FIXING SCHEDULES POINTING TO DELETED SCHOOLS ===");

    // A. Mr. Tuấn: SCH_DYN_DC006530 (Thiên phú long 1) -> sch-1784356836518 (Thiên Phú Long 1)
    const tplActive = await client.query("SELECT id, name FROM schools WHERE name ILIKE '%Thiên Phú Long%' AND is_deleted = false LIMIT 1");
    if (tplActive.rows.length > 0) {
      const activeTplId = tplActive.rows[0].id;
      const uTpl = await client.query(
        "UPDATE schedules SET school_id = $1 WHERE school_id = 'SCH_DYN_DC006530' RETURNING id, teacher_id, school_id",
        [activeTplId]
      );
      console.log(\`Updated Mr. Tuấn schedules to active school \${activeTplId} (\${tplActive.rows[0].name}):\`, uTpl.rowCount);
      await client.query(
        "UPDATE attendance SET school_id = $1 WHERE school_id = 'SCH_DYN_DC006530'",
        [activeTplId]
      );
    }

    // B. Ms. An Nhi: sch-1784509148643 (Smilekid) -> sch-1783856923464 (Smilekid Cơ Sở 1)
    const smileActive = await client.query("SELECT id, name FROM schools WHERE name ILIKE '%Smilekid%' AND is_deleted = false LIMIT 1");
    if (smileActive.rows.length > 0) {
      const activeSmileId = smileActive.rows[0].id;
      const uSmile = await client.query(
        "UPDATE schedules SET school_id = $1 WHERE school_id = 'sch-1784509148643' RETURNING id, teacher_id, school_id",
        [activeSmileId]
      );
      console.log(\`Updated Ms. An Nhi schedules to active school \${activeSmileId} (\${smileActive.rows[0].name}):\`, uSmile.rowCount);
      await client.query(
        "UPDATE attendance SET school_id = $1 WHERE school_id = 'sch-1784509148643'",
        [activeSmileId]
      );
    }

    await client.query('COMMIT');
    console.log("\\n>>> GLOBAL INTEGRITY REPAIR COMPLETE <<<");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("REPAIR FAILED, ROLLBACK EXECUTED:", err);
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
