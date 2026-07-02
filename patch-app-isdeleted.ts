import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const schoolMergeOld = `finalSchools[idx] = { ...finalSchools[idx], ...sch, id: finalSchools[idx].id, isDeleted: finalSchools[idx].isDeleted || sch.isDeleted };`;
const schoolMergeNew = `finalSchools[idx] = { ...finalSchools[idx], ...sch, id: finalSchools[idx].id, isDeleted: sch.isDeleted };`;

const classMergeOld = `finalClasses[idx] = { ...finalClasses[idx], ...cls, id: finalClasses[idx].id, isDeleted: finalClasses[idx].isDeleted || cls.isDeleted };`;
const classMergeNew = `finalClasses[idx] = { ...finalClasses[idx], ...cls, id: finalClasses[idx].id, isDeleted: cls.isDeleted };`;

const teacherMergeOld = `finalTeachers[idx] = { ...finalTeachers[idx], ...imported, id: finalTeachers[idx].id, isDeleted: finalTeachers[idx].isDeleted || imported.isDeleted };`;
const teacherMergeNew = `finalTeachers[idx] = { ...finalTeachers[idx], ...imported, id: finalTeachers[idx].id, isDeleted: imported.isDeleted };`;

content = content.replace(schoolMergeOld, schoolMergeNew);
content = content.replace(classMergeOld, classMergeNew);
content = content.replace(teacherMergeOld, teacherMergeNew);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx isDeleted merges');
