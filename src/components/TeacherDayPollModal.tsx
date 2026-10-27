import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, X, ChevronRight, PartyPopper, CheckCircle2, Utensils, 
  Calendar, Clock, MapPin, Users, HeartHandshake, Check, AlertCircle, Edit3
} from 'lucide-react';

interface TeacherDayPollModalProps {
  teacherId?: string;
  teacherName?: string;
  isSelf?: boolean;
}

const POLL_ID = 'party_20_11_2026';

export const TeacherDayPollModal: React.FC<TeacherDayPollModalProps> = ({ teacherId, teacherName, isSelf = false }) => {
  if (!isSelf) {
    return null;
  }

  const effectiveTeacherId = teacherId || 'GV_UNKNOWN';
  const effectiveTeacherName = teacherName || 'Quý Thầy/Cô';
  const sessionDismissKey = `dismissed_rsvp_20_11_${effectiveTeacherId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myVote, setMyVote] = useState<{
    option_id: number;
    option_title: string;
    guest_count: number;
    note: string;
  } | null>(null);

  // Form state
  const [selectedOption, setSelectedOption] = useState<number>(1);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Canvas confetti khi gửi thành công
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Đọc dữ liệu bình chọn từ máy chủ
  const fetchVoteData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${POLL_ID}`);
      if (res.ok) {
        const data = await res.json();
        const found = (data.votes || []).find((v: any) => v.teacher_id === effectiveTeacherId);
        if (found) {
          setMyVote({
            option_id: Number(found.option_id),
            option_title: found.option_title || '',
            guest_count: Number(found.guest_count) || 0,
            note: found.note || ''
          });
          setSelectedOption(Number(found.option_id));
          setGuestCount(Number(found.guest_count) || 1);
          setNote(found.note || '');
        } else {
          // Chưa bình chọn -> tự động mở popup để khảo sát
          const isDismissed = sessionStorage.getItem(sessionDismissKey);
          if (!isDismissed) {
            setIsOpen(true);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu khảo sát:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoteData();
  }, [effectiveTeacherId]);

  // Pháo hoa khi gửi thành công
  useEffect(() => {
    if (!successMsg) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      rotation: number;
      opacity: number;
    }

    const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#fbbf24'];
    const particles: Particle[] = [];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 60,
        y: canvas.height * 0.3,
        size: Math.random() * 6 + 3,
        speedX: (Math.random() - 0.5) * 10,
        speedY: (Math.random() - 0.8) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        opacity: 1
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.3;
        p.opacity = Math.max(0, p.opacity - 0.012);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (particles.some(p => p.opacity > 0)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [successMsg]);

  const handleClose = () => {
    setIsOpen(false);
    setIsEditing(false);
    try {
      sessionStorage.setItem(sessionDismissKey, 'true');
    } catch (e) {}
  };

  const getOptionTitle = (optId: number) => {
    switch (optId) {
      case 1: return 'Chắc chắn tham gia (Sẽ có mặt đúng giờ)';
      case 2: return 'Rất tiếc vì bận việc đột xuất không tham gia được';
      case 3: return 'Chưa chắc chắn lịch trình';
      default: return '';
    }
  };

  const handleSubmitVote = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        teacher_id: effectiveTeacherId,
        teacher_name: effectiveTeacherName,
        option_id: selectedOption,
        option_title: getOptionTitle(selectedOption),
        guest_count: 0,
        note: note.trim()
      };

      const res = await fetch(`/api/polls/${POLL_ID}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi lưu bình chọn');
      }

      setMyVote({
        option_id: selectedOption,
        option_title: payload.option_title,
        guest_count: payload.guest_count,
        note: payload.note
      });
      setSuccessMsg('Đã ghi nhận bình chọn của Thầy/Cô thành công!');
      setIsEditing(false);

      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu bình chọn. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* BANNER GHIM NHỎ TRÊN GIAO DIỆN TEACHER DASHBOARD */}
      <div className="mb-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 p-0.5 shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-3 rounded-[14px]">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <PartyPopper className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    Khảo Sát Tiệc 20/11 – Đặt Phòng VIP
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Tối Thứ 7, 14/11
                  </span>
                </div>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  {myVote ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" />
                      Bạn đã đăng ký: <span className="underline">{myVote.option_title}</span>
                    </span>
                  ) : (
                    <span>Trung tâm cần chốt số lượng trước 05/11 để đặt phòng VIP riêng cho Thầy/Cô</span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => { setIsOpen(true); setIsEditing(false); }}
              className="shrink-0 w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-black shadow-md shadow-purple-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {myVote ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Xem / Đổi Lựa Chọn</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bình Chọn Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT KHẢO SÁT BÌNH CHỌN */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden transform transition-all animate-scaleIn my-8">
            
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30 w-full h-full" />

            {/* Dải băng màu gradient phía trên cùng */}
            <div className="h-2.5 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400"></div>

            {/* Nút đóng */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-40 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5 sm:p-6 space-y-4 relative z-20">
              
              {/* Header Thiệp Mời */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-extrabold uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  THIỆP MỜI & KHẢO SÁT 20/11
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  Tiệc Tri Ân Ngày Nhà Giáo Việt Nam 🎓✨
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thân gửi Thầy/Cô <strong className="text-purple-700 font-bold">{effectiveTeacherName}</strong>, Trung tâm Cầu Vồng trân trọng kính mời Thầy/Cô tham gia buổi tiệc họp mặt ấm cúng mừng ngày 20/11!
                </p>
              </div>

              {/* Thông tin sự kiện */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50/50 to-amber-50/40 border border-purple-100 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Thời gian: <strong className="text-slate-900 font-bold">18:00 (Tối Thứ Bảy), ngày 14/11/2026</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Utensils className="w-4 h-4 text-pink-600 shrink-0" />
                  <span>Hình thức: <strong className="text-slate-900 font-bold">Tiệc Nhà Hàng & Hát Karaoke</strong></span>
                </div>
                <div className="flex items-start gap-2 text-slate-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    Do tối Thứ 7 các nhà hàng rất đông khách, Trung tâm cần chốt số lượng trước <strong>23:59 ngày 05/11/2026</strong> để đặt trước <strong>Phòng VIP riêng</strong> ấm cúng và chu đáo nhất cho Thầy/Cô.
                  </span>
                </div>
              </div>

              {/* THÔNG BÁO ĐÃ BÌNH CHỌN NẾU ĐÃ CÓ VOTE VÀ CHƯA BẤM SỬA */}
              {myVote && !isEditing ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Thầy/Cô đã hoàn tất bình chọn:</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5 text-xs text-slate-800">
                    <div className="font-extrabold text-sm text-purple-900">
                      {myVote.option_title}
                    </div>
                    {myVote.note && (
                      <div className="text-slate-600 italic">
                        "Ghi chú: {myVote.note}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Đổi Lựa Chọn Khác</span>
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Đã Nắm Rõ
                    </button>
                  </div>
                </div>
              ) : (
                /* FORM CHỌN Ý KIẾN */
                <div className="space-y-3 pt-1">
                  <div className="text-xs font-bold text-slate-800">
                    Chọn phương án của Thầy/Cô:
                  </div>

                  {/* Lựa chọn 1 */}
                  <label 
                    onClick={() => setSelectedOption(1)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedOption === 1 
                        ? 'border-purple-600 bg-purple-50/70 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pollOption"
                      checked={selectedOption === 1}
                      onChange={() => setSelectedOption(1)}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">
                        🎉 Chắc chắn tham gia
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Em sẽ có mặt đúng giờ lúc 18:00 tối Thứ 7, ngày 14/11
                      </div>
                    </div>
                  </label>

                  {/* Lựa chọn 2: Báo bận */}
                  <label 
                    onClick={() => setSelectedOption(2)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedOption === 2 
                        ? 'border-rose-600 bg-rose-50/70 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pollOption"
                      checked={selectedOption === 2}
                      onChange={() => setSelectedOption(2)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">
                        💌 Rất tiếc vì bận việc đột xuất không tham gia được
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Em gửi lời chúc mừng ngày 20/11 đến toàn thể Thầy Cô
                      </div>
                    </div>
                  </label>

                  {/* Lựa chọn 3: Chưa chắc chắn */}
                  <label 
                    onClick={() => setSelectedOption(3)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selectedOption === 3 
                        ? 'border-amber-600 bg-amber-50/70 shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pollOption"
                      checked={selectedOption === 3}
                      onChange={() => setSelectedOption(3)}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">
                        ⏳ Chưa chắc chắn lịch trình
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Em sẽ xác nhận lại trên App trước ngày 05/11/2026
                      </div>
                    </div>
                  </label>

                  {/* Ô ghi chú thêm */}
                  <div className="pt-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Ghi chú thêm (Ăn chay / Dị ứng / Đăng ký văn nghệ):</span>
                      <span className="text-slate-400 font-normal">Không bắt buộc</span>
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Em ăn chay, hoặc em xin đăng ký 1 bài hát..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Thông báo lỗi / thành công */}
                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Nút hành động */}
                  <div className="pt-2 flex items-center gap-2">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitVote}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black rounded-xl text-xs shadow-md shadow-purple-600/30 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <span>Đang lưu...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{myVote ? 'CẬP NHẬT BÌNH CHỌN' : 'XÁC NHẬN BÌNH CHỌN'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherDayPollModal;
