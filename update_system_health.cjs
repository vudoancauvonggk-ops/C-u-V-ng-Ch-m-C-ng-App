const fs = require('fs');
const path = './src/components/SystemHealth.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { Activity, Server, Database, HardDrive, BarChart2, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';",
  "import { Activity, Server, Database, HardDrive, BarChart2, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';\nimport { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';"
);

content = content.replace(
  "uptime: '15d 4h 23m'\n  });",
  "uptime: '15d 4h 23m'\n  });\n\n  const hourlyData = [\n    { time: '00:00', requests: 12, users: 2 },\n    { time: '01:00', requests: 5, users: 1 },\n    { time: '02:00', requests: 2, users: 0 },\n    { time: '03:00', requests: 8, users: 1 },\n    { time: '04:00', requests: 15, users: 2 },\n    { time: '05:00', requests: 45, users: 5 },\n    { time: '06:00', requests: 120, users: 15 },\n    { time: '07:00', requests: 350, users: 45 },\n    { time: '08:00', requests: 420, users: 52 },\n    { time: '09:00', requests: 380, users: 48 },\n    { time: '10:00', requests: 290, users: 35 },\n    { time: '11:00', requests: 310, users: 38 },\n    { time: '12:00', requests: 180, users: 22 },\n    { time: '13:00', requests: 250, users: 30 },\n    { time: '14:00', requests: 340, users: 42 },\n    { time: '15:00', requests: 320, users: 40 },\n    { time: '16:00', requests: 450, users: 55 },\n    { time: '17:00', requests: 580, users: 65 },\n    { time: '18:00', requests: 420, users: 48 },\n    { time: '19:00', requests: 280, users: 32 },\n    { time: '20:00', requests: 150, users: 20 },\n    { time: '21:00', requests: 90, users: 12 },\n    { time: '22:00', requests: 45, users: 6 },\n    { time: '23:00', requests: 25, users: 3 },\n  ];"
);

content = content.replace(
  "              </div>\n           </div>\n        </div>\n      </div>\n    </div>\n  );\n}",
  "              </div>\n           </div>\n        </div>\n      </div>\n\n      {/* Hourly Chart Section */}\n      <div className=\"bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mt-6\">\n        <h3 className=\"text-lg font-bold text-slate-800 mb-2 flex items-center gap-2\">\n          <BarChart2 className=\"h-5 w-5 text-slate-500\" /> Biểu Đồ Truy Cập Hôm Nay (24h)\n        </h3>\n        <p className=\"text-sm text-slate-500 mb-6\">Theo dõi thói quen đăng nhập và thao tác của giáo viên để phân bổ tài nguyên hợp lý.</p>\n        \n        <div className=\"h-80 w-full\">\n          <ResponsiveContainer width=\"100%\" height=\"100%\">\n            <BarChart\n              data={hourlyData}\n              margin={{\n                top: 5,\n                right: 30,\n                left: 0,\n                bottom: 5,\n              }}\n            >\n              <CartesianGrid strokeDasharray=\"3 3\" vertical={false} stroke=\"#e2e8f0\" />\n              <XAxis dataKey=\"time\" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />\n              <YAxis yAxisId=\"left\" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />\n              <YAxis yAxisId=\"right\" orientation=\"right\" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />\n              <Tooltip \n                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}\n                cursor={{fill: '#f1f5f9'}}\n              />\n              <Legend wrapperStyle={{ paddingTop: '20px' }} />\n              <Bar yAxisId=\"left\" dataKey=\"requests\" name=\"Số Request\" fill=\"#3b82f6\" radius={[4, 4, 0, 0]} />\n              <Bar yAxisId=\"right\" dataKey=\"users\" name=\"Giáo Viên Active\" fill=\"#10b981\" radius={[4, 4, 0, 0]} />\n            </BarChart>\n          </ResponsiveContainer>\n        </div>\n      </div>\n    </div>\n  );\n}"
);

fs.writeFileSync(path, content);
console.log('Updated');
