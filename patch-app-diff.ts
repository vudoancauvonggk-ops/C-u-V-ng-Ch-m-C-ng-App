import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const resources = [
  { name: 'Teachers', prop: 'teachers' },
  { name: 'Schools', prop: 'schools' },
  { name: 'Classes', prop: 'classes' },
  { name: 'Schedules', prop: 'schedules' },
  { name: 'Attendance', prop: 'attendance' },
  { name: 'Changes', prop: 'changes' },
  { name: 'Users', prop: 'users' }
];

resources.forEach(({ name, prop }) => {
  const funcRegex = new RegExp(`const handleUpdate${name} = async \\(updated${name}: [a-zA-Z\\[\\]]+\\) => \\{\\s*const prevIds = state\\.${prop}\\.map\\([a-z] => [a-z]\\.id\\);`, 'g');
  
  content = content.replace(funcRegex, `const handleUpdate${name} = async (updated${name}: any[]) => {
    const prevIds = state.${prop}.map(item => item.id);
    const prevStateArray = state.${prop};`);

  const fetchRegex = new RegExp(`await fetch\\('/api/${prop}/bulk', \\{\\s*method: 'POST',\\s*headers: \\{ 'Content-Type': 'application/json' \\},\\s*body: JSON\\.stringify\\(\\{ upsert: (updated${name}(?:\\.map\\([^{]+\\{[^}]+\\}\\))?), remove: deletedIds \\}\\)\\s*\\}\\);`);
  
  content = content.replace(fetchRegex, `
        const upsert = updated${name}.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/${prop}/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });`);
});

fs.writeFileSync('src/App.tsx', content);
console.log('Done optimizing App.tsx bulk calls');
