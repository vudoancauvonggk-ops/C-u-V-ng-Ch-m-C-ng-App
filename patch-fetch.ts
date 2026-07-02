import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /await fetch\('(\/api\/[a-z-]+\/bulk)', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: (.*)\s*\}\);/g;

content = content.replace(regex, (match, url, body) => {
  return `const res = await fetch('${url}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ${body}
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error ${url}:', errText);
          throw new Error(errText);
        }`;
});

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
