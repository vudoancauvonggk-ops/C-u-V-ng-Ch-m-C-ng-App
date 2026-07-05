async function test() {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3000/api/attendance/images/clear', { method: 'DELETE' });
  const text = await res.text();
  console.log(text);
}
test();
