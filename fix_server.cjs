const fs = require('fs');
const path = 'server.ts';
let content = fs.readFileSync(path, 'utf8');

// Insert after app.use(express.json({ limit: '50mb' }));
const target = "app.use(express.json({ limit: '50mb' }));";
const replacement = `app.use(express.json({ limit: '50mb' }));

  let lastStateUpdate = Date.now();
  
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          lastStateUpdate = Date.now();
        }
      });
    }
    next();
  });

  app.get('/api/state/timestamp', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ timestamp: lastStateUpdate, version: SERVER_VERSION });
  });`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
