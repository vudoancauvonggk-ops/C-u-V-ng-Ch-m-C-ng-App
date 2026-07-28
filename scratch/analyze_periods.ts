import * as dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

const config: any = {};
if (process.env.DATABASE_URL) {
  config.connectionString = process.env.DATABASE_URL;
} else {
  config.host = process.env.SQL_HOST;
  config.user = process.env.SQL_USER;
  config.password = process.env.SQL_PASSWORD;
  config.database = process.env.SQL_DB_NAME;
}

const pool = new Pool(config);

async function analyze() {
  try {
    const client = await pool.connect();
    
    // Get all attendance logs for 2026-07
    const query = `
      SELECT a.school_id, s.name as school_name, a.periods, count(*) as count
      FROM attendance a
      LEFT JOIN schools s ON a.school_id = s.id
      WHERE a.date LIKE '2026-07%'
      GROUP BY a.school_id, s.name, a.periods
    `;
    
    const res = await client.query(query);
    console.log("Attendance logs for 2026-07:");
    
    let totalRaw = 0;
    let totalAdjusted = 0;
    
    const adjustPeriod = (p: number) => {
      if (p === 1) return 2;
      if (p === 2) return 2.5;
      return p;
    };
    
    for (const row of res.rows) {
      const p = Number(row.periods || 0);
      const cnt = Number(row.count);
      const raw = p * cnt;
      const adj = adjustPeriod(p) * cnt;
      totalRaw += raw;
      totalAdjusted += adj;
      
      console.log(`School: ${row.school_name} | Periods in DB: ${p} | Count: ${cnt} | Raw subtotal: ${raw} | Adjusted subtotal: ${adj}`);
    }
    
    console.log("\n------------------------------------------------");
    console.log(`TOTAL RAW PERIODS IN DB: ${totalRaw}`);
    console.log(`TOTAL ADJUSTED PERIODS (used in payroll logic): ${totalAdjusted}`);
    console.log("------------------------------------------------");
    
    client.release();
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

analyze();
