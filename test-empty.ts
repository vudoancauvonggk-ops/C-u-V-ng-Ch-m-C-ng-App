async function run() {
  const payload = {
    teachers: [],
    schools: [],
    classes: [],
    schedules: []
  };
  
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3000/api/sync-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(res.status, await res.text());
}
run();
