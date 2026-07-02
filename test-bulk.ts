async function test() {
  const res = await fetch('http://localhost:3000/api/schools/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upsert: [{ id: 'SCH_BULK1', name: 'Bulk Test', lat: 0, lng: 0 }], remove: [] })
  });
  console.log(await res.text());
}
test();
