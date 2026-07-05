const fs = require('fs');
const path = './server.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "    } catch (err: any) {\n      res.status(500).json({ error: err.message });\n    }\n  });\n\n  app.delete('/api/attendance/:id', async (req, res) => {",
  "    } catch (err: any) {\n      console.log('PG ERROR:', err);\n      res.status(500).json({ error: err.message, stack: err.stack, code: err.code, detail: err.detail });\n    }\n  });\n\n  app.delete('/api/attendance/:id', async (req, res) => {"
);
fs.writeFileSync(path, content);
