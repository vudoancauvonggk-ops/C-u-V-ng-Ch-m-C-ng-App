async function test() {
  try {
    console.log("Adding school...");
    let res = await fetch('http://localhost:3000/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'SCH_TEST', name: 'Test', lat: 0, lng: 0 })
    });
    console.log(res.status, await res.text());

    console.log("Adding teacher...");
    res = await fetch('http://localhost:3000/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'GV_TEST', name: 'Test', status: 'active', hourlyRate: 50000, monthlyAllowance: 0, bonus: 0, deduction: 0 })
    });
    console.log(res.status, await res.text());

    console.log("Adding class...");
    res = await fetch('http://localhost:3000/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'CLS_TEST', name: 'Test', schoolId: 'SCH_TEST', studentCount: 20, standardPeriods: 3 })
    });
    console.log(res.status, await res.text());

    console.log("Adding schedule...");
    res = await fetch('http://localhost:3000/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'SKD_TEST', dayOfWeek: 2, session: 'morning', teacherId: 'GV_TEST', schoolId: 'SCH_TEST', classId: 'CLS_TEST', periods: 3 })
    });
    console.log(res.status, await res.text());

  } catch (err) {
    console.error('Error:', err);
  }
}
test();
