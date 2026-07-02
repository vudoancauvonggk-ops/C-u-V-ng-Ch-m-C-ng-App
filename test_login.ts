const fetch = globalThis.fetch;

async function test() {
  const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}
test();
