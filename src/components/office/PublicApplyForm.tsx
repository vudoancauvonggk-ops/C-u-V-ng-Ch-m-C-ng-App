import React, { useState } from 'react';
import { Send, Upload, FileCheck, Loader2 } from 'lucide-react';

export function PublicApplyForm() {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('Giáo viên Full-time');
  const [teachingExp, setTeachingExp] = useState('');
  const [talents, setTalents] = useState('');
  const [achievements, setAchievements] = useState('');
  const [desiredSalary, setDesiredSalary] = useState('');
  
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const positions = [
    'Giáo viên Full-time',
    'Giáo viên Part-time',
    'Nhân viên Kế toán',
    'Nhân viên Marketing',
    'Khác'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !position || !dob.trim() || !address.trim() || !teachingExp.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('dob', dob);
      formData.append('address', address);
      formData.append('phone', phone);
      formData.append('email', email);
      formData.append('position', position);
      formData.append('teachingExp', teachingExp);
      formData.append('talents', talents);
      formData.append('achievements', achievements);
      formData.append('desiredSalary', desiredSalary);
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/apply', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.error || 'Có lỗi xảy ra khi nộp hồ sơ');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 font-sans text-white">
        {/* Blurred Custom Team Background Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ 
            backgroundImage: "url('/recruitment_bg.jpg')",
            filter: "blur(10px) brightness(0.35)"
          }}
        />
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl animate-fade-in relative z-10">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-3">Nộp hồ sơ thành công!</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Cảm ơn bạn <strong>{name}</strong> đã ứng tuyển vào vị trí <strong>{position}</strong>.<br />
            Bộ phận Tuyển dụng đã nhận được hồ sơ và sẽ sớm liên hệ lại với bạn qua Số điện thoại hoặc Email.
          </p>
          <button 
            onClick={() => {
              setSubmitted(false);
              setName('');
              setDob('');
              setAddress('');
              setPhone('');
              setEmail('');
              setTeachingExp('');
              setTalents('');
              setAchievements('');
              setDesiredSalary('');
              setFiles([]);
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Nộp thêm hồ sơ khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 md:p-8 font-sans text-white">
      {/* Blurred Custom Team Background Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ 
          backgroundImage: "url('/recruitment_bg.jpg')",
          filter: "blur(10px) brightness(0.35)"
        }}
      />
      <div className="max-w-2xl w-full bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl my-8 relative z-10">
        
        {/* Company Logo Display */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="Aerobic Cầu Vồng Logo" 
            className="h-24 md:h-28 w-auto object-contain rounded-full shadow-lg border border-slate-700/50 p-1.5 bg-white" 
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Ứng Tuyển Nhân Sự
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-2">
            Vui lòng điền thông tin và đính kèm CV, bằng cấp để tham gia ứng tuyển giáo viên.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Họ tên */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Họ và tên ứng viên <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          {/* Ngày sinh và Địa chỉ hiện tại */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="Ví dụ: 25/08/1998"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Địa chỉ hiện tại <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Điện thoại và Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Số điện thoại liên hệ <span className="text-red-500">*</span>
              </label>
              <input 
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Địa chỉ Email
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ví dụ: nguyenva@gmail.com"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Vị trí ứng tuyển và Mức lương mong muốn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Vị trí ứng tuyển <span className="text-red-500">*</span>
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              >
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Mức lương mong muốn
              </label>
              <input 
                type="text"
                value={desiredSalary}
                onChange={(e) => setDesiredSalary(e.target.value)}
                placeholder=""
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Mô tả kinh nghiệm dạy */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Mô tả kinh nghiệm dạy học <span className="text-red-500">*</span>
            </label>
            <textarea 
              rows={3}
              required
              value={teachingExp}
              onChange={(e) => setTeachingExp(e.target.value)}
              placeholder="Vui lòng mô tả các trường, trung tâm bạn đã từng dạy, đối tượng học sinh, môn học..."
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
            />
          </div>

          {/* Sở trường năng khiếu và Thành tựu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Sở trường, năng khiếu
              </label>
              <textarea 
                rows={2}
                value={talents}
                onChange={(e) => setTalents(e.target.value)}
                placeholder="Ví dụ: MC, Ca hát, Giao tiếp tốt..."
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Thành tựu đạt được (nếu có)
              </label>
              <textarea 
                rows={2}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="Ví dụ: Giáo viên giỏi cấp quận, giải thưởng dạy học..."
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
              />
            </div>
          </div>

          {/* Tải lên tài liệu đính kèm */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Hồ sơ đính kèm (CV, Bằng cấp, Ảnh chứng chỉ...)
            </label>
            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/30">
              <Upload size={24} className="text-slate-500 mb-2" />
              <span className="text-xs text-slate-400 text-center font-medium">
                Kéo thả hoặc nhấp để chọn tệp tin tải lên
              </span>
              <span className="text-[10px] text-slate-600 mt-1">
                Chấp nhận tài liệu PDF, Word, JPG, PNG (Tối đa 20MB)
              </span>
              <input 
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Hiển thị file đã chọn */}
            {files.length > 0 && (
              <div className="mt-3 bg-slate-950/40 border border-slate-850 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Tệp đã chọn ({files.length}):</p>
                {files.map((file, idx) => (
                  <div key={idx} className="text-xs text-slate-300 flex items-center justify-between font-medium">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nút gửi */}
          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-6"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xử lý tải hồ sơ...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Nộp hồ sơ ứng tuyển</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
