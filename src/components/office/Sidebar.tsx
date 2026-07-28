import React from 'react';
import { 
  Target,
  LayoutDashboard, 
  FileSignature, 
  ShieldCheck, 
  FolderOpen, 
  FileText, 
  PenTool, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  BookOpen, 
  History, 
  FileSearch, 
  Monitor, 
  Award,
  Send,
  LogOut,
  Users
} from 'lucide-react';
import { Tab, ModuleConfig } from './types';

export const MODULES: ModuleConfig[] = [
  { id: 'command-center', label: 'Trung tâm công việc', icon: Target },
  { id: 'contracts', label: 'Quản lý hợp đồng', icon: FileSignature },
  { id: 'documents', label: 'Kho hồ sơ doanh nghiệp', icon: FolderOpen },
  { id: 'compliance', label: 'Quản lý tuân thủ', icon: ShieldCheck },
  { id: 'telegram', label: 'Liên kết Telegram', icon: Send },
  { id: 'candidates', label: 'Quản lý tuyển dụng', icon: Users },
];

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout?: () => void;
  currentUser?: any;
  hasPermission?: (perm: string) => boolean;
}

export function Sidebar({ activeTab, setActiveTab, onLogout, currentUser, hasPermission }: SidebarProps) {
  const allowedModules = MODULES.filter((module) => {
    if (!currentUser || currentUser.role === 'admin') return true;
    if (!hasPermission) return true;
    if (hasPermission('can_access_office_ai')) return true;

    if (module.id === 'command-center') return hasPermission('can_view_office_command_center');
    if (module.id === 'contracts') return hasPermission('can_view_office_contracts');
    if (module.id === 'documents') return hasPermission('can_view_office_documents');
    if (module.id === 'compliance') return hasPermission('can_view_office_compliance');
    if (module.id === 'telegram') return hasPermission('can_view_office_telegram');
    if (module.id === 'candidates') return hasPermission('can_view_office_candidates');
    return false;
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800">
      <div className="p-4 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold">
          AI
        </div>
        <h1 className="text-white font-semibold text-lg tracking-tight">Office Pro</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {allowedModules.map((module) => {
          const Icon = module.icon;
          const isActive = activeTab === module.id;
          return (
            <button
              key={module.id}
              onClick={() => setActiveTab(module.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-blue-200' : 'text-slate-400'} />
              <span className="truncate">{module.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs text-white font-medium">AD</span>
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">Quản trị viên</p>
            </div>
          </div>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
