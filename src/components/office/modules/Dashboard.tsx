import React from 'react';
import { FileSignature, CheckSquare, ShieldAlert, Clock, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const stats = [
    { label: 'Hợp đồng chờ ký', value: '0', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Công việc quá hạn', value: '0', icon: Clock, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Cảnh báo tuân thủ', value: '0', icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Nhiệm vụ hoàn thành', value: '0%', icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="p-8 w-full mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan hệ thống</h1>
        <p className="text-slate-500 mt-1">Chào mừng bạn trở lại! Dưới đây là tóm tắt hoạt động văn phòng hôm nay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-500" />
            AI Insight & Cảnh báo
          </h2>
          <div className="space-y-4">
            <div className="p-8 text-center text-slate-500">
              <TrendingUp size={48} className="mx-auto text-slate-300 mb-3" />
              <p>Chưa có cảnh báo hoặc insight nào từ AI.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-emerald-500" />
            Lịch làm việc AI (Tuần này)
          </h2>
          <div className="relative">
            <div className="space-y-6 relative">
              <div className="p-8 text-center text-slate-500">
                <Clock size={48} className="mx-auto text-slate-300 mb-3" />
                <p>Không có lịch trình làm việc nào cho tuần này.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
