import * as fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace("console.log('Received bulk sync payload...');", "console.log(`Received bulk sync payload: teachers=${teachList?.length} schools=${schList?.length} classes=${clsList?.length} schedules=${skdList?.length}`);");
fs.writeFileSync('server.ts', content);
