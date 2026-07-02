import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const oldUserInsert = `            // Auto-create user account for each synced teacher if not exist
            if (item.id) {
              const uId = 'u_' + item.id;
              await db.insert(users).values({
                id: uId,
                username: item.id,
                password: '123456789',
                role: 'member',
                teacherId: item.id,
                permissions: '[]',
                isDeleted: item.isDeleted || false
              }).onConflictDoNothing({ target: users.username });
            }`;

const newUserInsert = `            // Auto-create user account for each synced teacher if not exist
            if (item.id) {
              const uId = 'u_' + item.id;
              await db.insert(users).values({
                id: uId,
                username: item.id,
                password: '123456789',
                role: 'member',
                teacherId: item.id,
                permissions: '[]',
                isDeleted: item.isDeleted || false
              }).onConflictDoUpdate({
                target: users.username,
                set: {
                  isDeleted: item.isDeleted || false
                }
              });
            }`;

content = content.replace(oldUserInsert, newUserInsert);

fs.writeFileSync('server.ts', content);
console.log('Patched server.ts');
