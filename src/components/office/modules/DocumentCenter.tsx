import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, Plus, File, Image as ImageIcon, FileArchive, Trash2, Download, Eye, X, Folder, ChevronRight, CornerLeftUp, FolderPlus, Printer, Lock, Unlock, Key, Copy, Check, EyeOff, ExternalLink } from 'lucide-react';
import { get, set as setIdb } from 'idb-keyval';

interface FolderDef {
  id: string;
  name: string;
  parentId: string | null;
  date: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  category: string;
  url?: string;
  file?: globalThis.File;
  folderId: string | null;
}

let globalFolders: FolderDef[] = [];
let globalDocuments: Document[] = [];
let hasLoadedFromIdb = false;

export function DocumentCenter() {
  const [documents, setDocumentsState] = useState<Document[]>(globalDocuments);
  const [folders, setFoldersState] = useState<FolderDef[]>(globalFolders);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // States for Security Area
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'security'>('documents');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordReal, setAdminPasswordReal] = useState('admin123');
  const [securityAccounts, setSecurityAccounts] = useState<any[]>([]);
  const [passwordError, setPasswordError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Adding/Editing Account Form State
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountUrl, setNewAccountUrl] = useState('');
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [newAccountNotes, setNewAccountNotes] = useState('');

  // Change Admin Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

  useEffect(() => {
    // Load Security Data
    get('ai_secure_accounts').then((val: any) => {
      if (val) {
        if (val.adminPassword) setAdminPasswordReal(val.adminPassword);
        if (val.accounts) setSecurityAccounts(val.accounts);
      } else {
        // Initialize with default examples matching company details
        const initialData = {
          adminPassword: 'admin123',
          accounts: [
            { id: '1', name: 'Cổng Thuế điện tử', url: 'https://thuedientu.gdt.gov.vn', username: '0317959691', password: 'TaxPassword123', notes: 'Mã PIN Chữ ký số: 111111' },
            { id: '2', name: 'Dịch vụ công BHXH', url: 'https://gddt.baohiemxahoi.gov.vn', username: '0317959691', password: 'BhxhPassword456', notes: 'Mã số BHXH: 0317959691' }
          ]
        };
        setSecurityAccounts(initialData.accounts);
        setIdb('ai_secure_accounts', initialData);
      }
    });

    if (!hasLoadedFromIdb) {
      get('documentCenterData').then((data: any) => {
        if (data) {
          const loadedDocs = (data.documents || []).map((doc: any) => {
            if (doc.file) {
              try {
                return { ...doc, url: URL.createObjectURL(doc.file) };
              } catch (e) {
                console.error("Error creating object URL for file", e);
              }
            }
            return doc;
          });
          globalDocuments = loadedDocs;
          globalFolders = data.folders || [];
          setDocumentsState(loadedDocs);
          setFoldersState(data.folders || []);
        }
        hasLoadedFromIdb = true;
      });
    }
  }, []);

  const setDocuments = (updater: any) => {
    setDocumentsState(prev => {
      const newDocs = typeof updater === 'function' ? updater(prev) : updater;
      globalDocuments = newDocs;
      setIdb('documentCenterData', { documents: globalDocuments, folders: globalFolders });
      return newDocs;
    });
  };

  const setFolders = (updater: any) => {
    setFoldersState(prev => {
      const newFolders = typeof updater === 'function' ? updater(prev) : updater;
      globalFolders = newFolders;
      setIdb('documentCenterData', { documents: globalDocuments, folders: globalFolders });
      return newFolders;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      const newDocs = files.map((file, index) => ({
        id: Date.now().toString() + index,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        date: new Date().toLocaleDateString('vi-VN'),
        category: file.name.toLowerCase().includes('bằng') ? 'Nhân sự' : 'Hồ sơ',
        url: URL.createObjectURL(file),
        file: file,
        folderId: currentFolderId
      }));

      setDocuments((prev: Document[]) => [...newDocs, ...prev]);
      setIsUploading(false);
    }, 1000);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderDef = {
      id: 'f' + Date.now(),
      name: newFolderName.trim(),
      parentId: currentFolderId,
      date: new Date().toLocaleDateString('vi-VN')
    };
    setFolders(prev => [newFolder, ...prev]);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-red-500" size={24} />;
    if (type.includes('image')) return <ImageIcon className="text-blue-500" size={24} />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="text-yellow-500" size={24} />;
    return <File className="text-slate-500" size={24} />;
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = () => {
    if (deletingId) {
      setDocuments(docs => docs.filter(d => d.id !== deletingId));
      setDeletingId(null);
    }
    if (deletingFolderId) {
      setFolders(f => f.filter(folder => folder.id !== deletingFolderId));
      // Also delete all documents inside
      setDocuments(docs => docs.filter(d => d.folderId !== deletingFolderId));
      setDeletingFolderId(null);
    }
  };

  const handlePrint = (doc: Document, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!doc.url) return;

    if (doc.type.includes('image') || doc.type.includes('pdf')) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = doc.url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Cleanup after printing (or attempting to print)
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 500);
      };
    }
  };

  const handleUnlock = () => {
    if (adminPasswordInput === adminPasswordReal) {
      setIsUnlocked(true);
      setAdminPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Mật khẩu không chính xác!');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setIsAddingAccount(false);
    setEditingAccountId(null);
    setIsChangingPassword(false);
  };

  const handleSaveAccount = () => {
    if (!newAccountName.trim() || !newAccountUsername.trim() || !newAccountPassword.trim()) {
      alert('Vui lòng điền các trường bắt buộc (Tên ứng dụng, Tên đăng nhập, Mật khẩu)');
      return;
    }

    let updatedAccounts = [...securityAccounts];
    if (editingAccountId) {
      updatedAccounts = updatedAccounts.map(acc => acc.id === editingAccountId ? {
        ...acc,
        name: newAccountName,
        url: newAccountUrl,
        username: newAccountUsername,
        password: newAccountPassword,
        notes: newAccountNotes
      } : acc);
      setEditingAccountId(null);
    } else {
      const newAcc = {
        id: Date.now().toString(),
        name: newAccountName,
        url: newAccountUrl,
        username: newAccountUsername,
        password: newAccountPassword,
        notes: newAccountNotes
      };
      updatedAccounts.push(newAcc);
    }

    setSecurityAccounts(updatedAccounts);
    setIdb('ai_secure_accounts', { adminPassword: adminPasswordReal, accounts: updatedAccounts });

    // Reset Form
    setIsAddingAccount(false);
    setNewAccountName('');
    setNewAccountUrl('');
    setNewAccountUsername('');
    setNewAccountPassword('');
    setNewAccountNotes('');
  };

  const handleStartEditAccount = (acc: any) => {
    setEditingAccountId(acc.id);
    setNewAccountName(acc.name);
    setNewAccountUrl(acc.url || '');
    setNewAccountUsername(acc.username);
    setNewAccountPassword(acc.password);
    setNewAccountNotes(acc.notes || '');
    setIsAddingAccount(true);
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản liên kết này?')) {
      const updatedAccounts = securityAccounts.filter(acc => acc.id !== id);
      setSecurityAccounts(updatedAccounts);
      setIdb('ai_secure_accounts', { adminPassword: adminPasswordReal, accounts: updatedAccounts });
    }
  };

  const handleChangeAdminPassword = () => {
    if (!newAdminPassword.trim()) {
      alert('Mật khẩu mới không được để trống!');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      alert('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    setAdminPasswordReal(newAdminPassword);
    setIdb('ai_secure_accounts', { adminPassword: newAdminPassword, accounts: securityAccounts });
    setPasswordChangeSuccess('Đã đổi mật khẩu Admin thành công!');
    setNewAdminPassword('');
    setConfirmAdminPassword('');
    setTimeout(() => setPasswordChangeSuccess(''), 3000);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentFolder = folders.find(f => f.id === currentFolderId);

  const filteredDocs = documents.filter(doc => 
    doc.folderId === currentFolderId &&
    (doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFolders = folders.filter(f => 
    f.parentId === currentFolderId &&
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 w-full mx-auto flex flex-col h-full min-h-0 relative">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa</h3>
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xóa {deletingFolderId ? 'thư mục này và toàn bộ tài liệu bên trong' : 'tài liệu này'}? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setDeletingId(null); setDeletingFolderId(null); }}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors text-sm"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreatingFolder && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tạo thư mục mới</h3>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Tên thư mục..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Tạo thư mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Modals */}
      {isAddingAccount && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingAccountId ? 'Sửa tài khoản liên kết' : 'Thêm tài khoản liên kết mới'}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tên ứng dụng / website *</label>
                <input 
                  type="text" 
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  placeholder="Ví dụ: Cổng thuế điện tử, Hoá đơn GTGT..."
                  className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Đường dẫn liên kết (URL)</label>
                <input 
                  type="text" 
                  value={newAccountUrl}
                  onChange={e => setNewAccountUrl(e.target.value)}
                  placeholder="Ví dụ: https://thuedientu.gdt.gov.vn"
                  className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tên đăng nhập / MST *</label>
                <input 
                  type="text" 
                  value={newAccountUsername}
                  onChange={e => setNewAccountUsername(e.target.value)}
                  placeholder="Tên đăng nhập hoặc Mã số thuế..."
                  className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mật khẩu truy cập *</label>
                <input 
                  type="text" 
                  value={newAccountPassword}
                  onChange={e => setNewAccountPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ghi chú (Mã PIN, Token...)</label>
                <textarea 
                  value={newAccountNotes}
                  onChange={e => setNewAccountNotes(e.target.value)}
                  placeholder="Mã PIN Chữ ký số, cách đăng nhập..."
                  rows={2}
                  className="w-full px-4.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsAddingAccount(false);
                  setEditingAccountId(null);
                  setNewAccountName('');
                  setNewAccountUrl('');
                  setNewAccountUsername('');
                  setNewAccountPassword('');
                  setNewAccountNotes('');
                }}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveAccount}
                className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm"
              >
                Lưu tài khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {isChangingPassword && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Đổi mật khẩu Admin</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  placeholder="Mật khẩu mới..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  value={confirmAdminPassword}
                  onChange={e => setConfirmAdminPassword(e.target.value)}
                  placeholder="Xác nhận mật khẩu..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsChangingPassword(false);
                  setNewAdminPassword('');
                  setConfirmAdminPassword('');
                }}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                Hủy
              </button>
              <button 
                onClick={handleChangeAdminPassword}
                className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm"
              >
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header and Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 shrink-0 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kho hồ sơ doanh nghiệp</h1>
          <p className="text-slate-500 mt-1">Quản lý giấy phép kinh doanh, bằng cấp và bảo mật liên kết</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-200/60 p-1.5 rounded-xl border border-slate-300/40 shrink-0">
          <button 
            onClick={() => setActiveSubTab('documents')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'documents' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Hồ sơ tài liệu
          </button>
          <button 
            onClick={() => setActiveSubTab('security')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeSubTab === 'security' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock size={12} className={activeSubTab === 'security' ? 'text-blue-600' : 'text-slate-400'} />
            Bảo mật & Tài khoản
          </button>
        </div>
      </div>

      {activeSubTab === 'documents' ? (
        <>
          {/* Document Section Actions */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div></div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm cursor-pointer"
              >
                <FolderPlus size={16} />
                Thư mục mới
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer text-sm">
                <Plus size={16} />
                Tải lên tài liệu
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Files Browser */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-slate-600">
                <button 
                  onClick={() => setCurrentFolderId(null)}
                  className={`hover:text-blue-600 font-medium ${!currentFolderId ? 'text-slate-900' : ''}`}
                >
                  Hồ sơ
                </button>
                {currentFolder && (
                  <>
                    <ChevronRight size={16} />
                    <span className="font-medium text-slate-900">{currentFolder.name}</span>
                  </>
                )}
              </div>
              
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                />
              </div>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block flex-1 overflow-auto">
              <div className="min-w-full inline-block align-middle">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-slate-500 font-medium text-left border-b border-slate-200">
                      <th className="pb-3 font-semibold">Tên tài liệu / Thư mục</th>
                      <th className="pb-3 font-semibold hidden md:table-cell">Lĩnh vực</th>
                      <th className="pb-3 font-semibold hidden sm:table-cell">Kích thước</th>
                      <th className="pb-3 font-semibold">Ngày tạo</th>
                      <th className="pb-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentFolderId && (
                      <tr 
                        onClick={() => {
                          const parent = folders.find(f => f.id === currentFolderId);
                          setCurrentFolderId(parent ? parent.parentId : null);
                        }}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-4 text-slate-500 font-medium flex items-center gap-3">
                          <CornerLeftUp size={20} />
                          Quay lại
                        </td>
                        <td className="py-4 hidden md:table-cell">-</td>
                        <td className="py-4 hidden sm:table-cell">-</td>
                        <td className="py-4">-</td>
                        <td className="py-4"></td>
                      </tr>
                    )}

                    {filteredFolders.length === 0 && filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Thư mục trống hoặc không tìm thấy tài liệu phù hợp.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {filteredFolders.map((folder) => (
                          <tr 
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="hover:bg-slate-50/50 cursor-pointer group transition-colors"
                          >
                            <td className="py-4 font-semibold text-slate-800 flex items-center gap-3">
                              <Folder className="text-blue-500 fill-blue-50" size={24} />
                              {folder.name}
                            </td>
                            <td className="py-4 text-slate-500 hidden md:table-cell">-</td>
                            <td className="py-4 text-slate-500 hidden sm:table-cell">-</td>
                            <td className="py-4 text-slate-500">{folder.date}</td>
                            <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => { setDeletingId(folder.id); setDeletingFolderId(folder.id); }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Xóa thư mục"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}

                        {filteredDocs.map((doc) => (
                          <tr 
                            key={doc.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-4 font-medium text-slate-800 flex items-center gap-3">
                              {getFileIcon(doc.type)}
                              {doc.name}
                            </td>
                            <td className="py-4 text-slate-500 hidden md:table-cell">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                                {doc.category}
                              </span>
                            </td>
                            <td className="py-4 text-slate-500 hidden sm:table-cell">{doc.size}</td>
                            <td className="py-4 text-slate-500">{doc.date}</td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => setViewingDoc(doc)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Xem chi tiết"
                                >
                                  <Eye size={18} />
                                </button>
                                {doc.url && (
                                  <a 
                                    href={doc.url} 
                                    download={doc.name}
                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Tải xuống"
                                  >
                                    <Download size={18} />
                                  </a>
                                )}
                                {doc.url && (doc.type.includes('image') || doc.type.includes('pdf')) && (
                                  <button 
                                    onClick={(e) => handlePrint(doc, e)}
                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="In tài liệu"
                                  >
                                    <Printer size={18} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDelete(doc.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Xóa tài liệu"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View: Cards Grid */}
            <div className="block md:hidden flex-1 overflow-y-auto space-y-3">
              {currentFolderId && (
                <div 
                  onClick={() => {
                    const parent = folders.find(f => f.id === currentFolderId);
                    setCurrentFolderId(parent ? parent.parentId : null);
                  }}
                  className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl active:bg-slate-100 cursor-pointer transition-colors"
                >
                  <CornerLeftUp size={20} className="text-slate-500" />
                  <span className="font-semibold text-slate-700 text-sm">Quay lại thư mục trước</span>
                </div>
              )}

              {filteredFolders.length === 0 && filteredDocs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Thư mục trống hoặc không tìm thấy tài liệu phù hợp.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Folders */}
                  {filteredFolders.map((folder) => (
                    <div 
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl active:bg-slate-50 cursor-pointer shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Folder className="text-blue-500 fill-blue-50 shrink-0" size={26} />
                        <div className="truncate">
                          <p className="font-bold text-slate-800 text-sm truncate leading-snug">{folder.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{folder.date}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setDeletingId(folder.id); 
                          setDeletingFolderId(folder.id); 
                        }}
                        className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  {/* Documents */}
                  {filteredDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-3"
                    >
                      <div className="flex items-start gap-3 truncate">
                        <div className="mt-0.5 shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-850 text-sm truncate leading-tight">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                              {doc.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{doc.size}</span>
                            <span className="text-[10px] text-slate-400 font-medium">• {doc.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Card Action Footer */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100/60">
                        <button 
                          onClick={() => setViewingDoc(doc)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 active:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-colors"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                        {doc.url && (
                          <a 
                            href={doc.url} 
                            download={doc.name}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 active:bg-green-100 text-green-600 rounded-xl text-xs font-bold transition-colors"
                          >
                            <Download size={13} />
                            <span>Tải về</span>
                          </a>
                        )}
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
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
        </>
      ) : (
        /* Security View Container */
        <div className="flex-1 flex flex-col min-h-0">
          {!isUnlocked ? (
            /* Password Locked Screen */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Mở khóa khu vực bảo mật</h2>
                <p className="text-sm text-slate-500 mb-6">Bạn đang cố gắng truy cập thông tin tài khoản và mật khẩu nhạy cảm. Vui lòng nhập mật khẩu Admin để tiếp tục.</p>
                
                <div className="w-full space-y-4 mb-4">
                  <input 
                    type="password"
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                    placeholder="Mật khẩu Admin..."
                    className="w-full px-4.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-center text-lg font-mono"
                  />
                  {passwordError && (
                    <p className="text-xs font-bold text-red-600">{passwordError}</p>
                  )}
                  <button 
                    onClick={handleUnlock}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Unlock size={18} /> Mở khóa
                  </button>
                </div>
                <p className="text-xs text-slate-400 italic">Mật khẩu mặc định là: <span className="font-semibold text-slate-500">admin123</span></p>
              </div>
            </div>
          ) : (
            /* Unlocked Accounts Screen */
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                    <Unlock size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      Đã mở khóa Bảo mật
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </h3>
                    <p className="text-xs text-slate-400">Chỉ dùng cho Ban Giám đốc và Người phụ trách tài chính</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="px-3.5 py-2 bg-slate-50 text-slate-700 border border-slate-250 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Key size={14} /> Đổi mật khẩu Admin
                  </button>
                  <button 
                    onClick={() => setIsAddingAccount(true)}
                    className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Thêm tài khoản
                  </button>
                  <button 
                    onClick={handleLock}
                    className="px-3.5 py-2 bg-red-50 text-red-755 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock size={14} /> Khóa lại
                  </button>
                </div>
              </div>

              {passwordChangeSuccess && (
                <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-lg p-3 text-sm font-semibold mb-4 text-center">
                  {passwordChangeSuccess}
                </div>
              )}

              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-slate-500 font-medium text-left border-b border-slate-200">
                      <th className="pb-3 font-semibold">Tên Ứng dụng / Web</th>
                      <th className="pb-3 font-semibold">Tên đăng nhập / MST</th>
                      <th className="pb-3 font-semibold">Mật khẩu</th>
                      <th className="pb-3 font-semibold">Ghi chú</th>
                      <th className="pb-3 font-semibold text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {securityAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Chưa lưu tài khoản bảo mật nào. Nhấn "Thêm tài khoản" để bắt đầu.
                        </td>
                      </tr>
                    ) : (
                      securityAccounts.map((acc) => {
                        const isShowingPassword = showPasswordMap[acc.id] === true;
                        return (
                          <tr key={acc.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 font-semibold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                {acc.name}
                                {acc.url && (
                                  <a 
                                    href={acc.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-indigo-600 hover:text-indigo-850 transition-colors inline-block cursor-pointer"
                                    title="Truy cập liên kết"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-4 font-medium text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="font-mono bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-xs">{acc.username}</span>
                                <button 
                                  onClick={() => handleCopyText(acc.username, acc.id + '_user')}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Copy username"
                                >
                                  {copiedId === acc.id + '_user' ? <span className="text-[10px] font-bold text-emerald-600">Copied!</span> : <Copy size={14} />}
                                </button>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-700 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-xs select-all">
                                  {isShowingPassword ? acc.password : '••••••••••••'}
                                </span>
                                <button 
                                  onClick={() => toggleShowPassword(acc.id)}
                                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                  title={isShowingPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                  {isShowingPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button 
                                  onClick={() => handleCopyText(acc.password, acc.id + '_pass')}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Copy mật khẩu"
                                >
                                  {copiedId === acc.id + '_pass' ? <span className="text-[10px] font-bold text-emerald-600">Copied!</span> : <Copy size={14} />}
                                </button>
                              </div>
                            </td>
                            <td className="py-4 text-slate-500 text-xs italic">{acc.notes || '-'}</td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  onClick={() => handleStartEditAccount(acc)}
                                  className="px-2 py-1 text-slate-500 hover:text-blue-600 border border-slate-200 rounded hover:bg-blue-50 text-xs transition-colors cursor-pointer"
                                >
                                  Sửa
                                </button>
                                <button 
                                  onClick={() => handleDeleteAccount(acc.id)}
                                  className="px-2 py-1 text-slate-550 hover:text-red-650 border border-slate-200 rounded hover:bg-red-50 text-xs transition-colors cursor-pointer"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
