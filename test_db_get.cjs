async function test() {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3000/api/attendance', { method: 'GET' });
  const text = await res.text();
  console.log(text);
}
test();
