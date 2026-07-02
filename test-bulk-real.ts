async function run() {
  console.log("Fetching state...");
  const stateRes = await fetch('http://localhost:3000/api/state');
  const state = await stateRes.json();
  const schools = state.schools;
  console.log("Schools count:", schools.length);
  if(schools.length > 0) {
    schools[0].name = schools[0].name + ' edited';
    console.log("Updating school:", schools[0]);
    try {
        const res = await fetch('http://localhost:3000/api/schools/bulk', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ upsert: [schools[0]], remove: [] })
        });
        console.log('Schools Bulk API:', res.status, await res.text());
    } catch(err) {
        console.error('Fetch error:', err);
    }
  }

}
run();
