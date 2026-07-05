const fs = require('fs');
const path = './index.html';
let content = fs.readFileSync(path, 'utf8');

const metaTags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Cầu Vồng" />
    <link rel="apple-touch-icon" href="/pwa-192x192.svg" />
    <meta name="mobile-web-app-capable" content="yes" />
`;

content = content.replace(
  '    <title>Quản Lý Giáo Viên</title>',
  metaTags + '    <title>Quản Lý Giáo Viên</title>'
);

fs.writeFileSync(path, content);
