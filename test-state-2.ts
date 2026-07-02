async function test() {
  const res = await fetch('http://localhost:3000/api/state');
  const data = await res.json();
  console.log('Schools in DB:', data.schools.find(s => s.id === 'SCH_TEST'));
}
test();
