const finalTeachers = [ { id: 'GV_MSHA', name: 'Ms. Hà' } ];
const mappedSc = { teacherId: 'GV_MSHA' };
let potentialSlug = mappedSc.teacherId.replace('GV_', '').toLowerCase();
console.log(potentialSlug);
let target = finalTeachers.find(t => {
  const tSlug = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  console.log(tSlug);
  return tSlug === potentialSlug || mappedSc.teacherId.toLowerCase().includes(tSlug);
});
console.log(target);
