import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Plus, CheckCircle2, Circle, AlertCircle, Calendar, FileText, Trash2, Clock, X, Upload, Download, ExternalLink, Info } from 'lucide-react';
import { get, set as setIdb } from 'idb-keyval';

export function ComplianceCenter() {
  const [data, setData] = useState<any>({
    'Thuế': { files: [], reminders: [] },
    'BHXH': { files: [], reminders: [] },
    'Lao động': { files: [], reminders: [] },
    'Y tế': { files: [], reminders: [] },
    'submittedReports': {}
  });
  const [selectedArea, setSelectedArea] = useState<string>('Thuế');
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const complianceAreas = [
    { id: 'Thuế', name: 'Thuế', desc: 'Hồ sơ thuế, báo cáo định kỳ' },
    { id: 'BHXH', name: 'BHXH', desc: 'Bảo hiểm xã hội, BHYT' },
    { id: 'Lao động', name: 'Lao động', desc: 'Hợp đồng lao động, nội quy' },
    { id: 'Y tế', name: 'Y tế', desc: 'Khám sức khỏe, y tế cơ quan' },
  ];

  useEffect(() => {
    get('ai_compliance_data').then(val => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        setData(prev => {
          const merged = { ...prev, ...val };
          for (const key of ['Thuế', 'BHXH', 'Lao động', 'Y tế']) {
            if (!merged[key] || typeof merged[key] !== 'object') {
              merged[key] = { files: [], reminders: [] };
            }
            if (!Array.isArray(merged[key].files)) merged[key].files = [];
            if (!Array.isArray(merged[key].reminders)) merged[key].reminders = [];
          }
          return merged;
        });
      }
    });
  }, []);

  const save = (newData: any) => {
    setData(newData);
    setIdb('ai_compliance_data', newData);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        date: new Date().toISOString(),
      };
      
      const newData = { ...data };
      if (!newData[selectedArea]) newData[selectedArea] = { files: [], reminders: [] };
      newData[selectedArea].files.push(newFile);
      save(newData);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const handleAddReminder = () => {
    if (newReminderTitle && newReminderDate) {
      const newReminder = {
        id: Date.now().toString(),
        title: newReminderTitle,
        date: newReminderDate
      };
      const newData = { ...data };
      if (!newData[selectedArea]) newData[selectedArea] = { files: [], reminders: [] };
      newData[selectedArea].reminders.push(newReminder);
      
      // Sort reminders
      newData[selectedArea].reminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      save(newData);
      setNewReminderTitle('');
      setNewReminderDate('');
      setIsAddingReminder(false);
    }
  }

  const deleteFile = (id: string) => {
    const newData = { ...data };
    newData[selectedArea].files = newData[selectedArea].files.filter(f => f.id !== id);
    save(newData);
  }

  const deleteReminder = (id: string) => {
    const newData = { ...data };
    newData[selectedArea].reminders = newData[selectedArea].reminders.filter(r => r.id !== id);
    save(newData);
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  }

  const reportingGuides: Record<string, any[]> = {
    'Thuế': [
      {
        id: 'thue_gtgt_2026',
        title: 'Tờ khai thuế GTGT & TNCN định kỳ (Quý/Tháng)',
        deadline: 'Chậm nhất là ngày cuối cùng của tháng đầu tiên quý tiếp theo (theo Quý) hoặc ngày 20 của tháng sau (theo Tháng)',
        desc: 'Kê khai thuế Giá trị gia tăng và Thuế thu nhập cá nhân phát sinh trong kỳ của doanh nghiệp.',
        docs: [],
        onlineLink: 'https://thuedientu.gdt.gov.vn',
        onlineLabel: 'Cổng Thuế điện tử',
        suggestedReminderDate: '2026-10-31'
      },
      {
        id: 'thue_tndn_2026',
        title: 'Tạm nộp Thuế thu nhập doanh nghiệp (TNDN) theo Quý',
        deadline: 'Chậm nhất là ngày cuối cùng của tháng đầu tiên quý tiếp theo',
        desc: 'Tự xác định số thuế TNDN tạm nộp dựa trên kết quả kinh doanh quý (Áp dụng mức thuế suất ưu đãi 15% - 17% đối với doanh nghiệp nhỏ trong năm 2026).',
        docs: [],
        onlineLink: 'https://thuedientu.gdt.gov.vn',
        onlineLabel: 'Cổng Thuế điện tử',
        suggestedReminderDate: '2026-10-31'
      },
      {
        id: 'thue_qtoan_2026',
        title: 'Quyết toán Thuế TNDN & Báo cáo tài chính năm',
        deadline: 'Trước ngày cuối cùng của tháng thứ 3 kể từ ngày kết thúc năm dương lịch/năm tài chính',
        desc: 'Nộp hồ sơ quyết toán thuế năm kèm Báo cáo tài chính. Lưu ý: DN siêu nhỏ nộp thuế theo tỷ lệ % doanh thu được miễn nộp BCTC từ ngày 01/07/2026 theo Thông tư 58/2026/TT-BTC.',
        docs: [],
        onlineLink: 'https://thuedientu.gdt.gov.vn',
        onlineLabel: 'Cổng Thuế điện tử',
        suggestedReminderDate: '2027-03-31'
      },
      {
        id: 'thongke_vondautu_2026',
        title: 'Kê khai điều tra vốn đầu tư Quý (Tổng cục Thống kê)',
        deadline: 'Từ ngày 01 đến ngày 12 của tháng cuối quý (Quý II/2026 nộp từ 01/06 - 12/06/2026)',
        desc: 'Báo cáo định kỳ về vốn đầu tư thực hiện của doanh nghiệp gửi Tổng cục Thống kê để phục vụ việc tổng hợp dữ liệu kinh tế vĩ mô.',
        docs: [
          { name: 'Phiếu điều tra Vốn đầu tư (.doc)', url: '/templates/mau_phieu_dieu_tra_von_dau_tu_quy.doc' }
        ],
        onlineLink: 'https://thongkedoanhnghiep.gso.gov.vn',
        onlineLabel: 'Trang thông tin điều tra DN (GSO)',
        suggestedReminderDate: '2026-06-12'
      }
    ],
    'BHXH': [
      {
        id: 'bhxh_khai_2026',
        title: 'Kê khai tăng/giảm lao động đóng BHXH, BHYT, BHTN',
        deadline: 'Trong vòng 10 ngày kể từ ngày tuyển mới hoặc chấm dứt HĐLD',
        desc: 'Thực hiện thủ tục báo tăng/giảm đóng các chế độ bảo hiểm cho nhân viên.',
        docs: [],
        onlineLink: 'https://gddt.baohiemxahoi.gov.vn',
        onlineLabel: 'Dịch vụ công BHXH',
        suggestedReminderDate: '2026-07-17'
      }
    ],
    'Lao động': [
      {
        id: 'laodong_bcao_2026',
        title: 'Báo cáo tình hình sử dụng lao động định kỳ (6 tháng & cả năm)',
        deadline: 'Báo cáo 6 tháng trước 05/06; Báo cáo năm trước 05/12 hằng năm',
        desc: 'Báo cáo tình hình thay đổi (biến động) lao động định kỳ gửi cơ quan quản lý lao động địa phương.',
        docs: [
          { name: 'Mẫu 01/PLI (Nghị định 145/2020)', url: '/templates/mau_01_pli_bien_dong_lao_dong.doc' }
        ],
        onlineLink: 'https://dichvucong.gov.vn',
        onlineLabel: 'Cổng Dịch vụ công Quốc gia',
        suggestedReminderDate: '2026-12-05'
      }
    ],
    'Y tế': [
      {
        id: 'yte_bcao_atvsld_2026',
        title: 'Báo cáo công tác An toàn, Vệ sinh lao động & Y tế hằng năm',
        deadline: 'Trước ngày 10/01 của năm kế tiếp',
        desc: 'Báo cáo tổng hợp tình hình thực hiện công tác ATVSLĐ và y tế cơ sở tại doanh nghiệp.',
        docs: [
          { name: 'Mẫu báo cáo công tác ATVSLĐ (Thông tư 07/2016)', url: '/templates/mau_bao_cao_atvsld.doc' }
        ],
        onlineLink: null,
        suggestedReminderDate: '2027-01-10'
      },
      {
        id: 'yte_bcao_tainan_2026',
        title: 'Báo cáo tổng hợp tình hình tai nạn lao động định kỳ',
        deadline: 'Báo cáo 6 tháng trước 05/07; Báo cáo năm trước 10/01 năm sau',
        desc: 'Báo cáo số liệu và tình hình tai nạn lao động tại cơ sở gửi Thanh tra Sở LĐ-TB&XH.',
        docs: [
          { name: 'Phụ lục XII Báo cáo TNLĐ (Nghị định 39/2016)', url: '/templates/mau_phu_luc_12_tai_nan_lao_dong.doc' }
        ],
        onlineLink: null,
        suggestedReminderDate: '2027-01-10'
      },
      {
        id: 'yte_bcao_tainan_6th_2026',
        title: 'Báo cáo tổng hợp tình hình tai nạn lao động 6 tháng đầu năm',
        deadline: 'Trước ngày 05/07/2026',
        desc: 'Báo cáo số liệu và tình hình tai nạn lao động 6 tháng đầu năm gửi Thanh tra Sở LĐ-TB&XH.',
        docs: [
          { name: 'Phụ lục XII Báo cáo TNLĐ (Nghị định 39/2016)', url: '/templates/mau_phu_luc_12_tai_nan_lao_dong.doc' }
        ],
        onlineLink: null,
        suggestedReminderDate: '2026-07-05'
      }
    ]
  };

  const handleAddConfiguredReminder = (title: string, dateStr: string) => {
    const newReminder = {
      id: Date.now().toString(),
      title: `Nộp báo cáo: ${title}`,
      date: dateStr
    };
    const newData = { ...data };
    if (!newData[selectedArea]) newData[selectedArea] = { files: [], reminders: [] };
    
    // Kiểm tra xem đã tồn tại nhắc nhở này chưa
    const exists = newData[selectedArea].reminders.some(r => r.title === newReminder.title && r.date === newReminder.date);
    if (!exists) {
      newData[selectedArea].reminders.push(newReminder);
      newData[selectedArea].reminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      save(newData);
    }
  };

  const getReportId = (area: string, title: string, date: string) => {
    for (const key in reportingGuides) {
      const found = reportingGuides[key].find(g => g.title === title && g.suggestedReminderDate === date);
      if (found) return found.id;
    }
    return `${area}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${date}`;
  };

  const toggleSubmitReport = (reportId: string) => {
    const newData = { ...data };
    if (!newData.submittedReports) newData.submittedReports = {};
    newData.submittedReports[reportId] = !newData.submittedReports[reportId];
    save(newData);
  };

  const rawAreaData = data[selectedArea] || {};
  const areaData = {
    files: Array.isArray(rawAreaData.files) ? rawAreaData.files : [],
    reminders: Array.isArray(rawAreaData.reminders) ? rawAreaData.reminders : []
  };

  return (
    <div className="p-8 w-full mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý tuân thủ</h1>
          <p className="text-slate-500 mt-1">Theo dõi hồ sơ và nhắc nhở tuân thủ pháp luật</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex-1 overflow-y-auto">
            <h2 className="font-semibold text-slate-900 mb-4 px-2">Lĩnh vực theo dõi</h2>
            <div className="space-y-2">
              {complianceAreas.map((area) => {
                const areaInfo = data[area.id] || {};
                const reminders = Array.isArray(areaInfo.reminders) ? areaInfo.reminders : [];
                const hasWarning = reminders.some((r: any) => {
                  const d = new Date(r.date);
                  const now = new Date();
                  const diff = d.getTime() - now.getTime();
                  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // less than 7 days
                });
                const isLate = reminders.some((r: any) => {
                   return new Date(r.date) < new Date();
                });

                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedArea === area.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${selectedArea === area.id ? 'text-blue-700' : 'text-slate-800'}`}>{area.name}</p>
                        <p className={`text-xs ${selectedArea === area.id ? 'text-blue-500' : 'text-slate-500'}`}>{area.desc}</p>
                      </div>
                      {isLate ? (
                        <AlertCircle size={18} className="text-red-500" />
                      ) : hasWarning ? (
                        <AlertCircle size={18} className="text-orange-500" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6 h-full">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Chi tiết: {selectedArea}</h2>
                <p className="text-sm text-slate-500">Quản lý hồ sơ và lịch nhắc nhở</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              {/* Biểu mẫu & Hướng dẫn Báo cáo định kỳ */}
              {reportingGuides[selectedArea] && reportingGuides[selectedArea].length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ShieldCheck size={20} className="text-indigo-600 animate-pulse" />
                    Biểu mẫu & Hướng dẫn nộp báo cáo định kỳ
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {reportingGuides[selectedArea].map((guide, idx) => (
                      <div key={idx} className="bg-indigo-50/40 border border-indigo-100/60 rounded-xl p-5 hover:border-indigo-200 hover:bg-indigo-50/60 transition-all shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm md:text-base flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                              {guide.title}
                            </h4>
                            <p className="text-xs text-indigo-700 font-semibold flex items-center gap-1.5 bg-indigo-100/60 inline-flex px-3 py-1 rounded-full border border-indigo-200/50">
                              <Clock size={12} className="text-indigo-600" />
                              Hạn nộp: <span>{guide.deadline}</span>
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed pt-1">{guide.desc}</p>
                          </div>
                          
                          <div className="flex flex-wrap md:flex-col gap-2 shrink-0 md:items-end justify-start">
                            {(() => {
                              const rId = getReportId(selectedArea, guide.title, guide.suggestedReminderDate);
                              const isSubmitted = data.submittedReports?.[rId] === true;
                              return (
                                <button 
                                  onClick={() => toggleSubmitReport(rId)}
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-all cursor-pointer w-full md:w-auto ${
                                    isSubmitted 
                                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  {isSubmitted ? '✓ Đã nộp báo cáo' : '◯ Đánh dấu đã nộp'}
                                </button>
                              );
                            })()}
                            {(guide.docs || []).map((doc: any, dIdx: number) => (
                              <a 
                                key={dIdx} 
                                href={doc.url} 
                                download 
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer w-full md:w-auto"
                              >
                                <Download size={14} /> Tải {doc.name.includes('Mẫu') ? 'Mẫu' : 'Biểu mẫu'}
                              </a>
                            ))}
                            {guide.onlineLink && (
                              <a 
                                href={guide.onlineLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold shadow-sm transition-colors w-full md:w-auto"
                              >
                                <ExternalLink size={14} /> {guide.onlineLabel || 'Nộp online'}
                              </a>
                            )}
                            <button 
                              onClick={() => handleAddConfiguredReminder(guide.title, guide.suggestedReminderDate)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-250 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer w-full md:w-auto"
                            >
                              <Plus size={14} /> Nhắc lịch nộp
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lịch nhắc nhở */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Lịch nhắc thời gian
                  </h3>
                  <button 
                    onClick={() => setIsAddingReminder(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} /> Thêm lịch
                  </button>
                </div>

                {isAddingReminder && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      placeholder="Nội dung công việc / nhắc nhở..." 
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                    />
                    <input 
                      type="date" 
                      className="w-full sm:w-40 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                      value={newReminderDate}
                      onChange={(e) => setNewReminderDate(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleAddReminder}
                        disabled={!newReminderTitle || !newReminderDate}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Lưu
                      </button>
                      <button 
                        onClick={() => { setIsAddingReminder(false); setNewReminderTitle(''); setNewReminderDate(''); }}
                        className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {areaData.reminders.length === 0 && !isAddingReminder ? (
                  <div className="text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm">
                    Chưa có lịch nhắc nhở nào
                  </div>
                ) : (
                  <div className="space-y-2">
                    {areaData.reminders.map(r => {
                      const d = new Date(r.date);
                      const now = new Date();
                      now.setHours(0,0,0,0);
                      const isLate = d < now;
                      const isSoon = d >= now && (d.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000;

                      return (
                        <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${isLate ? 'border-red-200 bg-red-50' : isSoon ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            {isLate ? <AlertCircle size={18} className="text-red-500" /> : <Clock size={18} className={isSoon ? 'text-orange-500' : 'text-blue-500'} />}
                            <div>
                              <p className={`text-sm font-medium ${isLate ? 'text-red-700' : isSoon ? 'text-orange-800' : 'text-slate-700'}`}>{r.title}</p>
                              <p className={`text-xs ${isLate ? 'text-red-500' : isSoon ? 'text-orange-600' : 'text-slate-500'}`}>Hạn: {formatDate(r.date)}</p>
                            </div>
                          </div>
                          <button onClick={() => deleteReminder(r.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Hồ sơ đính kèm */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    Hồ sơ liên quan
                  </h3>
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Upload size={16} /> Tải lên
                    </button>
                  </div>
                </div>

                {areaData.files.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm">
                    <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>Chưa có tài liệu nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {areaData.files.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate" title={f.name}>{f.name}</p>
                            <p className="text-xs text-slate-500">{formatSize(f.size)} • {formatDate(f.date)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteFile(f.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
