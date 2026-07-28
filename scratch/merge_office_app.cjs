const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/Admin/antigravity/Quản-Lý-Văn-Phòng-AI';
const destDir = 'c:/Users/Admin/Downloads/Cầu Vồng_BACKUP/12';

function copyFileSync(src, dest, transform = null) {
  let content = fs.readFileSync(src);
  if (transform) {
    content = transform(content.toString());
  }
  fs.writeFileSync(dest, content);
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function merge() {
  console.log('--- Starting Project Merge ---');

  // 1. Create Target Directories
  const officeDest = path.join(destDir, 'src/components/office');
  const modulesDest = path.join(officeDest, 'modules');
  ensureDirSync(officeDest);
  ensureDirSync(modulesDest);

  // 2. Copy types.ts
  copyFileSync(
    path.join(srcDir, 'src/types.ts'),
    path.join(officeDest, 'types.ts')
  );
  console.log('Copied types.ts');

  // 3. Copy components (root components of the office app)
  const componentsSrc = path.join(srcDir, 'src/components');
  const componentFiles = fs.readdirSync(componentsSrc).filter(f => f.endsWith('.tsx'));
  componentFiles.forEach(file => {
    const srcPath = path.join(componentsSrc, file);
    const destPath = path.join(officeDest, file);
    copyFileSync(srcPath, destPath, (content) => {
      // Rewrite import to types.ts inside components (was ../types, now ./types)
      return content.replace(/from\s+['"]\.\.\/types['"]/g, "from './types'");
    });
    console.log(`Copied component: ${file}`);
  });

  // 4. Copy modules
  const modulesSrc = path.join(componentsSrc, 'modules');
  const moduleFiles = fs.readdirSync(modulesSrc).filter(f => f.endsWith('.tsx'));
  moduleFiles.forEach(file => {
    const srcPath = path.join(modulesSrc, file);
    const destPath = path.join(modulesDest, file);
    copyFileSync(srcPath, destPath); // Keep ../types imports as is since they are in modules/
    console.log(`Copied module: ${file}`);
  });

  // 5. Merge package.json dependencies
  const srcPkg = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf8'));
  const destPkg = JSON.parse(fs.readFileSync(path.join(destDir, 'package.json'), 'utf8'));

  destPkg.dependencies = destPkg.dependencies || {};
  destPkg.devDependencies = destPkg.devDependencies || {};

  const keysToCopy = [
    '@types/multer',
    '@types/nodemailer',
    'idb-keyval',
    'imapflow',
    'mailparser',
    'mammoth',
    'multer',
    'nodemailer',
    'pdf-parse',
    '@types/mailparser',
    '@types/pdf-parse'
  ];

  keysToCopy.forEach(key => {
    if (srcPkg.dependencies[key]) {
      destPkg.dependencies[key] = srcPkg.dependencies[key];
    } else if (srcPkg.devDependencies[key]) {
      destPkg.devDependencies[key] = srcPkg.devDependencies[key];
    }
  });

  fs.writeFileSync(path.join(destDir, 'package.json'), JSON.stringify(destPkg, null, 2), 'utf8');
  console.log('Merged package.json dependencies');

  // 6. Merge server.ts -> server_office.ts
  // We will read server.ts from the office app and output server_office.ts in destDir
  // We need to export `officeRouter` instead of calling `app.listen()` and handling Vite middleware
  const serverSrcContent = fs.readFileSync(path.join(srcDir, 'server.ts'), 'utf8');
  let transformedServer = serverSrcContent
    // Change express app instantiation to an express Router
    .replace(/const app = express\(\);/g, 'const app = express.Router();')
    // Remove process.env.PORT declaration or change it so it doesn't conflict
    .replace(/const PORT = process\.env\.PORT || 3000;/g, '')
    // Exclude the Vite development server mounting & app.listen blocks
    .replace(/if \(process\.env\.NODE_ENV !== 'production'\)[\s\S]+?startServer\(\);/g, 'export const officeRouter = app;')
    // Ensure body parser middlewares are applied to the router
    .replace('const app = express.Router();', 'const app = express.Router();\napp.use(express.json());\napp.use(express.urlencoded({ extended: true }));');

  fs.writeFileSync(path.join(destDir, 'server_office.ts'), transformedServer, 'utf8');
  console.log('Created server_office.ts with express Router');

  console.log('--- Project Merge Completed Successfully ---');
}

merge().catch(err => {
  console.error('Merge failed:', err);
});
