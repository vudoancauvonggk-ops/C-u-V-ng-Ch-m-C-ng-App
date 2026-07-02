async function test() {
  const ts = Date.now();
  const schoolId = 'SCH_' + ts;
  const teacherId = 'GV_' + ts;
  const classId = 'CLS_' + ts;
  const scheduleId = 'SKD_' + ts;

  const res1 = await fetch('http://localhost:3000/api/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: schoolId, name: 'New School', lat: 0, lng: 0 })
  });
  console.log('School', await res1.text());

  const res2 = await fetch('http://localhost:3000/api/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: teacherId, name: 'New Teacher', status: 'active', hourlyRate: 50000, monthlyAllowance: 0, bonus: 0, deduction: 0 })
  });
  console.log('Teacher', await res2.text());

  const res3 = await fetch('http://localhost:3000/api/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: classId, name: 'New Class', schoolId: schoolId, studentCount: 20, standardPeriods: 3 })
  });
  console.log('Class', await res3.text());

  const res4 = await fetch('http://localhost:3000/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: scheduleId, dayOfWeek: 2, session: 'morning', teacherId: teacherId, schoolId: schoolId, classId: classId, periods: 3 })
  });
  console.log('Schedule', await res4.text());
}
test();
