import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  Download, 
  Eye, 
  Save, 
  Loader2, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  MessageSquare,
  UserPlus,
  Copy,
  Check
} from 'lucide-react';

interface CandidateFile {
  name: string;
  url: string;
  type: string;
}

interface Candidate {
  id: string;
  name: string;
  dob: string;
  address: string;
  phone: string;
  email: string;
  position: string;
  teachingExp: string;
  talents: string;
  achievements: string;
  desiredSalary: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  rating: number;
  notes: string;
  files: CandidateFile[];
}

export function CandidateManagement() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Temporary states for evaluation inputs
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCandidates(data);
        
        // Initialize ratings and notes dictionaries
        const initialRatings: Record<string, number> = {};
        const initialNotes: Record<string, string> = {};
        data.forEach(c => {
          initialRatings[c.id] = c.rating || 0;
          initialNotes[c.id] = c.notes || '';
        });
        setRatings(initialRatings);
        setNotes(initialNotes);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEvaluation = async (id: string) => {
    setSavingId(id);
    try {
      const rating = ratings[id] || 0;
      const note = notes[id] || '';
      
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, notes: note })
      });
      
      if (res.ok) {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, rating, notes: note } : c));
        alert('Đã lưu đánh giá ứng viên thành công!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ ứng viên này khỏi hệ thống?')) return;
    
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCandidates(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shadow-sm">
            <CheckCircle size={12} />
            Đã duyệt nhận
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold shadow-sm">
            <XCircle size={12} />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold shadow-sm">
            <Clock size={12} className="animate-spin" />
            Đang chờ duyệt
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Header tab */}
      <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shrink-0 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            Quản Lý Tuyển Dụng & Ứng Viên
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá, nhận xét và phê duyệt hồ sơ ứng viên đăng ký từ cổng tuyển dụng công cộng.
          </p>
        </div>

        <button
          onClick={handleCopyApplyLink}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          title="Sao chép đường dẫn đăng ký tuyển dụng giáo viên"
        >
          <UserPlus size={17} />
          {copiedApplyLink ? '✓ Đã chép link đăng ký!' : 'Đăng ký tuyển dụng'}
          {copiedApplyLink ? <Check size={15} className="text-emerald-300 ml-0.5" /> : <Copy size={14} className="opacity-80 ml-0.5" />}
        </button>
      </div>

      {/* Main content body */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
        {/* Controls Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm ứng viên, SĐT, vị trí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
            />
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {filter === 'all' && 'Tất cả'}
                {filter === 'pending' && 'Đang chờ'}
                {filter === 'approved' && 'Đã nhận'}
                {filter === 'rejected' && 'Từ chối'}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates List / Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm text-slate-500 font-semibold">Đang tải danh sách hồ sơ...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-200 rounded-xl">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Không tìm thấy hồ sơ ứng viên nào phù hợp.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => {
              const isExpanded = expandedId === candidate.id;
              const rating = ratings[candidate.id] || 0;
              const note = notes[candidate.id] || '';

              return (
                <div 
                  key={candidate.id}
                  className={`bg-white border rounded-2xl shadow-sm transition-all overflow-hidden ${
                    isExpanded ? 'border-blue-500/50 ring-1 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Summary Card Header */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : candidate.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar Circle */}
                      <div className="w-12 h-12 bg-blue-50 border border-blue-100/50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                        {candidate.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'UV'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight truncate">{candidate.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{candidate.id}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-normal font-semibold">
                          Ứng tuyển: <span className="text-indigo-600">{candidate.position}</span> • Ngày nộp: {candidate.date}
                        </p>
                      </div>
                    </div>

                    {/* Right side summary metadata */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            size={14} 
                            className={star <= (candidate.rating || 0) ? 'text-amber-400 fill-amber- star' : 'text-slate-200'} 
                          />
                        ))}
                      </div>
                      
                      {getStatusBadge(candidate.status)}
                      
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-5 pb-6 border-t border-slate-100 bg-slate-50/20 text-left">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
                        
                        {/* Left Side: Applicant Info & Profile */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Thông tin cơ bản & Liên hệ</h4>
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-sm text-slate-700">
                              <p><strong>Ngày sinh:</strong> <span className="font-semibold text-slate-800">{candidate.dob}</span></p>
                              <p><strong>Địa chỉ hiện tại:</strong> <span className="font-semibold text-slate-800">{candidate.address}</span></p>
                              <p><strong>Số điện thoại:</strong> <span className="font-semibold text-slate-800">{candidate.phone}</span></p>
                              {candidate.email && <p><strong>Email:</strong> <span className="font-semibold text-slate-800">{candidate.email}</span></p>}
                              {candidate.desiredSalary && <p><strong>Mức lương mong muốn:</strong> <span className="font-semibold text-indigo-600">{candidate.desiredSalary}</span></p>}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mô tả kinh nghiệm dạy học</h4>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed min-h-[80px] whitespace-pre-wrap">
                              {candidate.teachingExp}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sở trường, năng khiếu</h4>
                              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-wrap">
                                {candidate.talents || 'Không có ghi nhận.'}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Thành tựu đạt được</h4>
                              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-wrap">
                                {candidate.achievements || 'Không có ghi nhận.'}
                              </div>
                            </div>
                          </div>

                          {/* Documents Attachments */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hồ sơ đính kèm (CV & Bằng cấp)</h4>
                            {(!candidate.files || candidate.files.length === 0) ? (
                              <p className="text-xs text-slate-400 italic">Không đính kèm tài liệu nào.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {candidate.files.map((file, idx) => (
                                  <a 
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-250 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <FileText size={16} className="text-blue-500 shrink-0" />
                                      <span className="truncate">{file.name}</span>
                                    </div>
                                    <Download size={14} className="text-slate-400 hover:text-slate-600 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Evaluation & Approval controls */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Đánh giá của Quản trị viên</h4>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                              
                              {/* Star Rating selector */}
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <span className="text-sm font-semibold text-slate-700">Điểm đánh giá (1-5 sao):</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() => setRatings(prev => ({ ...prev, [candidate.id]: star }))}
                                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                                    >
                                      <Star 
                                        size={20} 
                                        className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} 
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Evaluation notes */}
                              <div className="space-y-2">
                                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                  <MessageSquare size={14} className="text-slate-400" />
                                  Nhận xét nội bộ:
                                </span>
                                <textarea
                                  rows={3}
                                  placeholder="Ghi nhận đánh giá năng lực ứng viên, lịch phỏng vấn..."
                                  value={note}
                                  onChange={(e) => setNotes(prev => ({ ...prev, [candidate.id]: e.target.value }))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                                />
                              </div>

                              <button
                                onClick={() => handleSaveEvaluation(candidate.id)}
                                disabled={savingId === candidate.id}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-blue-500/10"
                              >
                                {savingId === candidate.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Save size={14} />
                                )}
                                <span>Lưu nhận xét & Đánh giá</span>
                              </button>
                            </div>
                          </div>

                          {/* Approval Actions */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Thao tác hồ sơ</h4>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleUpdateStatus(candidate.id, 'approved')}
                                className="flex-1 min-w-[120px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle size={14} />
                                <span>Phê duyệt nhận</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(candidate.id, 'rejected')}
                                className="flex-1 min-w-[120px] py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/10 cursor-pointer"
                              >
                                <XCircle size={14} />
                                <span>Từ chối hồ sơ</span>
                              </button>
                              {candidate.status !== 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(candidate.id, 'pending')}
                                  className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Khôi phục chờ
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCandidate(candidate.id)}
                                className="px-3.5 py-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                title="Xóa ứng viên"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
