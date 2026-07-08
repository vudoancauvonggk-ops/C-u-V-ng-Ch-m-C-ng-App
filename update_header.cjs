const fs = require('fs');
const path = './src/components/TeacherDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="flex items-center gap-2">\s*<label className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-1\.5 rounded-full transition flex items-center justify-center text-slate-500 hover:text-blue-600" title="Đổi ảnh nền">[\s\S]*?<span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0\.5 rounded-full font-bold">Trực tuyến<\/span>\s*<\/div>/;

const replacement = `<div className="flex items-center gap-2">
              {currentUser?.role === 'admin' && (
                <div className="flex items-center gap-1.5 mr-2">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <input
                    type="date"
                    value={adminOverrideDate}
                    onChange={(e) => setAdminOverrideDate(e.target.value)}
                    className="p-1 border border-neutral-200 rounded text-[10px] font-medium outline-none bg-slate-100 text-slate-600 focus:bg-white focus:border-blue-300"
                    title="Đổi ngày giả lập (Admin)"
                  />
                  {adminOverrideDate && (
                    <button onClick={() => setAdminOverrideDate('')} className="text-red-500 hover:text-red-700 p-1 rounded-full bg-red-50" title="Xoá ngày giả lập">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Trực tuyến</span>
            </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
