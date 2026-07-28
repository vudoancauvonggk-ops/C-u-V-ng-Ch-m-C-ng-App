import React, { useState, useEffect } from 'react';
import { Send, Bot, ShieldCheck, AlertCircle, Terminal, RefreshCw, Copy, Check, Link, Link2Off, Bell, Mail, Key, Server, ToggleLeft, ToggleRight } from 'lucide-react';
import { get, set as setIdb } from 'idb-keyval';

export function TelegramIntegration() {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState<any>({
    connected: false,
    hasToken: false,
    botUsername: '',
    botName: '',
    chatId: '',
    verificationCode: '',
    logs: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Email Config State
  const [emailConfig, setEmailConfig] = useState<any>({
    email: '',
    password: '',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    scanTax: true,
    scanBhxh: true,
    reportNoon: true,
    reportNight: true
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    fetchEmailConfig();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      setStatus(data);
      if (data.hasToken && !tokenInput) {
        setTokenInput('••••••••••••••••••••••••••••••••••••');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Telegram status:', err);
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const res = await fetch('/api/email/config');
      const data = await res.json();
      setEmailConfig(data);
    } catch (err) {
      console.error('Error fetching email config:', err);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput || tokenInput.startsWith('•••')) {
      setErrorMessage('Vui lòng nhập API Token hợp lệ.');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Đã kết nối với Bot: @${data.botUsername}`);
        fetchStatus();
      } else {
        setErrorMessage(data.error || 'Không thể thiết lập Token. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      setErrorMessage('Lỗi kết nối tới Server.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy liên kết với tài khoản Telegram hiện tại?')) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/telegram/unlink', { method: 'POST' });
      if (res.ok) {
        setSuccessMessage('Đã hủy liên kết thành công.');
        setTokenInput('');
        fetchStatus();
      }
    } catch (err) {
      setErrorMessage('Lỗi kết nối tới Server.');
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/telegram/send-test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Đã gửi tin nhắn thử nghiệm thành công tới Telegram của bạn!');
      } else {
        setErrorMessage(data.error || 'Gửi thất bại.');
      }
    } catch (err) {
      setErrorMessage('Lỗi kết nối tới Server.');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`/link ${status.verificationCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const contracts = await get('ai_contracts_idb') || [];
      const tasks = await get('ai_tasks_idb') || [];
      const complianceData = await get('ai_compliance_data') || {};
      const reportingGuidesList = [
        { id: 'thue_gtgt_2026', area: 'Thuế', title: 'Tờ khai thuế GTGT & TNCN định kỳ (Quý/Tháng)', deadline: '31/10/2026', date: '2026-10-31' },
        { id: 'thue_tndn_2026', area: 'Thuế', title: 'Tạm nộp Thuế thu nhập doanh nghiệp (TNDN) theo Quý', deadline: '31/10/2026', date: '2026-10-31' },
        { id: 'thue_qtoan_2026', area: 'Thuế', title: 'Quyết toán Thuế TNDN & Báo cáo tài chính năm', deadline: '31/03/2027', date: '2027-03-31' },
        { id: 'bhxh_khai_2026', area: 'BHXH', title: 'Kê khai tăng/giảm lao động đóng BHXH, BHYT, BHTN', deadline: '17/07/2026', date: '2026-07-17' },
        { id: 'laodong_bcao_2026', area: 'Lao động', title: 'Báo cáo tình hình sử dụng lao động định kỳ (6 tháng & cả năm)', deadline: '05/12/2026', date: '2026-12-05' },
        { id: 'yte_bcao_atvsld_2026', area: 'Y tế', title: 'Báo cáo công tác An toàn, Vệ sinh lao động & Y tế hằng năm', deadline: '10/01/2027', date: '2027-01-10' },
        { id: 'yte_bcao_tainan_2026', area: 'Y tế', title: 'Báo cáo tổng hợp tình hình tai nạn lao động định kỳ', deadline: '10/01/2027', date: '2027-01-10' },
        { id: 'yte_bcao_tainan_6th_2026', area: 'Y tế', title: 'Báo cáo tổng hợp tình hình tai nạn lao động 6 tháng đầu năm', deadline: '05/07/2026', date: '2026-07-05' },
        { id: 'thongke_vondautu_2026', area: 'Thuế', title: 'Kê khai điều tra vốn đầu tư Quý (Tổng cục Thống kê)', deadline: '12/06/2026', date: '2026-06-12' }
      ];
      
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

      const res = await fetch('/api/telegram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts, tasks, compliance: activeAlerts })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.telegramContracts && data.telegramContracts.length > 0 && contracts.length === 0) {
          await setIdb('ai_contracts_idb', data.telegramContracts);
        }
        if (data.telegramCompliance && (!complianceData || Object.keys(complianceData).length === 0)) {
          await setIdb('ai_compliance_data', data.telegramCompliance);
        }

        if (data.telegramTasks && data.telegramTasks.length > 0) {
          const updatedTasks = [...tasks];
          data.telegramTasks.forEach((t: any) => {
            if (!updatedTasks.some(ut => ut.id === t.id)) {
              updatedTasks.push(t);
            }
          });
          await setIdb('ai_tasks_idb', updatedTasks);
          window.dispatchEvent(new Event('tasks_updated'));
        }
        
        if (data.allTasks && data.allTasks.length > 0) {
          const localTasks = await get('ai_tasks_idb') || [];
          const merged = [...localTasks];
          data.allTasks.forEach((serverTask: any) => {
            const index = merged.findIndex(mt => mt.id === serverTask.id);
            if (index >= 0) {
              if (merged[index].status !== serverTask.status) {
                merged[index].status = serverTask.status;
              }
            } else {
              merged.push(serverTask);
            }
          });
          await setIdb('ai_tasks_idb', merged);
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Email Config Handlers
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaving(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      const res = await fetch('/api/email/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig)
      });
      if (res.ok) {
        setEmailSuccess('Đã lưu cấu hình Email thành công và kích hoạt dịch vụ quét.');
        fetchEmailConfig();
      } else {
        const data = await res.json();
        setEmailError(data.error || 'Lỗi lưu cấu hình.');
      }
    } catch (err) {
      setEmailError('Lỗi kết nối tới Server.');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleTestEmailConnection = async () => {
    setEmailTesting(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      const res = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSuccess('Kết nối tới hộp thư thành công! Sẵn sàng quét email.');
      } else {
        setEmailError(data.error || 'Kiểm tra kết nối thất bại.');
      }
    } catch (err) {
      setEmailError('Lỗi kết nối tới Server.');
    } finally {
      setEmailTesting(false);
    }
  };

  // Auto-sync every 10 seconds
  useEffect(() => {
    if (!loading && status.connected) {
      triggerSync();
      const syncInterval = setInterval(triggerSync, 10000);
      return () => clearInterval(syncInterval);
    }
  }, [loading, status.connected]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
        <p className="text-sm font-medium">Đang tải cấu hình kết nối...</p>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Send className="text-blue-500" size={26} />
            Điều khiển từ xa & Quét Email
          </h1>
          <p className="text-slate-500 mt-1">Kết nối bot Telegram để theo dõi tình trạng, nhận cảnh báo hết hạn và quét email thuế/bảo hiểm tự động.</p>
        </div>
        
        <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 self-start md:self-center">
          <span className="relative flex h-3 w-3">
            {status.connected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </>
            ) : status.hasToken ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            )}
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {status.connected ? 'Đã liên kết thiết bị' : status.hasToken ? 'Chờ liên kết người dùng' : 'Chưa cấu hình Bot'}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle className="shrink-0 text-red-500 mt-0.5" size={18} />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="shrink-0 text-emerald-500 mt-0.5" size={18} />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Setup Bot Token */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-base mb-4 flex items-center gap-2">
              <Bot className="text-indigo-500" size={20} />
              1. Cấu hình Bot Telegram
            </h3>
            
            <form onSubmit={handleSaveToken} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Bot API Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Nhập API Token của bạn (ví dụ: 123456789:ABC...)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="submit"
                    disabled={saving || !tokenInput}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-sm font-medium shadow-sm transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    Kích hoạt
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-4 bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
              <p className="font-bold text-slate-700">💡 Cách tạo Bot Telegram mới:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tìm kiếm tài khoản <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold font-sans">@BotFather</a> trên ứng dụng Telegram.</li>
                <li>Gửi tin nhắn <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/newbot</code> và làm theo hướng dẫn đặt tên.</li>
                <li>Sao chép đoạn mã <b>HTTP API Token</b> nhận được và dán vào ô bên trên.</li>
              </ol>
            </div>
          </div>

          {/* Card 2: Link Chat ID */}
          {status.hasToken && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-70"></div>
              
              <h3 className="font-semibold text-slate-900 text-base mb-4 flex items-center gap-2">
                <Link className="text-blue-500" size={20} />
                2. Liên kết tài khoản cá nhân
              </h3>

              {!status.connected ? (
                <div className="space-y-6">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Vui lòng mở ứng dụng Telegram, tìm kiếm bot 
                    {status.botUsername ? (
                      <a href={`https://t.me/${status.botUsername}`} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline mx-1 font-sans">
                        @{status.botUsername}
                      </a>
                    ) : (
                      <span className="font-bold text-indigo-600"> của bạn</span>
                    )} 
                    ấn nút <b>Bắt đầu (Start)</b> và gửi tin nhắn kích hoạt theo định dạng sau:
                  </p>

                  <div className="bg-slate-950 text-slate-100 rounded-xl p-5 flex items-center justify-between shadow-inner border border-slate-800">
                    <div className="space-y-1.5 font-sans">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Cú pháp gửi cho Bot</span>
                      <p className="font-mono text-xl md:text-2xl font-bold tracking-wide select-all text-white">
                        /link {status.verificationCode}
                      </p>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors border border-slate-800 flex items-center gap-1.5 cursor-pointer text-xs font-semibold font-sans"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      {copied ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-4.5 py-3 rounded-xl">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Hệ thống đang chờ lệnh kết nối từ Telegram (tự động phát hiện)...
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4.5">
                      <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-500/10">
                        <Bot size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">Bot: @{status.botUsername}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Tên: {status.botName}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">ID Chat: {status.chatId}</span>
                      <span className="text-[10px] text-slate-400 mt-1">Đã đồng bộ hóa an toàn</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSendTest}
                      disabled={testing}
                      className="px-4.5 py-2 bg-slate-900 hover:bg-slate-950 text-white disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-102 active:scale-98 flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      {testing ? <RefreshCw size={12} className="animate-spin" /> : <Bell size={12} />}
                      Gửi tin nhắn thử
                    </button>
                    
                    <button
                      onClick={triggerSync}
                      disabled={syncing}
                      className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-102 active:scale-98 flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Đồng bộ dữ liệu ngay
                    </button>

                    <button
                      onClick={handleUnlink}
                      className="px-4.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      <Link2Off size={12} />
                      Hủy liên kết Bot
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 3: Email AI Scanner Setup */}
          {status.connected && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                  <Mail className="text-blue-500" size={20} />
                  3. Cấu hình AI quét Email & Báo cáo
                </h3>
                
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  emailConfig.email && emailConfig.password
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {emailConfig.email && emailConfig.password ? 'Đang kích hoạt' : 'Chưa cấu hình'}
                </span>
              </div>

              {emailError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl p-3.5 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3.5 text-xs flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveEmailConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                      <Mail size={12} /> Địa chỉ Email
                    </label>
                    <input
                      type="email"
                      required
                      value={emailConfig.email || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                      placeholder="user@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                      <Key size={12} /> Mật khẩu ứng dụng (App Password)
                    </label>
                    <input
                      type="password"
                      required
                      value={emailConfig.password || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                      placeholder="Mật khẩu 16 ký tự Gmail..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                      <Server size={12} /> Máy chủ IMAP Host
                    </label>
                    <input
                      type="text"
                      required
                      value={emailConfig.host || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                      placeholder="imap.gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                      Port IMAP
                    </label>
                    <input
                      type="number"
                      required
                      value={emailConfig.port || 993}
                      onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) })}
                      placeholder="993"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Filters & Schedules */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tùy chọn lọc nội dung & Thời gian báo cáo</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Filter categories */}
                    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase">Chủ đề lọc khẩn cấp</h5>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Lọc & báo ngay email liên quan tới Thuế</span>
                        <button
                          type="button"
                          onClick={() => setEmailConfig({ ...emailConfig, scanTax: !emailConfig.scanTax })}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {emailConfig.scanTax ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-slate-400" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Lọc & báo ngay email liên quan tới BHXH</span>
                        <button
                          type="button"
                          onClick={() => setEmailConfig({ ...emailConfig, scanBhxh: !emailConfig.scanBhxh })}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {emailConfig.scanBhxh ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Schedulers */}
                    <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase">Thời gian gửi báo cáo tóm tắt</h5>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Báo cáo tóm tắt vào 12h00 trưa</span>
                        <button
                          type="button"
                          onClick={() => setEmailConfig({ ...emailConfig, reportNoon: !emailConfig.reportNoon })}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {emailConfig.reportNoon ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-slate-400" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Báo cáo tóm tắt vào 21h00 tối</span>
                        <button
                          type="button"
                          onClick={() => setEmailConfig({ ...emailConfig, reportNight: !emailConfig.reportNight })}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {emailConfig.reportNight ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={emailSaving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    {emailSaving && <RefreshCw size={12} className="animate-spin" />}
                    Lưu cấu hình Email
                  </button>

                  <button
                    type="button"
                    onClick={handleTestEmailConnection}
                    disabled={emailTesting || !emailConfig.email || !emailConfig.password}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    {emailTesting && <RefreshCw size={12} className="animate-spin" />}
                    Kiểm tra kết nối Hộp thư
                  </button>
                </div>
              </form>

              <div className="bg-amber-50 border border-amber-250/50 rounded-xl p-4 text-[11px] text-amber-800 leading-relaxed space-y-1 bg-amber-50/50">
                <p className="font-bold">⚠️ Lưu ý bảo mật cho tài khoản Gmail:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Bạn <b>không được dùng mật khẩu chính</b> của tài khoản Google.</li>
                  <li>Bạn cần tạo một <b>Mật khẩu ứng dụng (App Password)</b> 16 chữ số riêng biệt dành cho ứng dụng này.</li>
                  <li>Truy cập vào tài khoản Google &gt; Bảo mật &gt; Xác minh 2 bước &gt; Mật khẩu ứng dụng để tạo khóa bảo mật.</li>
                  <li>Nếu sử dụng Outlook hoặc mail công ty, hãy liên hệ IT để lấy thông số IMAP thích hợp.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[400px]">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="text-emerald-500" size={16} />
                <span className="text-xs font-bold text-slate-300 font-mono">Nhật ký Bot (Live Logs)</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-3 bg-slate-950 text-slate-300">
              {status.logs && status.logs.length > 0 ? (
                status.logs.map((log: any, idx: number) => (
                  <div key={idx} className="border-b border-slate-900 pb-2 last:border-0">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>[{log.time}]</span>
                      <span className="font-bold text-slate-400">{log.sender}</span>
                    </div>
                    <p className={`leading-relaxed break-all ${
                      log.sender === 'Hệ thống' ? 'text-indigo-400 font-semibold' :
                      log.sender === 'Email Scanner' ? 'text-blue-400 font-semibold' :
                      log.sender === 'Lỗi' ? 'text-rose-400 font-semibold' : 'text-slate-300'
                    }`}>
                      {log.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-center italic">
                  Chưa có hoạt động nào được ghi nhận.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">📲 Các lệnh điều khiển từ xa</h4>
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">/status</code>
                <p className="leading-relaxed">Xem báo cáo tổng hợp nhanh về hợp đồng, công việc, tuân thủ.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">/tasks</code>
                <p className="leading-relaxed">Xem danh sách các công việc chưa hoàn thành.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">/addtask</code>
                <p className="leading-relaxed">Cú pháp: <code className="font-mono bg-slate-50 px-1 font-semibold">/addtask [nội dung]</code>. Thêm nhanh việc mới vào hệ thống.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">/contracts</code>
                <p className="leading-relaxed">Liệt kê danh sách các hợp đồng mới nhất.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">/alerts</code>
                <p className="leading-relaxed">Nhận danh sách các báo cáo tuân thủ sắp đến hạn nộp.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">/checkmail</code>
                <p className="leading-relaxed">Yêu cầu Bot quét email mới về Thuế/BHXH ngay lập tức.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
