module.paths.push('c:\\Users\\Admin\\Downloads\\Cầu Vồng_BACKUP\\12\\node_modules');
const { Client } = require('ssh2');

const config = {
  host: '103.82.21.133',
  port: 22,
  username: 'root',
  password: '5A3N84JY026MdF2n',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  conn.exec(`cd /app && npx tsx -r dotenv/config -e "
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
      if (lower === 'mn hoạ mi ql 13' || lower === 'mn hoạ mi ql13' || lower === 'mn họa mi ql 13' || lower === 'mn hoạ mi ql13') {
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
      const skds = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const atts = await db.select().from(attendance);
      const canc = await db.select().from(schoolCancellations);

      console.log('=== SIMULATING MIGRATION ===');

      // Map of schoolId -> normalized school name
      const schoolMapping = {
        'SCH_DYN_027EF3CC': 'Họa Mi',      // Main Họa Mi
        'sch_1784301329427': 'Họa Mi Nâu',  // Main Họa Mi Nâu
        'SCH_DYN_E8DF7AAA': 'Hoa Lan',      // Main Hoa Lan
        'sch-1783602028461': 'Họa Mi QL 13' // Main Họa Mi QL 13
      };

      const schoolIdByName = {
        'Họa Mi': 'SCH_DYN_027EF3CC',
        'Họa Mi Nâu': 'sch_1784301329427',
        'Hoa Lan': 'SCH_DYN_E8DF7AAA',
        'Họa Mi QL 13': 'sch-1783602028461'
      };

      // Process each class belonging to the target schools
      const activeTargetClasses = cls.filter(c => targetSchoolIds.includes(c.schoolId) && !c.isDeleted);

      console.log('Target classes found:', activeTargetClasses.length);

      const classMerges = []; // { sourceClassId, targetClassId, newSchoolId, newClassName }
      const classUpdates = []; // { classId, newSchoolId, newClassName }

      // Keep track of resolved classes in each destination school to detect duplicates
      // destinationSchoolId -> cleanClassName -> classInfo
      const resolvedClasses = {};

      // Initialize resolvedClasses with existing classes in the main schools that won't be moved
      // but will be cleaned
      activeTargetClasses.forEach(c => {
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
          return;
        }

        const cleanedName = cleanClassName(c.name);

        if (!resolvedClasses[destSchoolId]) {
          resolvedClasses[destSchoolId] = {};
        }

        if (resolvedClasses[destSchoolId][cleanedName]) {
          // Duplicate found! We will merge this class into the already resolved one
          const targetClass = resolvedClasses[destSchoolId][cleanedName];
          classMerges.push({
            sourceClassId: c.id,
            targetClassId: targetClass.id,
            destSchoolId,
            cleanedName
          });
        } else {
          resolvedClasses[destSchoolId][cleanedName] = c;
          classUpdates.push({
            classId: c.id,
            destSchoolId,
            cleanedName
          });
        }
      });

      console.log('\\n=== CLASS UPDATES (To keep and rename/move) ===');
      classUpdates.forEach(up => {
        const destSchool = schs.find(s => s.id === up.destSchoolId);
        const originalClass = cls.find(c => c.id === up.classId);
        const sourceSchool = schs.find(s => s.id === originalClass.schoolId);
        console.log(\`Move class: "\${originalClass.name}" (from \${sourceSchool.name}) -> School: "\${destSchool.name}", Clean Name: "\${up.cleanedName}"\`);
      });

      console.log('\\n=== CLASS MERGES (Duplicates to merge) ===');
      classMerges.forEach(mg => {
        const sourceClass = cls.find(c => c.id === mg.sourceClassId);
        const targetClass = cls.find(c => c.id === mg.targetClassId);
        const sourceSchool = schs.find(s => s.id === sourceClass.schoolId);
        const targetSchool = schs.find(s => s.id === targetClass.schoolId);
        console.log(\`Merge class: "\${sourceClass.name}" (from \${sourceSchool.name}) into class "\${targetClass.name}" (in \${targetSchool.name})\`);
      });

      // Schools to delete
      const schoolsToDelete = targetSchoolIds.filter(id => !Object.keys(schoolMapping).includes(id));
      console.log('\\n=== SCHOOLS TO DELETE ===');
      schoolsToDelete.forEach(id => {
        const s = schs.find(sc => sc.id === id);
        console.log(\`Delete school: "\${s ? s.name : id}" (\${id})\`);
      });
    }
    run().then(() => process.exit(0)).catch(console.error);
  "`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect(config);
