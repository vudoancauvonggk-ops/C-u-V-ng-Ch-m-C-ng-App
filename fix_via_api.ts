export async function fix() {
  const res = await fetch('http://localhost:3000/api/state');
  const state = await res.json();
  
  if (!state.teachers || state.teachers.length === 0 || !state.schedules || state.schedules.length === 0) {
    console.log("No data");
    return;
  }
  
  const ids = state.teachers.map(t => t.id).slice(0, 5);
  for (let i = 0; i < state.schedules.length; i++) {
    state.schedules[i].teacherId = ids[i % ids.length];
  }
  
  const payload = {
    teachers: state.teachers,
    schools: state.schools,
    classes: state.classes,
    schedules: state.schedules,
    attendance: state.attendance
  };
  
  const r2 = await fetch('http://localhost:3000/api/sync-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log("Response:", await r2.json());
}
fix();
