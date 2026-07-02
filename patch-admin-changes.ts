import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// Modify the requestType UI check in Changes tab
content = content.replace(
  `                        <span className={\`text-xs font-mono font-bold px-2 py-0.5 rounded \${
                          req.requestType === 'sick_leave' ? 'bg-red-50 text-red-700 border border-red-100' :
                          req.requestType === 'swap_shift' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }\`}>
                          {req.requestType === 'sick_leave' ? 'XIN NGHỈ PHÉP' :
                           req.requestType === 'swap_shift' ? 'ĐỔI CA DẠY' : 'DẠY THẾ/LỚT'}
                        </span>`,
  `                        <span className={\`text-xs font-mono font-bold px-2 py-0.5 rounded \${
                          req.requestType === 'sick_leave' ? 'bg-red-50 text-red-700 border border-red-100' :
                          req.requestType === 'swap_shift' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          req.requestType === 'art_performance' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }\`}>
                          {req.requestType === 'sick_leave' ? 'XIN NGHỈ PHÉP' :
                           req.requestType === 'swap_shift' ? 'ĐỔI CA DẠY' : 
                           req.requestType === 'art_performance' ? 'COI VĂN NGHỆ' : 'DẠY THẾ/LỚT'}
                        </span>`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patched AdminDashboard.tsx for requestType display!');
