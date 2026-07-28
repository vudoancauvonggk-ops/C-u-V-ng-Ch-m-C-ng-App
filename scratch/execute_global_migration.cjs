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
import { eq, and } from 'drizzle-orm';

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

    console.log('=== STARTING GLOBAL DATABASE MIGRATION ===');
    
    // Group active classes by target school name
    const activeClasses = cls.filter(c => skds.some(s => s.classId === c.id));
    console.log('Active classes to process:', activeClasses.length);

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
    const createdSchools = [];

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
          
          // Rename existing school to correct casing
          if (destSchool.name !== targetSchoolName) {
            console.log('Renaming existing school: ', destSchool.name, '->', targetSchoolName);
            await tx.update(schools).set({ name: targetSchoolName }).where(eq(schools.id, destSchool.id));
            destSchool.name = targetSchoolName;
          }
        } else {
          // Create new dynamic school
          const newSchool = {
            id: 'SCH_DYN_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            name: targetSchoolName,
            address: 'Trường chưa phân khu (Tự động tách từ dữ liệu)',
            contactPerson: 'Ban Giám Hiệu',
            phone: '',
            lat: 10.8234 + (Math.random() * 0.05 - 0.025),
            lng: 106.7788 + (Math.random() * 0.05 - 0.025),
            qrCodeData: 'DYN_' + Math.random().toString(36).substring(2, 10),
            isDeleted: false
          };
          console.log('Creating new school:', targetSchoolName, '(', newSchool.id, ')');
          await tx.insert(schools).values(newSchool);
          createdSchools.push(newSchool);
          destSchool = newSchool;
          destSchools[targetSchoolName] = destSchool;
        }
      }

      classDestinations.push({
        classObj: c,
        destSchool,
        cleanedName: cleanClassName(c.name)
      });
    }

    // Keep track of resolved classes in each destination school to merge duplicates
    const resolvedClasses = {}; // schoolId -> className -> classObj

    for (const dest of classDestinations) {
      const destSchoolId = dest.destSchool.id;
      const cleanedName = dest.cleanedName;
      const c = dest.classObj;

      if (!resolvedClasses[destSchoolId]) {
        resolvedClasses[destSchoolId] = {};
      }

      const duplicateClass = resolvedClasses[destSchoolId][cleanedName];
      if (duplicateClass) {
        // Merge! Update schedules, attendance, cancellations
        console.log('Merging class', c.name, '(', c.id, ') into', cleanedName, '(', duplicateClass.id, ') under school', dest.destSchool.name);
        
        await tx.update(schedules).set({ classId: duplicateClass.id, schoolId: destSchoolId }).where(eq(schedules.classId, c.id));
        await tx.update(attendance).set({ classId: duplicateClass.id, schoolId: destSchoolId }).where(eq(attendance.classId, c.id));
        await tx.update(schoolCancellations).set({ classId: duplicateClass.id, schoolId: destSchoolId }).where(eq(schoolCancellations.classId, c.id));
        await tx.update(classes).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(classes.id, c.id));
      } else {
        // Keep and update
        resolvedClasses[destSchoolId][cleanedName] = c;
        
        console.log('Updating class:', c.name, '-> name:', cleanedName, ', schoolId:', destSchoolId);
        await tx.update(classes).set({ name: cleanedName, schoolId: destSchoolId }).where(eq(classes.id, c.id));
        
        await tx.update(schedules).set({ schoolId: destSchoolId }).where(eq(schedules.classId, c.id));
        await tx.update(attendance).set({ schoolId: destSchoolId }).where(eq(attendance.classId, c.id));
        await tx.update(schoolCancellations).set({ schoolId: destSchoolId }).where(eq(schoolCancellations.classId, c.id));
      }
    }

    // Soft-delete schools that no longer have active schedules
    const currentSkds = await tx.select().from(schedules).where(eq(schedules.isDeleted, false));
    const activeSchoolIds = new Set(currentSkds.map(s => s.schoolId));
    
    for (const s of schs) {
      if (!activeSchoolIds.has(s.id)) {
        console.log('Soft-deleting empty school:', s.name, '(', s.id, ')');
        await tx.update(schools).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(schools.id, s.id));
      }
    }

    // Soft-delete classes that no longer have active schedules
    const activeClassIds = new Set(currentSkds.map(s => s.classId));
    for (const c of cls) {
      if (!activeClassIds.has(c.id)) {
        console.log('Soft-deleting empty class:', c.name, '(', c.id, ')');
        await tx.update(classes).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(classes.id, c.id));
      }
    }

    console.log('=== GLOBAL MIGRATION COMPLETED SUCCESSFULLY ===');
  });
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cat << 'EOF' > /app/execute_global_migration.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Uploaded execute_global_migration.ts, now executing...');
      conn.exec('cd /app && npx tsx -r dotenv/config execute_global_migration.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('close', () => {
          conn.exec('rm /app/execute_global_migration.ts', () => {
            console.log('Cleaned up execute_global_migration.ts');
            conn.end();
          });
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
