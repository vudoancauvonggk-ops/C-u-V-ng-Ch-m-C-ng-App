import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /for \(const item of upsert\) \{\s*await db\.insert\(([a-zA-Z]+)\)\.values\(item\)\.onConflictDoUpdate\(\{\s*target: ([a-zA-Z]+)\.id,\s*set: item\s*\}\);\s*\}/g;

content = content.replace(regex, (match, tableName, targetName) => {
    return `
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          await Promise.all(chunk.map((item: any) => 
            db.insert(${tableName}).values(item).onConflictDoUpdate({
              target: ${targetName}.id,
              set: item
            })
          ));
        }`;
});

fs.writeFileSync('server.ts', content);
console.log('Done');
