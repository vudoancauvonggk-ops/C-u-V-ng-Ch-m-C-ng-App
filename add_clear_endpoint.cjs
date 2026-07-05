const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

const newEndpoint = `
  app.delete('/api/attendance/images/clear', async (req, res) => {
    try {
      // Set photoUrl to empty string for all attendance records
      // In a real app, you might want to delete only old ones, but here we clear all to free space
      await db.update(attendance).set({ photoUrl: '' });
      res.json({ success: true, message: 'All attendance images cleared' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/attendance/:id', async (req, res) => {`;

content = content.replace("app.delete('/api/attendance/:id', async (req, res) => {", newEndpoint);
fs.writeFileSync(path, content);
console.log('Updated server.ts');
