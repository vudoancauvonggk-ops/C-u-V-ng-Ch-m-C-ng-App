import { db } from './src/db';
import { users, teachers } from './src/db/schema';
import { eq, or } from 'drizzle-orm';

async function run() {
  const allUsers = await db.select().from(users).where(or(eq(users.username, 'GV_MRTUAN'), eq(users.username, 'MRTUAN')));
  console.log("Users:", allUsers);

  const allTeachers = await db.select().from(teachers).where(eq(teachers.id, 'MRTUAN'));
  console.log("Teacher:", allTeachers);

  process.exit(0);
}
run().catch(console.error);
