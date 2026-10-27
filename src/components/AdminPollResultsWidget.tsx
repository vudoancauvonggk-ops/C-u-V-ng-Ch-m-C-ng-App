import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, RefreshCw, ChevronDown, ChevronUp, Sparkles, CheckCircle2, 
  Utensils, PartyPopper, Calendar, Clock, Copy, Check, AlertCircle, UserCheck, UserX, HelpCircle
} from 'lucide-react';

const POLL_ID = 'party_20_11_2026';

interface VoteRecord {
  id: string;
  teacher_id: string;
  teacher_name: string;
  option_id: number;
  option_title: string;
  guest_count: number;
  note: string;
  created_at: string;
  updated_at: string;
}

interface PollStats {
  pollId: string;
  eventTitle: string;
  eventTime: string;
  deadline: string;
  isClosed: boolean;
  totalVotes: number;
  counts: Record<number, number>;
  attendingCount: number;
  totalSeats: number;
  notAttendingCount: number;
  notSureCount: number;
  votes: VoteRecord[];
}

export const AdminPollResultsWidget: React.FC = () => {
  const [stats, setStats] = useState<PollStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filterOption, setFilterOption] = useState<number | 'ALL'>('ALL');

  const fetchPollResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${POLL_ID}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Could not load poll results:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPollResults();
  }, []);

  const totalSeats = stats?.totalSeats || stats?.attendingCount || 0;
  const attending = stats?.attendingCount || 0;
  const notAttending = stats?.notAttendingCount || 0;
  const notSure = stats?.notSureCount || 0;
  const totalVotes = stats?.totalVotes || 0;

  const handleCopySummary = () => {
    if (!stats) return;
    const attendingList = (stats.votes || []).filter(v => Number(v.option_id) === 1);
    
    let text = `🎉 DANH SÁCH GIÁO VIÊN ĐĂNG KÝ TIỆC 20/11 - TRUNG TÂM CẦU VỒNG\n`;
    text += `⏰ Thời gian: 18:00 Thứ Bảy, 14/11/2026\n`;
    text += `👑 TỔNG SỐ SUẤT PHÒNG VIP CẦN ĐẶT: ${totalSeats} suất (chỉ gồm giáo viên trung tâm)\n`;
    text += `--------------------------------------------------\n`;
    attendingList.forEach((v, idx) => {
      const noteInfo = v.note ? ` [Ghi chú: ${v.note}]` : '';
      text += `${idx + 1}. ${v.teacher_name || v.teacher_id}${noteInfo}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const filteredVotes = (stats?.votes || []).filter(v => {
    if (filterOption === 'ALL') return true;
    return Number(v.option_id) === filterOption;
  });

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-purple-800/40 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        
        {/* Header Widget */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-800/30 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
              <PartyPopper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-800/60 border border-purple-600/40 text-purple-200 text-[10px] font-extrabold uppercase tracking-wide">
                  SỰ KIỆN 20/11
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                  Đang Mở Khảo Sát
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Khảo Sát Đặt Phòng VIP Tiệc 20/11
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-purple-200/80 mt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  18:00 Tối Thứ 7, 14/11/2026
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-400" />
                  Hạn chót: 23:59 ngày 05/11/2026
                </span>
                <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Chỉ dành cho Giáo viên (Đi 1 mình)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/50 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Sao chép danh sách giáo viên tham gia để gửi nhà hàng"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Đã Sao Chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao Chép Danh Sách</span>
                </>
              )}
            </button>
            <button
              onClick={fetchPollResults}
              disabled={loading}
              className="p-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/40 text-purple-200 transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* CÁC THẺ THỐNG KÊ (KPI CARDS CHO ADMIN) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Card 1: Tổng số suất phòng VIP (Quan trọng nhất) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-pink-500/20 to-purple-600/20 border-2 border-amber-400/60 shadow-lg">
            <div className="flex items-center justify-between text-amber-300 text-xs font-extrabold uppercase">
              <span>👑 Cần Đặt Phòng VIP</span>
              <Utensils className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                {totalSeats}
              </span>
              <span className="text-xs font-bold text-amber-200/90">suất ăn / ghế</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-200/70 font-medium">
              = {attending} Giáo viên tham gia
            </div>
          </div>

          {/* Card 2: Giáo viên chắc chắn tham gia */}
          <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-700/40">
            <div className="flex items-center justify-between text-purple-300 text-xs font-bold">
              <span>Chắc Chắn Tham Gia</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              {attending}
            </div>
            <div className="text-[10px] text-purple-300/70 mt-0.5">giáo viên (1 mình)</div>
          </div>

          {/* Card 3: Báo bận */}
          <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-700/40">
            <div className="flex items-center justify-between text-purple-300 text-xs font-bold">
              <span>Báo Bận</span>
              <UserX className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-300">
              {notAttending}
            </div>
            <div className="text-[10px] text-purple-300/70 mt-0.5">giáo viên</div>
          </div>

          {/* Card 4: Chưa chắc chắn */}
          <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-700/40">
            <div className="flex items-center justify-between text-purple-300 text-xs font-bold">
              <span>Chưa Chắc Chắn</span>
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-300">
              {notSure}
            </div>
            <div className="text-[10px] text-purple-300/70 mt-0.5">giáo viên</div>
          </div>

        </div>

        {/* Nút Thu gọn / Mở rộng danh sách chi tiết */}
        <div className="pt-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-3 px-4 rounded-2xl bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/40 text-purple-200 text-xs font-extrabold flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>
                Danh Sách Chi Tiết Giáo Viên Đã Bình Chọn ({totalVotes} phản hồi)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-purple-300">
              <span>{showDetails ? 'Thu gọn' : 'Xem danh sách'}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
        </div>

        {/* DANH SÁCH CHI TIẾT TỪNG PHIẾU BÌNH CHỌN */}
        {showDetails && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            {/* Bộ lọc lựa chọn */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-purple-300 font-semibold mr-1">Lọc:</span>
              <button
                onClick={() => setFilterOption('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterOption === 'ALL' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/70'
                }`}
              >
                Tất cả ({totalVotes})
              </button>
              <button
                onClick={() => setFilterOption(1)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterOption === 1 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/70'
                }`}
              >
                Chắc chắn tham gia ({attending})
              </button>
              <button
                onClick={() => setFilterOption(2)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterOption === 2 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/70'
                }`}
              >
                Báo bận ({notAttending})
              </button>
              <button
                onClick={() => setFilterOption(3)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterOption === 3 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/70'
                }`}
              >
                Chưa chắc chắn ({notSure})
              </button>
            </div>

            {/* Bảng danh sách */}
            <div className="bg-slate-950/60 rounded-2xl border border-purple-800/40 overflow-hidden">
              {filteredVotes.length === 0 ? (
                <div className="p-8 text-center text-xs text-purple-300/60">
                  Chưa có giáo viên nào trong mục này
                </div>
              ) : (
                <div className="divide-y divide-purple-800/30 max-h-96 overflow-y-auto">
                  {filteredVotes.map((v, idx) => {
                    const optId = Number(v.option_id);
                    let badgeClass = 'bg-slate-800 text-slate-300';
                    let badgeText = v.option_title;
                    if (optId === 1) {
                      badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                    } else if (optId === 2) {
                      badgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                    } else if (optId === 3) {
                      badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                    }

                    return (
                      <div key={v.id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-purple-900/20 transition text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-purple-400 font-mono text-[11px] w-5">
                            {idx + 1}.
                          </span>
                          <div>
                            <span className="font-bold text-white text-sm">
                              {v.teacher_name || v.teacher_id}
                            </span>
                            <span className="text-purple-300/60 text-[11px] ml-2 font-mono">
                              ({v.teacher_id})
                            </span>
                            {v.note && (
                              <div className="text-[11px] text-amber-300/90 italic mt-0.5">
                                💬 "{v.note}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto pl-8 sm:pl-0">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${badgeClass}`}>
                            {badgeText}
                          </span>
                          <span className="text-[10px] text-purple-300/50 font-mono">
                            {v.created_at ? new Date(v.created_at).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPollResultsWidget;
