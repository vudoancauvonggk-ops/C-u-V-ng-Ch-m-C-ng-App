import React, { useState, useEffect } from 'react';
import { Target, AlertCircle, Clock, FileSignature, BarChart2, Bot, Loader2, ChevronDown, ChevronRight, Info, Bell, ShieldAlert, UserPlus, Copy, Check } from 'lucide-react';
import { get, set as setIdb } from 'idb-keyval';

export function CommandCenter() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [aiUpdates, setAiUpdates] = useState<any>(null);
  const [aiUpdatesLoading, setAiUpdatesLoading] = useState(true);
  const [copiedApplyLink, setCopiedApplyLink] = useState(false);

  const handleCopyApplyLink = () => {
    const link = 'https://cauvongdulieu.duckdns.org/apply';
    navigator.clipboard.writeText(link).then(() => {
      setCopiedApplyLink(true);
      setTimeout(() => setCopiedApplyLink(false), 2500);
    }).catch(err => {
      console.error('Failed to copy link:', err);
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedApplyLink(true);
      setTimeout(() => setCopiedApplyLink(false), 2500);
    });
  };

  useEffect(() => {
    get('ai_contracts_idb').then((data: any) => {
      if (data && Array.isArray(data)) {
        setContracts(data);
      }
      setLoading(false);
    });

    get('ai_compliance_data').then((val: any) => {
      if (val) {
        setComplianceData(val);
      }
    });

    // Fetch live daily AI regulatory updates
    fetch('/api/ai-updates')
      .then(res => res.json())
      .then(data => {
        if (data && data.groups) {
          setAiUpdates(data);
        }
        setAiUpdatesLoading(false);
      })
      .catch(err => {
        console.error('Failed to load AI updates:', err);
        setAiUpdatesLoading(false);
      });
  }, []);

  const handleForceRefreshUpdates = () => {
    setAiUpdatesLoading(true);
    fetch('/api/ai-updates?force=true')
      .then(res => res.json())
      .then(data => {
        if (data && data.groups) {
          setAiUpdates(data);
        }
        setAiUpdatesLoading(false);
      })
      .catch(err => {
        console.error('Failed to force refresh AI updates:', err);
        setAiUpdatesLoading(false);
      });
  };

  const reportingGuidesList = [
    {
      id: 'thue_gtgt_2026',
      area: 'Thuế',
      title: 'Tờ khai thuế GTGT & TNCN định kỳ (Quý/Tháng)',
      deadline: '31/10/2026',
      date: '2026-10-31'
    },
    {
      id: 'thue_tndn_2026',
      area: 'Thuế',
      title: 'Tạm nộp Thuế thu nhập doanh nghiệp (TNDN) theo Quý',
      deadline: '31/10/2026',
      date: '2026-10-31'
    },
    {
      id: 'thue_qtoan_2026',
      area: 'Thuế',
      title: 'Quyết toán Thuế TNDN & Báo cáo tài chính năm',
      deadline: '31/03/2027',
      date: '2027-03-31'
    },
    {
      id: 'bhxh_khai_2026',
      area: 'BHXH',
      title: 'Kê khai tăng/giảm lao động đóng BHXH, BHYT, BHTN',
      deadline: '17/07/2026',
      date: '2026-07-17'
    },
    {
      id: 'laodong_bcao_2026',
      area: 'Lao động',
      title: 'Báo cáo tình hình sử dụng lao động định kỳ (6 tháng & cả năm)',
      deadline: '05/12/2026',
      date: '2026-12-05'
    },
    {
      id: 'yte_bcao_atvsld_2026',
      area: 'Y tế',
      title: 'Báo cáo công tác An toàn, Vệ sinh lao động & Y tế hằng năm',
      deadline: '10/01/2027',
      date: '2027-01-10'
    },
    {
      id: 'yte_bcao_tainan_2026',
      area: 'Y tế',
      title: 'Báo cáo tổng hợp tình hình tai nạn lao động định kỳ',
      deadline: '10/01/2027',
      date: '2027-01-10'
    },
    {
      id: 'yte_bcao_tainan_6th_2026',
      area: 'Y tế',
      title: 'Báo cáo tổng hợp tình hình tai nạn lao động 6 tháng đầu năm',
      deadline: '05/07/2026',
      date: '2026-07-05'
    },
    {
      id: 'thongke_vondautu_2026',
      area: 'Thuế',
      title: 'Kê khai điều tra vốn đầu tư Quý (Tổng cục Thống kê)',
      deadline: '12/06/2026',
      date: '2026-06-12'
    }
  ];

  const handleMarkAsSubmittedInDashboard = (reportId: string) => {
    const newSubmitted = { ...(complianceData?.submittedReports || {}) };
    newSubmitted[reportId] = true;
    
    const newComplianceData = {
      ...(complianceData || {
        'Thuế': { files: [], reminders: [] },
        'BHXH': { files: [], reminders: [] },
        'Lao động': { files: [], reminders: [] },
        'Y tế': { files: [], reminders: [] },
      }),
      submittedReports: newSubmitted
    };
    
    setComplianceData(newComplianceData);
    setIdb('ai_compliance_data', newComplianceData);
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return Infinity;
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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getYearFromDate = (dateStr: string) => {
    if (!dateStr) return 'Khác';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return parts[2];
    }
    return 'Khác';
  };

  // Tính toán thống kê
  const safeContracts = Array.isArray(contracts) ? contracts : [];
  const statsByYear = safeContracts.reduce((acc: any, c: any) => {
    const year = getYearFromDate(c.startDate || c.date);
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const sortedYears = Object.keys(statsByYear).sort((a, b) => b.localeCompare(a));

  const expiredContracts = safeContracts.filter(c => {
    const daysLeft = getRemainingDays(c.date);
    return daysLeft !== null && daysLeft < 0;
  });

  const expiringSoonContracts = safeContracts.filter(c => {
    const daysLeft = getRemainingDays(c.date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
  });

  const waitingToSign = safeContracts.filter(c => c.status === 'Chờ ký');

  // Tính toán cảnh báo tuân thủ & báo cáo
  const todayDate = new Date('2026-07-07');
  todayDate.setHours(0,0,0,0);
  
  const activeAlerts = reportingGuidesList.map(guide => {
    const guideDate = new Date(guide.date);
    guideDate.setHours(0,0,0,0);
    const diffTime = guideDate.getTime() - todayDate.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { ...guide, daysLeft };
  }).filter(alert => {
    const isSubmitted = complianceData?.submittedReports?.[alert.id] === true;
    return alert.daysLeft <= 30 && !isSubmitted;
  });

  return (
    <div className="p-8 w-full mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="text-blue-600" size={28} />
            Trung tâm công việc (Command Center)
            {activeAlerts.length > 0 && (
              <span className="flex items-center gap-1.5 ml-2 bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 animate-pulse">
                <Bell size={14} className="text-red-600 animate-bounce" />
                {activeAlerts.length} Báo cáo sắp đến hạn
              </span>
            )}
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">Bản tin tóm tắt buổi sáng dành cho Giám đốc, tổng hợp tự động bằng AI.</p>
        </div>

        <button
          onClick={handleCopyApplyLink}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0 self-start md:self-auto cursor-pointer"
          title="Sao chép đường dẫn đăng ký tuyển dụng giáo viên"
        >
          <UserPlus size={18} />
          {copiedApplyLink ? '✓ Đã chép link đăng ký!' : 'Đăng ký tuyển dụng'}
          {copiedApplyLink ? <Check size={16} className="text-emerald-300 ml-0.5" /> : <Copy size={15} className="opacity-80 ml-0.5" />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={24} />
          Đang tải dữ liệu...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <BarChart2 className="text-indigo-500" size={24} />
              <h3 className="font-semibold text-indigo-900">Hợp đồng theo năm</h3>
            </div>
            <p className="text-3xl font-bold text-indigo-700 mb-2">{contracts.length}</p>
            <ul className="text-sm text-indigo-800 space-y-1 max-h-24 overflow-y-auto pr-2">
              {sortedYears.length > 0 ? sortedYears.map(year => (
                <li key={year} className="flex justify-between items-center border-b border-indigo-100 pb-1 last:border-0">
                  <span>Năm {year}:</span>
                  <span className="font-semibold">{statsByYear[year]}</span>
                </li>
              )) : (
                <li className="text-indigo-600/70 italic">Chưa có hợp đồng nào</li>
              )}
            </ul>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="text-red-500" size={24} />
              <h3 className="font-semibold text-red-900">Hợp đồng hết hạn</h3>
            </div>
            <p className="text-3xl font-bold text-red-700 mb-2">{expiredContracts.length}</p>
            <ul className="text-sm text-red-800 space-y-1 max-h-24 overflow-y-auto pr-2">
              {expiredContracts.length > 0 ? (
                expiredContracts.slice(0, 3).map((c, i) => (
                  <li key={i} className="truncate" title={c.title}>• {c.title}</li>
                ))
              ) : (
                <li className="text-red-600/70 italic">Không có hợp đồng hết hạn</li>
              )}
              {expiredContracts.length > 3 && (
                <li className="text-red-600/70 text-xs italic">+{expiredContracts.length - 3} hợp đồng khác</li>
              )}
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="text-orange-500" size={24} />
              <h3 className="font-semibold text-orange-900">Sắp đến hạn</h3>
            </div>
            <p className="text-3xl font-bold text-orange-700 mb-2">{expiringSoonContracts.length}</p>
            <ul className="text-sm text-orange-800 space-y-1 max-h-24 overflow-y-auto pr-2">
              {expiringSoonContracts.length > 0 ? (
                expiringSoonContracts.slice(0, 3).map((c, i) => (
                  <li key={i} className="truncate" title={c.title}>• {c.title}</li>
                ))
              ) : (
                <li className="text-orange-600/70 italic">Không có hợp đồng sắp đến hạn</li>
              )}
              {expiringSoonContracts.length > 3 && (
                <li className="text-orange-600/70 text-xs italic">+{expiringSoonContracts.length - 3} hợp đồng khác</li>
              )}
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <FileSignature className="text-blue-500" size={24} />
              <h3 className="font-semibold text-blue-900">Hợp đồng cần ký</h3>
            </div>
            <p className="text-3xl font-bold text-blue-700 mb-2">{waitingToSign.length}</p>
            <ul className="text-sm text-blue-800 space-y-1 max-h-24 overflow-y-auto pr-2">
              {waitingToSign.length > 0 ? (
                waitingToSign.slice(0, 3).map((c, i) => (
                  <li key={i} className="truncate" title={c.title}>• {c.title}</li>
                ))
              ) : (
                <li className="text-blue-600/70 italic">Không có hợp đồng cần ký</li>
              )}
              {waitingToSign.length > 3 && (
                <li className="text-blue-600/70 text-xs italic">+{waitingToSign.length - 3} hợp đồng khác</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-red-900 flex items-center gap-2 mb-4">
            <ShieldAlert size={20} className="text-red-600 animate-bounce" />
            Cảnh báo Báo cáo & Tuân thủ sắp đến hạn (Dưới 30 ngày)
          </h2>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="bg-white border border-red-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-red-200 transition-colors">
                <div>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">{alert.area}</span>
                  <h3 className="font-semibold text-slate-800 text-sm mt-1">{alert.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Clock size={12} className="text-red-500" />
                    Hạn nộp: <span className="font-bold text-red-600">{alert.deadline}</span> 
                    {alert.daysLeft < 0 ? (
                      <span className="text-red-700 font-extrabold ml-1">(Quá hạn {-alert.daysLeft} ngày!)</span>
                    ) : (
                      <span className="text-slate-600 ml-1">(Còn {alert.daysLeft} ngày)</span>
                    )}
                  </p>
                </div>
                <button 
                  onClick={() => handleMarkAsSubmittedInDashboard(alert.id)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  ✓ Đã nộp báo cáo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-wrap gap-2 text-left">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Bot size={22} className="text-indigo-500" />
            AI Cập nhật: Dành cho Doanh nghiệp nhỏ (&lt;20 NV)
          </h2>
          <div className="flex items-center gap-3">
            {aiUpdates?.lastUpdated && (
              <span className="text-xs text-slate-400 font-medium">Cập nhật: {aiUpdates.lastUpdated}</span>
            )}
            <button
              onClick={handleForceRefreshUpdates}
              disabled={aiUpdatesLoading}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-50 text-indigo-600 disabled:text-slate-400 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-indigo-100/50"
              title="Làm mới thông tin từ Google Search bằng AI"
            >
              {aiUpdatesLoading ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
              <span>Làm mới bằng AI</span>
            </button>
          </div>
        </div>
        
        {aiUpdatesLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <p className="text-xs text-slate-400 font-medium">Đang tìm kiếm thông tin quy định mới nhất từ Google...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-indigo-50/50 rounded-lg p-4 md:p-5 border border-indigo-100">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 shrink-0 hidden sm:block">
                  <Bot className="text-indigo-600" size={24} />
                </div>
                <div className="w-full">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2 text-sm md:text-base text-left">
                    <Info size={16} className="text-indigo-500" />
                    Các điểm lưu ý quan trọng (Đã lọc theo quy mô doanh nghiệp):
                  </h4>
                  
                  <div className="space-y-6">
                    {aiUpdates?.groups && aiUpdates.groups.length > 0 ? (
                      aiUpdates.groups.map((group: any, gIdx: number) => (
                        <div key={gIdx}>
                          <h5 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 text-left">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {group.title}
                          </h5>
                          <div className="space-y-2 text-sm text-slate-700">
                            {group.items.map((item: any, iIdx: number) => {
                              const uniqueKey = `${gIdx}_${iIdx}`;
                              const isExpanded = expandedNews === uniqueKey;
                              return (
                                <div key={item.id || uniqueKey} className="border border-indigo-100 rounded-lg bg-white overflow-hidden shadow-sm hover:border-indigo-200 transition-colors">
                                  <button 
                                    onClick={() => setExpandedNews(isExpanded ? null : uniqueKey)}
                                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-indigo-50/50 transition-colors"
                                  >
                                    <span className="font-semibold text-indigo-950 pr-4 text-xs md:text-sm">{item.title}</span>
                                    {isExpanded ? <ChevronDown size={18} className="text-indigo-400 shrink-0" /> : <ChevronRight size={18} className="text-indigo-400 shrink-0" />}
                                  </button>
                                  {isExpanded && (
                                    <div className="px-4 py-3.5 border-t border-indigo-100 bg-slate-50 text-slate-650 leading-relaxed text-xs md:text-sm space-y-2 text-left">
                                      <p><strong>Nội dung:</strong> {item.content}</p>
                                      {item.effectiveDate && <p><strong>Hiệu lực:</strong> {item.effectiveDate}</p>}
                                      {item.action && <p><strong>Hành động khuyến nghị:</strong> {item.action}</p>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">Không có cập nhật mới.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 bg-white inline-block px-3 py-1.5 rounded-full border border-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI tự động tìm kiếm, chọn lọc quy định và cập nhật hằng ngày cho DN nhỏ
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
