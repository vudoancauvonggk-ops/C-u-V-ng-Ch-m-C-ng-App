import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const formattedUsers = [^]+?await fetch\('\/api\/users\/bulk', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ upsert: formattedUsers, remove: deletedIds \}\)\s*\}\);/g;

content = content.replace(regex, `
        const upsertRaw = updatedUsers.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        if (upsertRaw.length === 0 && deletedIds.length === 0) return;

        const formattedUsers = upsertRaw.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
          teacherId: u.teacherId || null,
          permissions: JSON.stringify(u.permissions || []),
          isDeleted: u.isDeleted || false
        }));

        const res = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert: formattedUsers, remove: deletedIds })
        });
`);

fs.writeFileSync('src/App.tsx', content);
console.log('Done users');
