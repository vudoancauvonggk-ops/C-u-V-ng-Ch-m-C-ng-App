import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /for \(const [a-z]+ of ([a-zA-Z]+List)\) \{\s*await db\.insert\(([a-zA-Z]+)\)\.values\([a-z]+\)\.onConflictDoUpdate\(\{\s*target: ([a-zA-Z]+)\.id,\s*set: [a-z]+\s*\}\);\s*\}/g;

content = content.replace(regex, (match, listName, tableName, targetName) => {
    return `
        const chunks = [];
        for (let i = 0; i < ${listName}.length; i += 100) {
          chunks.push(${listName}.slice(i, i + 100));
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
console.log('Done sync-bulk');
