import { db } from './src/db/index.ts';
import { schools } from './src/db/schema.ts';

async function test() {
  try {
    const data = { id: 'SCH_TEST2', name: 'Test', lat: 0, lng: 0 };
    await db.insert(schools).values(data).onConflictDoUpdate({
      target: schools.id,
      set: data
    });
    console.log('Success');
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
