async function test() {
  const res = await fetch('http://localhost:3000/api/state');
  console.log(await res.json());
}
test();
