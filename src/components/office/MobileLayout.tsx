import React from 'react';
import { 
  Target, 
  FileSignature, 
  FolderOpen, 
  Menu, 
  X, 
  LogOut, 
  ShieldCheck, 
  FileText, 
  PenTool, 
  CheckSquare, 
  Calendar, 
  BookOpen, 
  History, 
  FileSearch, 
  Monitor, 
  Award,
  Send,
  LayoutDashboard
} from 'lucide-react';
import { Tab } from './types';
import { MODULES } from './Sidebar';

interface MobileHeaderProps {
  activeTab: Tab;
  onLogout: () => void;
  onMenuOpen: () => void;
}

export function MobileHeader({ activeTab, onLogout, onMenuOpen }: MobileHeaderProps) {
  const activeModule = MODULES.find(m => m.id === activeTab);
  const title = activeModule ? activeModule.label : 'Office AI';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuOpen}
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-bold text-white text-base tracking-wide truncate max-w-[200px]">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-650 shrink-0">
          <span className="text-xs text-white font-medium">AD</span>
        </div>
      </div>
    </header>
  );
}

interface MobileNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onMoreClick: () => void;
}

export function MobileNav({ activeTab, setActiveTab, onMoreClick }: MobileNavProps) {
  const navItems = [
    { id: 'command-center', label: 'Trang chủ', icon: Target },
    { id: 'contracts', label: 'Hợp đồng', icon: FileSignature },
    { id: 'documents', label: 'Hồ sơ', icon: FolderOpen },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-lg flex items-center justify-around py-2.5 px-3 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isActive ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onMoreClick}
        className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-slate-200 cursor-pointer"
      >
        <Menu size={20} />
        <span className="text-[10px] font-semibold tracking-wide">Thêm</span>
      </button>
    </nav>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void;
}

export function MobileDrawer({ isOpen, onClose, activeTab, setActiveTab, onLogout }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Panel */}
      <div className="absolute inset-x-0 bottom-0 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] max-h-[85vh] flex flex-col transition-transform duration-300 transform translate-y-0 shadow-2xl">
        {/* Pull Handle */}
        <div 
          onClick={onClose}
          className="w-12 h-1.5 bg-slate-700 hover:bg-slate-600 rounded-full mx-auto my-3.5 cursor-pointer shrink-0" 
        />

        {/* Header */}
        <div className="px-6 pb-3 flex justify-between items-center border-b border-slate-800 shrink-0">
          <h2 className="text-white font-bold text-lg tracking-wide">Tất cả chức năng</h2>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modules Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-4">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const isActive = activeTab === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveTab(module.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                      : 'bg-slate-950/40 border-slate-850 text-slate-300 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-semibold mt-2.5 text-center leading-tight truncate w-full">
                    {module.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Profile & Logout */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
              <span className="text-sm text-white font-semibold">AD</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Admin User</p>
              <p className="text-xs text-slate-500">Quản trị viên</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}
