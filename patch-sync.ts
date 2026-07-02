import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldLogic = `    if (mode === 'overwrite') {
      finalTeachers = processTeachers;
      finalSchools = processSchools;
      finalClasses = processClasses;
      finalSchedules = remappedUpdatedSchedules;
    } else {
      // Merge schools`;

const newLogic = `    if (mode === 'overwrite') {
      // Mark everything as deleted first, we will un-delete them if they match
      finalSchools = finalSchools.map(s => ({ ...s, isDeleted: true }));
      finalClasses = finalClasses.map(c => ({ ...c, isDeleted: true }));
      finalTeachers = finalTeachers.map(t => ({ ...t, isDeleted: true }));
      finalSchedules = finalSchedules.map(s => ({ ...s, isDeleted: true }));
    }
    
    {
      // Merge schools`;

content = content.replace(oldLogic, newLogic);

// Remove the db-wipe API call
const wipeLogic = `    // Sync database asynchronously
    try {
      if (mode === 'overwrite') {
        await fetch('/api/db-wipe', { method: 'DELETE' });
      }

      await fetch('/api/sync-bulk', {`;

const newWipeLogic = `    // Sync database asynchronously
    try {
      await fetch('/api/sync-bulk', {`;

content = content.replace(wipeLogic, newWipeLogic);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx');
