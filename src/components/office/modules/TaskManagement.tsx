import React, { useState, useEffect } from 'react';
import { CheckSquare, Circle, Clock, User, Plus, Trash2, X, Check, RefreshCw } from 'lucide-react';
import { get, set as setIdb } from 'idb-keyval';

export function TaskManagement() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('Admin User');
  const [newDeadline, setNewDeadline] = useState('Hôm nay');

  useEffect(() => {
    loadTasks();

    // Listen for real-time updates from Telegram sync
    const handleSyncUpdate = () => {
      loadTasks();
    };
    window.addEventListener('tasks_updated', handleSyncUpdate);
    return () => window.removeEventListener('tasks_updated', handleSyncUpdate);
  }, []);

  const loadTasks = async () => {
    try {
      const data = await get('ai_tasks_idb');
      if (data && Array.isArray(data)) {
        setTasks(data);
      } else {
        // Initialize with default tasks if empty
        const defaultTasks = [
          { id: 't1', title: 'Kê khai thuế GTGT & TNCN Quý 2', status: 'pending', assignee: 'Kế toán Trưởng', deadline: '31/07/2026', source: 'Hệ thống', dateCreated: '08/07/2026' },
          { id: 't2', title: 'Hoàn thiện hồ sơ báo cáo tai nạn lao động 6 tháng', status: 'pending', assignee: 'Admin User', deadline: 'Hôm nay', source: 'Y tế', dateCreated: '08/07/2026' },
          { id: 't3', title: 'Ký kết phụ lục gia hạn hợp đồng Công ty Đông Hải', status: 'done', assignee: 'Giám đốc', deadline: 'Đã hoàn thành', source: 'Hợp đồng', dateCreated: '07/07/2026' }
        ];
        await setIdb('ai_tasks_idb', defaultTasks);
        setTasks(defaultTasks);
      }
    } catch (e) {
      console.error('Error loading tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (taskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: t.status === 'done' ? 'pending' : 'done',
          deadline: t.status === 'done' ? 'Hôm nay' : 'Đã hoàn thành'
        };
      }
      return t;
    });
    setTasks(updatedTasks);
    await setIdb('ai_tasks_idb', updatedTasks);
    
    // Trigger sync background
    triggerBackgroundSync(updatedTasks);
  };

  const handleDeleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    await setIdb('ai_tasks_idb', updatedTasks);
    
    // Trigger sync background
    triggerBackgroundSync(updatedTasks);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = {
      id: 'task-' + Date.now(),
      title: newTitle.trim(),
      status: 'pending',
      assignee: newAssignee,
      deadline: newDeadline,
      source: 'Thủ công',
      dateCreated: new Date().toLocaleDateString('vi-VN')
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    await setIdb('ai_tasks_idb', updatedTasks);

    setNewTitle('');
    setIsAdding(false);
    
    // Trigger sync background
    triggerBackgroundSync(updatedTasks);
  };

  const triggerBackgroundSync = async (currentTasks: any[]) => {
    try {
      const contracts = await get('ai_contracts_idb') || [];
      const complianceData = await get('ai_compliance_data') || {};
      
      // Send quick sync in background so Telegram bot sees the update
      await fetch('/api/telegram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts, tasks: currentTasks, compliance: complianceData.reminders || [] })
      });
    } catch (e) {
      console.warn('Background sync failed:', e);
    }
  };

  return (
    <div className="p-8 w-full max-w-5xl mx-auto h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý công việc</h1>
          <p className="text-slate-500 mt-1">Nhiệm vụ tự động tạo từ các phân hệ và thủ công</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm text-sm"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? 'Hủy bỏ' : 'Thêm công việc'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-semibold text-slate-800 text-sm">Thêm nhiệm vụ mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tên công việc</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nhập nội dung công việc..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Người thực hiện</label>
              <input
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                placeholder="Tên người thực hiện..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="w-1/3">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Hạn hoàn thành</label>
              <input
                type="text"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                placeholder="Ví dụ: 31/07/2026 hoặc Hôm nay"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer self-end flex items-center gap-1"
            >
              <Check size={14} />
              Lưu nhiệm vụ
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <RefreshCw className="animate-spin mr-2" size={20} />
            Đang tải danh sách công việc...
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <CheckSquare size={48} className="text-slate-300 mb-4 animate-bounce" />
            <p className="font-medium text-slate-700">Tuyệt vời! Không có công việc nào đang tồn đọng.</p>
            <p className="text-xs text-slate-400 mt-1">Các công việc mới tạo từ Web hoặc Telegram Bot sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  task.status === 'done' 
                    ? 'bg-slate-50/70 border-slate-200/60 opacity-75' 
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                } transition-all duration-200`}
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => handleToggleStatus(task.id)}
                    className="mt-0.5 cursor-pointer shrink-0 transition-transform active:scale-90"
                  >
                    {task.status === 'done' ? (
                      <CheckSquare size={20} className="text-emerald-500" />
                    ) : (
                      <Circle size={20} className="text-slate-300 hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                  <div>
                    <p className={`font-semibold text-sm ${task.status === 'done' ? 'text-slate-450 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      Tạo từ: <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 text-[10px]">{task.source}</span>
                      {task.dateCreated && <span className="text-slate-400">• {task.dateCreated}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <User size={14} className="text-slate-400" />
                    <span className="font-medium">{task.assignee}</span>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    task.status === 'done' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : task.deadline === 'Hôm nay' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' 
                        : 'bg-slate-50 text-slate-700 border border-slate-200/60'
                  }`}>
                    <Clock size={12} />
                    <span>{task.deadline}</span>
                  </div>

                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Xóa công việc"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
