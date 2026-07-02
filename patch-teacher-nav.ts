import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

const bottomNav = `
            {/* BOTTOM APP NAVIGATION BAR */}
            <div className="bg-white border-t border-slate-200 p-2 flex justify-around items-center rounded-b-[2rem] relative z-20">
              {[
                { id: 'home', label: 'Trang Chủ', icon: Sparkles },
                { id: 'schedule', label: 'Lịch Dạy', icon: Calendar },
                { id: 'salary', label: 'Lương', icon: DollarSign },
                { id: 'swap', label: 'Đơn Từ', icon: ArrowLeftRight },
                { id: 'school', label: 'Định Vị', icon: MapPin }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMobileTab(tab.id as any)}
                    className={\`flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-xl transition cursor-pointer \${
                      isSelected ? 'text-blue-600 font-bold bg-blue-50/70 scale-105' : 'hover:text-slate-900 hover:bg-neutral-100'
                    }\`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-[9px] font-bold tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
`;

content = content.replace('{/* EDIT SCHEDULE MODAL */}', bottomNav + '\n\n          {/* EDIT SCHEDULE MODAL */}');

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Restored Bottom Nav');
