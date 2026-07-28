import React from 'react';
import { Tab } from '../../types';
import { MODULES } from '../Sidebar';
import { Construction } from 'lucide-react';

export function PlaceholderModule({ activeTab }: { activeTab: Tab }) {
  const moduleConfig = MODULES.find(m => m.id === activeTab);
  
  return (
    <div className="flex-1 h-full p-8 flex flex-col items-center justify-center text-slate-500">
      <Construction size={64} className="text-slate-300 mb-6" />
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
        {moduleConfig?.label || 'Đang xây dựng'}
      </h2>
      <p className="max-w-md text-center">
        Tính năng này đang trong quá trình phát triển và sẽ sớm được cập nhật. Vui lòng chọn các tính năng khác trên thanh menu.
      </p>
    </div>
  );
}
