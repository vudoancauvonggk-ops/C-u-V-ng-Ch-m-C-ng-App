import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Plus, FileText, AlertTriangle, FileSearch, RefreshCcw, Loader2, X, UploadCloud, ChevronLeft, Calendar, FileCheck, History, ShieldAlert, Bot, Trash2, CheckCircle2, Edit2 } from 'lucide-react';
import { get, set as setIdb } from 'idb-keyval';

export function ContractCenter() {
  const [contracts, setContractsState] = useState<any[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  useEffect(() => {
    get('ai_contracts_idb').then(async (data: any) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const loaded = data.map((c: any) => {
          if (c.file) {
            try {
              return { ...c, url: URL.createObjectURL(c.file) };
            } catch (e) {
              console.error(e);
            }
          }
          return c;
        });
        setContractsState(loaded);
      } else {
        try {
          const res = await fetch('/api/office-state');
          if (res.ok) {
            const st = await res.json();
            if (st.contracts && Array.isArray(st.contracts) && st.contracts.length > 0) {
              setContractsState(st.contracts);
              await setIdb('ai_contracts_idb', st.contracts);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setHasLoaded(true);
    });
    get('ai_contracts_custom_years').then((val) => {
      if (val && Array.isArray(val)) {
        setCustomYears(val);
      }
    });
  }, []);

  const setContracts = (updater: any) => {
    setContractsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setIdb('ai_contracts_idb', next);
      fetch('/api/office-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts: next })
      }).catch(() => {});
      return next;
    });
  };

  const handleAddCustomYear = () => {
    if (newYearValue && !customYears.includes(newYearValue)) {
      const newCustomYears = [...customYears, newYearValue];
      setCustomYears(newCustomYears);
      setIdb('ai_contracts_custom_years', newCustomYears);
      setSelectedYearTab(newYearValue);
    }
    setNewYearValue('');
    setIsAddingYear(false);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearTab, setSelectedYearTab] = useState<string>('all');
  const [customYears, setCustomYears] = useState<string[]>([]);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newYearValue, setNewYearValue] = useState('');
  const [editingYear, setEditingYear] = useState<{old: string, new: string} | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'ai' | 'timeline' | 'file' | 'append' | 'renew' | 'audit'>('info');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  const handleEditCustomYear = () => {
    if (editingYear && editingYear.new && editingYear.old !== editingYear.new) {
      if (!customYears.includes(editingYear.new)) {
        const newCustomYears = customYears.map(y => y === editingYear.old ? editingYear.new : y);
        setCustomYears(newCustomYears);
        setIdb('ai_contracts_custom_years', newCustomYears);
        if (selectedYearTab === editingYear.old) {
          setSelectedYearTab(editingYear.new);
        }
      }
    }
    setEditingYear(null);
  };

  const handleDeleteCustomYear = (yearToDelete: string) => {
    const newCustomYears = customYears.filter(y => y !== yearToDelete);
    setCustomYears(newCustomYears);
    setIdb('ai_contracts_custom_years', newCustomYears);
    if (selectedYearTab === yearToDelete) {
      setSelectedYearTab('all');
    }
  };

  const handleDeleteContract = (contractId: string) => {
    setContractToDelete(contractId);
  };

  const confirmDelete = () => {
    if (contractToDelete) {
      setContracts((prev: any) => prev.filter((c: any) => c.id !== contractToDelete));
      if (selectedContract?.id === contractToDelete) {
        setSelectedContract(null);
      }
      setContractToDelete(null);
    }
  };

  const cancelDelete = () => {
    setContractToDelete(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []) as File[];
    if (files.length > 0) {
      handleFileUpload({ target: { files } } as any);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      setIsUploading(true);
      
      let lastNewContract = null;
      for (const file of files) {
        try {
          const reader = new FileReader();
          
          const base64Promise = new Promise<string>((resolve, reject) => {
             reader.onload = (e) => {
                const result = e.target?.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
             };
             reader.onerror = () => reject(new Error('Lỗi khi đọc file trên trình duyệt'));
             reader.readAsDataURL(file);
          });
          
          const base64String = await base64Promise;
          
          const response = await fetch('/api/analyze-contract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               fileBase64: base64String,
               fileName: file.name,
               mimeType: file.type
            }),
          });
          
          let data;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            if (text.includes('Cookie check') || text.includes('Action required to load your app')) {
              throw new Error('IFRAME_BLOCKED');
            }
            throw new Error('Máy chủ trả về phản hồi không hợp lệ cho file: ' + file.name);
          }

          if (!response.ok) {
            throw new Error(data?.error || 'Lỗi khi phân tích hợp đồng: ' + file.name);
          }
          
          const newContract = {
            id: data.contractNumber || `HD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            title: data.title || file.name,
            partner: data.partner || 'Chưa xác định',
            status: data.status || 'Đang hiệu lực',
            startDate: data.startDate || '---',
            date: data.date || '---',
            alerts: data.alerts || [],
            content: data.content || 'Nội dung hợp đồng...',
            signer: 'Admin',
            taxCode: data.taxCode || 'Chưa cập nhật',
            file: file,
            url: URL.createObjectURL(file)
          };
          
          lastNewContract = newContract;
          setContracts((prev: any) => [newContract, ...prev]);
        } catch (error: any) {
          if (error.message === 'IFRAME_BLOCKED') {
             setUploadError('Trình duyệt của bạn đang chặn tải file. Vui lòng nhấn nút "Open in new tab" (biểu tượng mũi tên ở góc trên bên phải) để mở ứng dụng ở thẻ mới.');
             setIsUploading(false);
             return;
          } else if (error.message === 'Failed to fetch') {
             setUploadError('Không thể đọc file. Lỗi kết nối mạng, hoặc file đang bị khóa (Mở trong Word). Vui lòng ĐÓNG FILE WORD rồi thử lại. Hoặc mở ứng dụng ở thẻ mới (Open in new tab).');
             setIsUploading(false);
             return;
          } else {
             console.error('Upload error:', error);
             setUploadError(error.message || 'Có lỗi xảy ra khi phân tích hợp đồng. Vui lòng thử lại.');
          }
        }
      }
      
      setIsUploading(false);
      setIsAddModalOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (lastNewContract) {
        setSelectedContract(lastNewContract);
        setDetailTab('ai');
      }
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === '---') return Infinity;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    return Infinity;
  };

  const getRemainingDays = (dateStr: string) => {
    const timestamp = parseDate(dateStr);
    if (timestamp === Infinity) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(timestamp);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusDisplay = (contract: any) => {
    if (contract.status === 'Đang phân tích' || contract.status === 'Chờ ký' || contract.status === 'Đã thanh lý') {
      let badge = 'bg-slate-100 text-slate-700';
      if (contract.status === 'Chờ ký') badge = 'bg-blue-100 text-blue-700';
      if (contract.status === 'Đã thanh lý') badge = 'bg-slate-100 text-slate-700';
      return { label: contract.status, color: badge };
    }
    
    const daysLeft = getRemainingDays(contract.date);
    
    if (daysLeft === null) {
       return { label: 'Đang hiệu lực', color: 'bg-emerald-100 text-emerald-700' };
    }
    
    if (daysLeft < 0) {
      return { label: 'Hết hạn', color: 'bg-red-100 text-red-700' };
    } else if (daysLeft <= 30) {
      return { label: 'Còn dưới 30 ngày', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Đang hiệu lực', color: 'bg-emerald-100 text-emerald-700' };
    }
  };

  const formatDaysLeft = (daysLeft: number | null) => {
    if (daysLeft === null) return '---';
    if (daysLeft < 0) return 'Đã quá hạn';
    if (daysLeft === 0) return 'Hôm nay';
    return `${daysLeft} ngày`;
  };

  const getYearFromDate = (dateStr: string) => {
    if (!dateStr) return 'Khác';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return parts[2];
    }
    return 'Khác';
  };

  const filteredContracts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const safeContracts = Array.isArray(contracts) ? contracts : [];
    return safeContracts.filter(c => 
      (c.title || '').toLowerCase().includes(query) ||
      (c.partner || '').toLowerCase().includes(query) ||
      (c.id || '').toLowerCase().includes(query) ||
      (c.taxCode && c.taxCode.includes(query)) ||
      (c.signer && c.signer.toLowerCase().includes(query))
    ).sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }, [contracts, searchQuery]);

  const groupedContracts = useMemo(() => {
    const groups: { [year: string]: any[] } = {};
    filteredContracts.forEach(c => {
      const year = getYearFromDate(c.startDate || c.date);
      if (!groups[year]) groups[year] = [];
      groups[year].push(c);
    });
    return groups;
  }, [filteredContracts]);
  
  const sortedYears = Array.from(new Set([...Object.keys(groupedContracts), ...customYears])).sort((a, b) => {
    if (a === 'Khác') return 1;
    if (b === 'Khác') return -1;
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numB - numA;
    }
    return b.localeCompare(a);
  });
  const activeYearsData = selectedYearTab === 'all' ? sortedYears : [selectedYearTab];

  // List View
  if (!selectedContract) {
    return (
      <div 
        className="p-8 w-full flex flex-col h-full min-h-0 relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="absolute inset-0 border-4 border-transparent border-dashed pointer-events-none data-[dragging=true]:border-blue-400 data-[dragging=true]:bg-blue-50/20 transition-all z-50"></div>
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý hợp đồng</h1>
            <p className="text-slate-500 mt-1">Quản lý vòng đời hợp đồng bằng AI</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setUploadError(null);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Thêm hợp đồng
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm: Tên, Đối tác, MST, Mã HĐ, Nội dung..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            <button
              onClick={() => setSelectedYearTab('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedYearTab === 'all' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tất cả các năm
            </button>
            {sortedYears.map(year => {
              if (editingYear?.old === year) {
                return (
                  <div key={year} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 pr-2 shadow-sm">
                    <input
                      type="text"
                      className="px-3 py-1 w-24 outline-none text-sm bg-transparent"
                      value={editingYear.new}
                      onChange={(e) => setEditingYear({...editingYear, new: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditCustomYear();
                        if (e.key === 'Escape') setEditingYear(null);
                      }}
                      autoFocus
                    />
                    <button onClick={handleEditCustomYear} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <CheckCircle2 size={16} />
                    </button>
                    <button onClick={() => setEditingYear(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded">
                      <X size={16} />
                    </button>
                  </div>
                );
              }

              return (
              <div
                key={year}
                className={`group flex items-center rounded-lg whitespace-nowrap transition-colors ${
                  selectedYearTab === year 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => setSelectedYearTab(year)}
                  className="px-4 py-2 font-medium flex items-center gap-2"
                >
                  <Calendar className={selectedYearTab === year ? 'text-blue-200' : 'text-slate-400'} size={16} />
                  Năm {year}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${selectedYearTab === year ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {groupedContracts[year]?.length || 0}
                  </span>
                </button>
                {customYears.includes(year) && (
                  <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingYear({ old: year, new: year }); }}
                      className={`p-1.5 rounded hover:bg-black/10 transition-colors ${selectedYearTab === year ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}
                      title="Sửa năm"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustomYear(year); }}
                      className={`p-1.5 rounded hover:bg-black/10 transition-colors ${selectedYearTab === year ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-red-600'}`}
                      title="Xóa năm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )})}
            
            {isAddingYear ? (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 pr-2">
                <input
                  type="text"
                  placeholder="Nhập năm..."
                  className="px-3 py-1 w-24 outline-none text-sm bg-transparent"
                  value={newYearValue}
                  onChange={(e) => setNewYearValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCustomYear();
                    if (e.key === 'Escape') {
                      setIsAddingYear(false);
                      setNewYearValue('');
                    }
                  }}
                  autoFocus
                />
                <button onClick={handleAddCustomYear} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                  <CheckCircle2 size={16} />
                </button>
                <button onClick={() => { setIsAddingYear(false); setNewYearValue(''); }} className="p-1 text-slate-400 hover:bg-slate-50 rounded">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingYear(true)}
                className="px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 bg-white border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50"
              >
                <Plus size={16} />
                Tạo năm mới
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <div className="overflow-y-auto flex-1 p-6 space-y-8">
              {activeYearsData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                  <FileSearch size={32} className="mx-auto text-slate-300 mb-3" />
                  <p>Không tìm thấy hợp đồng nào.</p>
                </div>
              ) : (
                activeYearsData.map(year => (
                  <div key={year} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-blue-600" size={20} />
                        Hợp đồng năm {year}
                      </h2>
                      <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                        {groupedContracts[year]?.length || 0} hợp đồng
                      </span>
                    </div>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3 font-medium text-slate-500 w-12 text-center">STT</th>
                            <th className="px-4 py-3 font-medium text-slate-500 min-w-[120px]">Mã HĐ</th>
                            <th className="px-4 py-3 font-medium text-slate-500 min-w-[280px]">Tên hợp đồng</th>
                            <th className="px-4 py-3 font-medium text-slate-500 min-w-[200px]">Đối tác</th>
                            <th className="px-4 py-3 font-medium text-slate-500 min-w-[120px]">Ngày hết hạn</th>
                            <th className="px-4 py-3 font-medium text-slate-500 min-w-[100px]">Còn lại</th>
                            <th className="px-4 py-3 font-medium text-slate-500 min-w-[140px]">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-slate-500 text-right min-w-[100px]">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(!groupedContracts[year] || groupedContracts[year].length === 0) ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-8 text-center text-slate-400 italic">
                                Chưa có hợp đồng nào trong năm này
                              </td>
                            </tr>
                          ) : (
                            groupedContracts[year].map((c, i) => {
                              const status = getStatusDisplay(c);
                              const daysLeft = getRemainingDays(c.date);
                              return (
                                <tr key={i} className="hover:bg-slate-50/80 cursor-pointer transition-colors" onClick={() => { setSelectedContract(c); setDetailTab('info'); }}>
                                  <td className="px-4 py-3.5 font-medium text-slate-400 text-center">{i + 1}</td>
                                  <td className="px-4 py-3.5 font-mono text-slate-500 font-semibold">{c.id}</td>
                                  <td className="px-4 py-3.5 font-medium text-slate-900">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                        <FileText size={16} className="text-blue-500" />
                                      </div>
                                      <span className="font-semibold text-slate-900 text-sm leading-snug" title={c.title}>{c.title}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-700">
                                    <span className="font-medium text-slate-700 text-sm" title={c.partner}>{c.partner}</span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{c.date}</td>
                                  <td className="px-6 py-4 font-medium text-slate-700">{formatDaysLeft(daysLeft)}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${status.color}`}>
                                      {status.label === 'Đang phân tích' && <Loader2 size={12} className="animate-spin mr-1.5 inline" />}
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteContract(c.id);
                                      }}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Xoá hợp đồng"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Cards Grid */}
                    <div className="block md:hidden p-4 space-y-3 bg-slate-50/50">
                      {(!groupedContracts[year] || groupedContracts[year].length === 0) ? (
                        <div className="text-center text-slate-400 italic py-6 text-sm">
                          Chưa có hợp đồng nào trong năm này
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {groupedContracts[year].map((c, i) => {
                            const status = getStatusDisplay(c);
                            const daysLeft = getRemainingDays(c.date);
                            return (
                              <div 
                                key={i} 
                                onClick={() => { setSelectedContract(c); setDetailTab('info'); }}
                                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm active:bg-slate-50 cursor-pointer transition-colors space-y-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5 truncate">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                                      <FileText size={16} className="text-blue-500" />
                                    </div>
                                    <div className="truncate text-left">
                                      <h3 className="font-bold text-slate-800 text-sm truncate leading-snug">{c.title}</h3>
                                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{c.id} • Đối tác: {c.partner}</p>
                                    </div>
                                  </div>
                                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${status.color}`}>
                                    {status.label}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100/60">
                                  <div>
                                    <span className="font-medium text-slate-400">Hạn:</span> <span className="font-semibold text-slate-700">{c.date}</span>
                                  </div>
                                  <div className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    {formatDaysLeft(daysLeft)}
                                  </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteContract(c.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 text-lg">Thêm hợp đồng mới</h3>
                <button onClick={() => !isUploading && setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                  multiple
                />
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
                    ${isUploading ? 'border-indigo-300 bg-indigo-50/50 cursor-not-allowed' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={48} className="text-indigo-500 mx-auto mb-4 animate-spin" />
                      <p className="font-medium text-indigo-900 mb-1">AI đang xử lý hợp đồng...</p>
                      <p className="text-sm text-indigo-600">Xin vui lòng đợi trong giây lát</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UploadCloud size={32} />
                      </div>
                      <p className="font-medium text-slate-900 text-lg mb-2">Kéo thả hoặc Upload</p>
                      <p className="text-sm text-slate-500 mb-4">Hỗ trợ PDF, Word, Scan (Tối đa 50MB)</p>
                      <div className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg">
                        <Bot size={16} className="mr-2" />
                        AI tự động trích xuất
                      </div>
                    </>
                  )}
                </div>
                {uploadError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-left">
                    <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detail View
  const status = getStatusDisplay(selectedContract);
  
  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedContract(null)}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900 line-clamp-1">{selectedContract.title}</h1>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-4">
              <span>Mã HĐ: <span className="font-mono">{selectedContract.id}</span></span>
              <span>•</span>
              <span>Đối tác: {selectedContract.partner}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleDeleteContract(selectedContract.id)}
            className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Xoá
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
            <RefreshCcw size={16} />
            So sánh
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Gia hạn hợp đồng
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-slate-200 bg-white flex gap-6 shrink-0">
        {[
          { id: 'info', label: 'Thông tin' },
          { id: 'ai', label: '🤖 AI Review' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'file', label: 'File đính kèm' },
          { id: 'append', label: 'Phụ lục' },
          { id: 'audit', label: 'Audit Log' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setDetailTab(tab.id as any)}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${detailTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full mx-auto">
          {detailTab === 'info' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-6 text-lg">Thông tin chi tiết</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Mã hợp đồng</p>
                  <p className="font-medium text-slate-900 font-mono">{selectedContract.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Loại hợp đồng</p>
                  <p className="font-medium text-slate-900">Hợp đồng liên kết / dịch vụ</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Đối tác</p>
                  <p className="font-medium text-slate-900">{selectedContract.partner}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Mã số thuế</p>
                  <p className="font-medium text-slate-900">{selectedContract.taxCode || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Ngày ký kết / Bắt đầu</p>
                  <p className="font-medium text-slate-900">{selectedContract.startDate || '---'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Ngày hết hạn</p>
                  <p className="font-medium text-slate-900">{selectedContract.date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Người phụ trách (Internal)</p>
                  <p className="font-medium text-slate-900">{selectedContract.signer || 'Admin'}</p>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    <Bot size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-indigo-900 text-lg mb-2">Đánh giá rủi ro tổng thể</h3>
                    <p className="text-indigo-800 text-sm leading-relaxed">
                      AI đã quét toàn bộ văn bản. Hợp đồng có cấu trúc pháp lý tương đối đầy đủ. Tuy nhiên cần lưu ý một số điều khoản về gia hạn tự động và chế tài phạt vi phạm để tránh rủi ro tiềm ẩn.
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-slate-900 text-lg mt-8 mb-4">Các điểm cần lưu ý (Alerts)</h4>
              {(!selectedContract.alerts || selectedContract.alerts.length === 0) ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                  <ShieldAlert size={48} className="mx-auto text-emerald-400 mb-4" />
                  <p className="font-medium text-slate-900 mb-1">Hợp đồng an toàn</p>
                  <p className="text-sm">Không phát hiện rủi ro pháp lý nghiêm trọng nào.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedContract.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className={`bg-white border rounded-xl p-5 shadow-sm border-l-4 ${
                      alert.type === 'danger' ? 'border-l-red-500' : 'border-l-orange-500'
                    }`}>
                      <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        {alert.type === 'danger' ? <AlertTriangle size={18} className="text-red-500" /> : <ShieldAlert size={18} className="text-orange-500" />}
                        {alert.title}
                      </h5>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {alert.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {detailTab === 'timeline' && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
              <div className="relative border-l border-slate-200 ml-3 space-y-8">
                <div className="relative pl-8">
                  <div className="absolute w-6 h-6 bg-blue-100 rounded-full -left-[13px] top-0 flex items-center justify-center border-4 border-white">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Hợp đồng được tạo</p>
                    <p className="text-xs text-slate-500 mt-1">Bởi Admin - {new Date().toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                <div className="relative pl-8">
                  <div className="absolute w-6 h-6 bg-slate-100 rounded-full -left-[13px] top-0 flex items-center justify-center border-4 border-white">
                    <div className="w-2 h-2 bg-slate-400 rounded-full" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">AI Phân tích hoàn tất</p>
                    <p className="text-xs text-slate-500 mt-1">Hệ thống xử lý tự động</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {detailTab === 'file' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[500px]">
              {selectedContract.url ? (
                <iframe src={selectedContract.url} className="w-full h-[600px] border-0 rounded-lg" title="Preview" />
              ) : (
                <div className="h-[500px] flex flex-col items-center justify-center text-slate-500">
                  <FileCheck size={48} className="text-slate-300 mb-4" />
                  <p className="font-medium text-slate-900 mb-1">Không có file đính kèm</p>
                  <p className="text-sm">Bản hợp đồng này không chứa file gốc.</p>
                </div>
              )}
            </div>
          )}

          {(detailTab === 'append' || detailTab === 'audit') && (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-16 text-center text-slate-500">
              <FileCheck size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-medium text-slate-900 mb-1">Chưa có dữ liệu cho mục này</p>
              <p className="text-sm">Hệ thống sẽ cập nhật khi có hoạt động mới.</p>
            </div>
          )}
        </div>
      </div>

      {contractToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa hợp đồng</h3>
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn xóa hợp đồng này không? Thao tác này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={cancelDelete}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Xóa hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
