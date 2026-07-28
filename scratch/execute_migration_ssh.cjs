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
  const lower = name.toLowerCase().trim();
  if (lower === 'họa mi' || lower === 'hoạ mi' || lower === 'hoạ my' || lower === 'họa my') {
    return 'Họa Mi';
  }
  if (lower === 'hoạ mi nâu' || lower === 'họa mi nâu') {
    return 'Họa Mi Nâu';
  }
  if (lower === 'mn hoạ mi ql 13' || lower === 'mn hoạ mi ql13' || lower === 'mn họa mi ql 13') {
    return 'Họa Mi QL 13';
  }
  return name.trim();
}

function cleanClassName(name: string): string {
  if (name.includes('-')) {
    const parts = name.split('-');
    return parts.slice(0, -1).join('-').trim();
  }
  return name.trim();
}

async function run() {
  const targetSchoolIds = [
    'sch_1784301329427', // Hoạ Mi Nâu
    'SCH_DYN_027EF3CC', // Họa Mi
    'SCH_DYN_E8DF7AAA', // Hoa Lan
    'sch-1783602028461', // MN HOẠ MI QL 13
    'SCH_DYN_B636F89E',  // Hoạ mi
    'SCH_1783664214934'  // Hoạ My
  ];

  const schs = await db.select().from(schools);
  const cls = await db.select().from(classes);

  console.log('=== STARTING DATABASE MIGRATION ===');

  const schoolIdByName = {
    'Họa Mi': 'SCH_DYN_027EF3CC',
    'Họa Mi Nâu': 'sch_1784301329427',
    'Hoa Lan': 'SCH_DYN_E8DF7AAA',
    'Họa Mi QL 13': 'sch-1783602028461'
  };

  // Re-name main schools to correct casing
  for (const [name, id] of Object.entries(schoolIdByName)) {
    const s = schs.find(sc => sc.id === id);
    if (s && s.name !== name) {
      console.log('Renaming school:', s.name, '->', name);
      await db.update(schools).set({ name }).where(eq(schools.id, id));
    }
  }

  // Active target classes
  const activeTargetClasses = cls.filter(c => targetSchoolIds.includes(c.schoolId) && !c.isDeleted);

  const resolvedClasses = {};

  for (const c of activeTargetClasses) {
    let extractedSchool = '';
    if (c.name.includes('-')) {
      const parts = c.name.split('-');
      extractedSchool = normalizeSchoolName(parts[parts.length - 1]);
    } else {
      const origSchool = schs.find(s => s.id === c.schoolId);
      extractedSchool = normalizeSchoolName(origSchool ? origSchool.name : '');
    }

    const destSchoolId = schoolIdByName[extractedSchool];
    if (!destSchoolId) {
      console.warn('Unknown destination school for:', c.name);
      continue;
    }

    const cleanedName = cleanClassName(c.name);

    if (!resolvedClasses[destSchoolId]) {
      resolvedClasses[destSchoolId] = {};
    }

    const duplicateClass = resolvedClasses[destSchoolId][cleanedName];

    if (duplicateClass) {
      // Duplicate! Merge this class (c) into the duplicateClass
      console.log('Merging class', c.name, '(', c.id, ') into', cleanedName, '(', duplicateClass.id, ')');
      
      // Update all schedules pointing to source class
      await db.update(schedules).set({ classId: duplicateClass.id, schoolId: destSchoolId }).where(eq(schedules.classId, c.id));
      
      // Update all attendance records pointing to source class
      await db.update(attendance).set({ classId: duplicateClass.id, schoolId: destSchoolId }).where(eq(attendance.classId, c.id));
      
      // Update school cancellations
      await db.update(schoolCancellations).set({ classId: duplicateClass.id, schoolId: destSchoolId }).where(eq(schoolCancellations.classId, c.id));

      // Soft delete the source class
      await db.update(classes).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(classes.id, c.id));
    } else {
      // Keep and update this class
      resolvedClasses[destSchoolId][cleanedName] = c;
      
      console.log('Updating class:', c.name, '-> name:', cleanedName, ', schoolId:', destSchoolId);
      await db.update(classes).set({ name: cleanedName, schoolId: destSchoolId }).where(eq(classes.id, c.id));

      // Update the schedules of this class to have the new schoolId
      await db.update(schedules).set({ schoolId: destSchoolId }).where(eq(schedules.classId, c.id));

      // Update the attendance of this class to have the new schoolId
      await db.update(attendance).set({ schoolId: destSchoolId }).where(eq(attendance.classId, c.id));

      // Update the school cancellations of this class to have the new schoolId
      await db.update(schoolCancellations).set({ schoolId: destSchoolId }).where(eq(schoolCancellations.classId, c.id));
    }
  }

  // Soft-delete other schools that were split
  const schoolsToDelete = targetSchoolIds.filter(id => !Object.keys(schoolIdByName).map(n => schoolIdByName[n]).includes(id));
  for (const id of schoolsToDelete) {
    const s = schs.find(sc => sc.id === id);
    console.log('Soft-deleting school:', s ? s.name : id, '(', id, ')');
    await db.update(schools).set({ isDeleted: true, deletedAt: new Date().toISOString() }).where(eq(schools.id, id));
  }

  console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  // Write migration code to a file
  conn.exec(`cat << 'EOF' > /app/migrate_schools.ts\n${migrationCode}\nEOF\n`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('Uploaded migrate_schools.ts, now executing...');
      
      // Execute the migration script
      conn.exec('cd /app && npx tsx -r dotenv/config migrate_schools.ts', (err2, execStream) => {
        if (err2) throw err2;
        execStream.on('close', () => {
          // Clean up the migration script file
          conn.exec('rm /app/migrate_schools.ts', () => {
            console.log('Cleaned up migrate_schools.ts');
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
