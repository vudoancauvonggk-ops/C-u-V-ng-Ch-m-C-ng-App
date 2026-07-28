module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const migrationCode = `
import { db } from './src/db/index.ts';
import { schools, classes, schedules, attendance, schoolCancellations } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

function normalizeSchoolName(name: string): string {
  let s = name.trim();
  const lower = s.toLowerCase();
  if (lower === 'họa mi' || lower === 'hoạ mi' || lower === 'hoạ my' || lower === 'họa my') {
    return 'Họa Mi';
  }
  if (lower === 'hoạ mi nâu' || lower === 'họa mi nâu') {
    return 'Họa Mi Nâu';
  }
  if (lower === 'mn hoạ mi ql 13' || lower === 'mn hoạ mi ql13' || lower === 'mn họa mi ql 13') {
    return 'Họa Mi QL 13';
  }
  
  // Standard Title Case for other schools
  return s.split(/\\s+/).map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function cleanClassName(name: string): string {
  if (name.includes('-')) {
    const parts = name.split('-');
    return parts.slice(0, -1).join('-').trim();
  }
  return name.trim();
}

async function run() {
  await db.transaction(async (tx) => {
    const schs = await tx.select().from(schools).where(eq(schools.isDeleted, false));
    const cls = await tx.select().from(classes).where(eq(classes.isDeleted, false));
    const skds = await tx.select().from(schedules).where(eq(schedules.isDeleted, false));
    const atts = await tx.select().from(attendance);
    const canc = await tx.select().from(schoolCancellations);

    console.log('=== GLOBAL MIGRATION SIMULATION ===');
    console.log('Active schools in DB:', schs.length);
    console.log('Active classes in DB:', cls.length);
    console.log('Active schedules in DB:', skds.length);

    // Group active classes by target school name
    const activeClasses = cls.filter(c => skds.some(s => s.classId === c.id));
    console.log('Active classes (having active schedules):', activeClasses.length);

    // Build a map of normalized school name -> list of existing schools in DB
    const schoolMap = {};
    schs.forEach(s => {
      const normName = normalizeSchoolName(s.name);
      if (!schoolMap[normName]) {
        schoolMap[normName] = [];
      }
      schoolMap[normName].push(s);
    });

    const destSchools = {}; // normName -> schoolObj
    const newSchoolsToCreate = [];

    // First resolve the school destination for each active class
    const classDestinations = [];

    for (const c of activeClasses) {
      let targetSchoolName = '';
      if (c.name.includes('-')) {
        const parts = c.name.split('-');
        targetSchoolName = normalizeSchoolName(parts[parts.length - 1]);
      } else {
        const origSchool = schs.find(s => s.id === c.schoolId);
        targetSchoolName = normalizeSchoolName(origSchool ? origSchool.name : 'Trường chưa rõ');
      }

      let destSchool = destSchools[targetSchoolName];
      if (!destSchool) {
        // Find existing school in DB
        const candidates = schoolMap[targetSchoolName] || [];
        if (candidates.length > 0) {
          destSchool = candidates[0];
          destSchools[targetSchoolName] = destSchool;
        } else {
          // Create new dynamic school
          destSchool = {
            id: 'SCH_DYN_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            name: targetSchoolName,
            address: 'Trường chưa phân khu (Tự động tách từ dữ liệu)',
            contactPerson: 'Ban Giám Hiệu',
            phone: '',
            lat: 10.8234,
            lng: 106.7788,
            qrCodeData: 'DYN_' + Math.random().toString(36).substring(2, 10),
            isDeleted: false
          };
          newSchoolsToCreate.push(destSchool);
          destSchools[targetSchoolName] = destSchool;
        }
      }

      classDestinations.push({
        classObj: c,
        destSchool,
        cleanedName: cleanClassName(c.name)
      });
    }

    console.log('New schools to create count:', newSchoolsToCreate.length);
    console.log('Unique destination schools resolved:', Object.keys(destSchools).length);

    // Keep track of resolved classes in each destination school to merge duplicates
    const resolvedClasses = {}; // schoolId -> className -> classObj
    let mergeCount = 0;
    let updateCount = 0;

    for (const dest of classDestinations) {
      const destSchoolId = dest.destSchool.id;
      const cleanedName = dest.cleanedName;

      if (!resolvedClasses[destSchoolId]) {
        resolvedClasses[destSchoolId] = {};
      }

      const duplicateClass = resolvedClasses[destSchoolId][cleanedName];
      if (duplicateClass) {
        mergeCount++;
      } else {
        resolvedClasses[destSchoolId][cleanedName] = dest.classObj;
        updateCount++;
      }
    }

    console.log('Classes to update (move/rename):', updateCount);
    console.log('Classes to merge (duplicates):', mergeCount);

    console.log('\\nSimulating successfully! Rolling back transaction...');
    throw new Error('ROLLBACK_INTENTIONAL');
  });
}

run().catch(err => {
  if (err.message === 'ROLLBACK_INTENTIONAL') {
    console.log('Transaction rolled back successfully. No database changes were made.');
  } else {
    console.error(err);
  }
  process.exit(0);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cat << 'EOF' > /app/simulate_global_migration.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('cd /app && npx tsx -r dotenv/config simulate_global_migration.ts && rm simulate_global_migration.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect(config);
