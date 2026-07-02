import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  // We'll try to find an existing user with this UID.
  const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }

  // If not found, let's try to find a user by email/username if it matches somehow?
  // Actually, maybe we just create a new member user if not exists?
  // Let's create a new member user.
  const result = await db.insert(users)
    .values({
      id: `u_${uid}`, // generate an id based on uid
      uid,
      email,
      username: email.split('@')[0], // use first part of email as username
      password: '', // no password for google auth
      role: 'member',
      permissions: JSON.stringify([]),
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
      },
    })
    .returning();

  return result[0];
}
