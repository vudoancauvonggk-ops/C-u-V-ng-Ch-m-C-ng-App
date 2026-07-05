const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("} catch (err) {\n      res.status(500).json({ error: err.message });", "} catch (err: any) {\n      res.status(500).json({ error: err.message });");
fs.writeFileSync(path, content);
console.log('Fixed type in server.ts');
