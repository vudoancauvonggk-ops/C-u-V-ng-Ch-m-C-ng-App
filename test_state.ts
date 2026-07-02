const fetch = globalThis.fetch;

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/state');
    const dbState = await res.json();
    console.log(
      'Teachers:', dbState.teachers?.length,
      'Schedules:', dbState.schedules?.length,
      'Schools:', dbState.schools?.length,
      'Classes:', dbState.classes?.length
    );
  } catch (e) {
    console.error(e);
  }
}
test();
