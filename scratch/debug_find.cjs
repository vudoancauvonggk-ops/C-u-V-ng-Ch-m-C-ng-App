const fs = require('fs');
const file = 'c:/Users/Admin/Downloads/Cầu Vồng_BACKUP/12/src/components/AdminDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the exact pattern
const searchTerm = 'firstAtt && (';
const idx = content.indexOf(searchTerm);
console.log('Found "firstAtt && (" at index:', idx);
if (idx >= 0) {
  // Show context
  console.log('Context around match:');
  const ctx = content.substring(idx - 150, idx + 300);
  console.log(JSON.stringify(ctx));
}
