import React, { useState, useEffect } from 'react';
import { 
  Lock, Eye, EyeOff, Search, FileSpreadsheet, Copy, Check, AlertTriangle, 
  Sparkles, CheckCircle2, DollarSign, Calendar, Save, RefreshCw, Clock, Trash2, Plus, CopyPlus
} from 'lucide-react';
import { School, ClassInfo, AttendanceLog, Schedule } from '../types';

interface SchoolPayrollTabProps {
  schools: School[];
  classes: ClassInfo[];
  attendance: AttendanceLog[];
  schedules: Schedule[];
  schoolCancellations: any[];
  currentUser: any;
  onAddAuditLog: (action: string, actor: string, details: string) => void;
  onUpdateSchools: (schools: School[]) => void;
}

export interface PayrollRowState {
  rowId: string;
  displayName: string;
  schoolId: string;
  classesCount: number;
  rawHourlyRate: string;
  isInvoice: boolean;
  isCsvRow: boolean;
}

export default function SchoolPayrollTab({
  schools,
  classes,
  attendance,
  schedules,
  schoolCancellations,
  currentUser,
  onAddAuditLog,
  onUpdateSchools
}: SchoolPayrollTabProps) {
  // Authentication & Verification
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Month selector
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}`;
  });

  // Local edits state to track unsaved edits inline before DB update completes
  const [edits, setEdits] = useState<Record<string, { tuitionRate?: string; isInvoice?: boolean; classesCount?: number }>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSchoolId, setCopiedSchoolId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  // Directly save a school's rate, invoice status, and class count to the DB
  const handleSaveSchoolRate = async (schoolId: string, tuitionRate: string, isInvoice: boolean, classesCount: number) => {
    if (!currentUser?.username) return;
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/admin/save-school-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.username,
          password: adminPassword,
          schoolRates: [{
            schoolId,
            tuitionRate,
            isInvoice,
            classesCount
          }]
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        onUpdateSchools(result.schools);
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  };

  // Helper to handle inline field updates and trigger auto-save
  const updateSchoolField = (schoolId: string, field: 'tuitionRate' | 'isInvoice' | 'classesCount', value: any) => {
    // 1. Update local edits state for immediate UI feedback
    setEdits(prev => ({
      ...prev,
      [schoolId]: {
        ...prev[schoolId],
        [field]: value
      }
    }));

    // 2. Fetch the target school to get current database values
    const targetSchool = schools.find(s => s.id === schoolId);
    if (!targetSchool) return;

    const schoolClasses = classes.filter(c => c.schoolId === schoolId && !c.isDeleted);
    const dbClassesCount = targetSchool.classesCount || schoolClasses.length || 1;

    const finalTuitionRate = field === 'tuitionRate' ? value : (edits[schoolId]?.tuitionRate ?? targetSchool.tuitionRate ?? '');
    const finalIsInvoice = field === 'isInvoice' ? value : (edits[schoolId]?.isInvoice ?? !!targetSchool.isInvoice);
    const finalClassesCount = field === 'classesCount' ? value : (edits[schoolId]?.classesCount ?? dbClassesCount);

    // 3. Trigger debounce save to DB
    const timer = setTimeout(() => {
      handleSaveSchoolRate(schoolId, finalTuitionRate, finalIsInvoice, finalClassesCount);
    }, 800);
    return () => clearTimeout(timer);
  };

  // Generate Year-Month options
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${yyyy}-${mm}`;
      const label = `Tháng ${mm}/${yyyy}`;
      options.push({ val, label });
    }
    return options;
  };

  // Get occurrences of each day of week in the selected month
  const getDayOfWeekOccurrences = (monthStr: string): Record<number, number> => {
    const [year, month] = monthStr.split('-').map(Number);
    const dayOfWeekOccurrences: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    const numDays = new Date(year, month, 0).getDate();
    
    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const appDay = dayOfWeek === 0 ? 8 : dayOfWeek + 1; // 2 = Mon, ..., 8 = Sun
      dayOfWeekOccurrences[appDay] = (dayOfWeekOccurrences[appDay] || 0) + 1;
    }
    return dayOfWeekOccurrences;
  };

  const dayOfWeekOccurrences = getDayOfWeekOccurrences(reportMonth);

  // Verify Admin Password
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/admin/school-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.username,
          password: adminPassword
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setIsAdminVerified(true);
        onAddAuditLog('Truy cập bảng lương đối soát các trường phải thu', currentUser?.username || 'Admin', 'Thành công');
      } else {
        setVerificationError(result.error || 'Mật khẩu xác thực không đúng!');
      }
    } catch (err: any) {
      setVerificationError('Lỗi kết nối máy chủ.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper: adjust period count according to business rule (if needed, kept for reference)
  const adjustPeriod = (p: number) => {
    if (p === 1) return 2;
    if (p === 2) return 2.5;
    return p;
  };

  // Helper: format currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num).replace('₫', 'VNĐ');
  };

  // Helper: parse rate string
  const parseRate = (rateStr: string) => {
    const clean = rateStr.toLowerCase().trim();
    
    // Detect per-period if it contains 'tiết', 'tiet', '/t', or '/1'
    const isPerPeriod = clean.includes('tiết') || 
                        clean.includes('tiet') || 
                        clean.includes('/t') || 
                        clean.includes('/1');
    
    // Split by slash to avoid parsing digits in the denominator (like "/1 tiết")
    const parts = clean.split('/');
    const valuePart = parts[0].trim();
    
    let amount = 0;
    if (valuePart.includes('k')) {
      const match = valuePart.match(/(\d+(?:\.\d+)?)\s*k/);
      if (match) {
        amount = parseFloat(match[1]) * 1000;
      }
    } else {
      const match = valuePart.replace(/[^0-9]/g, '');
      const num = parseFloat(match);
      if (!isNaN(num)) {
        if (num < 10000) {
          amount = num * 1000; // e.g. 725 -> 725.000 VNĐ
        } else {
          amount = num;
        }
      }
    }
    return { amount, isPerPeriod };
  };

  // Helper: get effective school ID from attendance log
  const getEffectiveSchoolId = (log: AttendanceLog): string => {
    if (log.schoolId) return log.schoolId;
    const cls = classes.find(c => c.id === log.classId && !c.isDeleted);
    return cls?.schoolId || '';
  };

  // Get unique active school IDs from BOTH:
  // 1. Weekly teaching schedules (Lịch dạy tuần chuẩn)
  const scheduleSchoolIds = schedules.filter(s => !s.isDeleted).map(s => s.schoolId);

  // 2. Approved attendance logs in this month (Chấm công thực tế đã duyệt)
  const approvedLogs = attendance.filter(a => 
    !(a as any).isDeleted && 
    a.date.startsWith(reportMonth) && 
    (a.confirmedByAdmin || a.isVerified)
  );
  const attendanceSchoolIds = approvedLogs.map(getEffectiveSchoolId).filter(Boolean);

  // Merge & deduplicate school IDs to build the definitive active schools list
  const activeSchoolIds = Array.from(new Set([...scheduleSchoolIds, ...attendanceSchoolIds]));

  // Resolve school details from DB (including deleted ones only if they have approved attendance logs)
  const activeSchools = activeSchoolIds
    .map(id => schools.find(s => s.id === id))
    .filter(s => s && (!s.isDeleted || attendanceSchoolIds.includes(s.id))) as School[];

  // Perform computations for each school dynamically
  const calculatedRows = activeSchools.map(sch => {
    // Get tuitionRate, isInvoice, and classesCount (prefer local edits, fallback to DB school settings)
    const schoolEdits = edits[sch.id] || {};
    const rawHourlyRate = schoolEdits.tuitionRate !== undefined ? schoolEdits.tuitionRate : (sch.tuitionRate || '');
    const isInvoice = schoolEdits.isInvoice !== undefined ? schoolEdits.isInvoice : !!sch.isInvoice;
    
    const schoolClasses = classes.filter(c => c.schoolId === sch.id && !c.isDeleted);
    const dbClassesCount = sch.classesCount || schoolClasses.length || 1;
    const classesCount = schoolEdits.classesCount !== undefined ? schoolEdits.classesCount : dbClassesCount;

    const { amount: unitPrice, isPerPeriod } = parseRate(rawHourlyRate);

    // Attendance stats from DB
    let actualPeriods = 0;
    let expectedPeriods = 0;

    const schoolClassIds = new Set(schoolClasses.map(c => c.id));

    // 1. Expected periods from teaching schedules
    schoolClassIds.forEach(clsId => {
      const classSchedules = schedules.filter(s => s.classId === clsId && !s.isDeleted);
      const classExpected = classSchedules.reduce((sum, s) =>
        sum + (dayOfWeekOccurrences[s.dayOfWeek] || 0) * (s.periods || 1), 0
      );
      expectedPeriods += classExpected;
    });

    // 2. Actual periods from approved logs in this month
    const schoolLogs = approvedLogs.filter(a => {
      if (a.schoolId === sch.id) return true;
      if (a.classId && schoolClassIds.has(a.classId)) return true;
      if (!a.schoolId) return getEffectiveSchoolId(a) === sch.id;
      return false;
    });
    actualPeriods = schoolLogs.reduce((acc, curr) => acc + (curr.periods || 0), 0);

    let calculatedAmount = 0;
    let formula = '';
    
    if (isPerPeriod) {
      calculatedAmount = actualPeriods * unitPrice;
      formula = `${actualPeriods} tiết thực tế × ${formatVND(unitPrice)}`;
    } else {
      const ratio = expectedPeriods > 0 ? (actualPeriods / expectedPeriods) : 0;
      calculatedAmount = Math.round(unitPrice * classesCount * ratio);
      
      if (expectedPeriods > 0) {
        formula = `${formatVND(unitPrice)} × ${classesCount} lớp × (${actualPeriods} tiết dạy thực tế / ${expectedPeriods} tiết phải dạy)`;
      } else {
        formula = `${formatVND(unitPrice)} × ${classesCount} lớp × (0/0 tiết)`;
      }
    }

    const missedPeriods = Math.max(0, expectedPeriods - actualPeriods);

    return {
      rowId: sch.id,
      displayName: sch.name,
      schoolId: sch.id,
      classesCount,
      rawHourlyRate,
      isInvoice,
      unitPrice,
      isPerPeriod,
      actualPeriods,
      expectedPeriods,
      missedPeriods,
      calculatedAmount,
      formula,
      dbSchool: sch
    };
  });

  // Filtered rows for UI search
  const filteredRows = calculatedRows.filter(row => 
    row.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorted alphabetically by displayName (A-Z)
  const sortedRows = [...filteredRows].sort((a, b) => 
    a.displayName.localeCompare(b.displayName, 'vi', { sensitivity: 'base' })
  );

  const totalPayrollValue = calculatedRows.reduce((acc, curr) => acc + curr.calculatedAmount, 0);
  const totalActualPeriods = calculatedRows.reduce((acc, curr) => acc + (curr.actualPeriods || 0), 0);

  // Copy notification message
  const handleCopyMessage = (row: typeof calculatedRows[0]) => {
    const monthNum = parseInt(reportMonth.split('-')[1]);
    const yearNum = reportMonth.split('-')[0];
    
    let msg = '';
    if (row.isInvoice) {
      msg = `Trung Tâm  xin gửi tới Nhà Trường  ${row.dbSchool?.name || row.displayName} Thông Báo học phí tháng ${monthNum}/${yearNum} Bộ Môn Nhảy :\nHọc Phí Thang ${monthNum} :Có Tổng ${row.classesCount} lớp : = ${formatVND(row.calculatedAmount)}\nTài Khoản Nhận Học Phí : \nCTY TNHH TM DV NGHỆ THUẬT CẦU VỒNG\nSố tài khoản : 555283848\nTại Ngân Hàng TMCP - Tân Định (ACB)\nMọi Thắc mắc xin liên hệ zalo hoặc số điện thoại 0785909929`;
    } else {
      const missedStr = row.missedPeriods > 0 ? ` ( nghỉ ${row.missedPeriods} buổi)` : '';
      msg = `Trung Tâm xin gửi tới Nhà Trường ${row.dbSchool?.name || row.displayName} Thông Báo học phí :\n- Tháng ${monthNum} : Gồm ${row.classesCount} Lớp Aerobic hiện đại  = ${formatVND(row.calculatedAmount)}${missedStr}\nNguyen Canh Thang \nNgân Hàng : BIDV \nSố tài Khoản : 8814682177\nMọi Thắc mắc xin liên hệ zalo hoặc số điện thoại 0785909929`;
    }

    navigator.clipboard.writeText(msg).then(() => {
      setCopiedSchoolId(row.rowId);
      setTimeout(() => setCopiedSchoolId(null), 2000);
      onAddAuditLog('Copy mẫu tin nhắn báo học phí trường', currentUser?.username || 'Admin', `Trường: ${row.displayName}`);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  // Locked Screen
  if (!isAdminVerified) {
    return (
      <div className="flex flex-col items-center justify-center p-12 max-w-md mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl space-y-6 mt-10 animate-fadeIn">
        <div className="p-4 bg-red-50 text-red-500 rounded-full border border-red-100">
          <Lock className="h-12 w-12" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900 font-sans">Khu vực Tuyệt Mật</h2>
          <p className="text-slate-500 text-sm">Vui lòng nhập mật khẩu tài khoản Admin của bạn để mở khóa bảng đối soát học phí công ty.</p>
        </div>
        
        <form onSubmit={handleVerifyPassword} className="w-full space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Nhập mật khẩu Admin..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-sans font-semibold transition text-slate-800"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {verificationError && (
            <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 justify-center bg-red-50/50 p-2 rounded-xl border border-red-100">
              <AlertTriangle className="h-3.5 w-3.5" /> {verificationError}
            </p>
          )}
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/10 active:scale-98 transition flex items-center justify-center gap-2"
          >
            {isVerifying ? 'Đang mở khóa...' : 'Mở khóa'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CONTROL BAR */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bảng Lương Các Trường Phải Thu</h1>
            <p className="text-xs text-slate-500">Đối soát học phí công ty phải thu dựa trên đơn giá và số tiết dạy thực tế.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl w-full sm:w-auto">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none border-none cursor-pointer font-sans"
            >
              {getMonthOptions().map(opt => (
                <option key={opt.val} value={opt.val}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Auto-save Status Indicator */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl text-xs font-bold animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>Đang lưu...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đã lưu vào DB</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span>Lỗi lưu tự động</span>
            </span>
          )}
        </div>
      </div>
      {/* SUMMARY DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <DollarSign className="h-24 w-24" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Tổng Học Phí Phải Thu ({reportMonth})</p>
          <p className="text-3xl font-extrabold mt-2 font-mono">{formatVND(totalPayrollValue)}</p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1 rounded-xl w-max">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đối soát {sortedRows.length} trường
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Hóa Đơn Cần Xuất</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {calculatedRows.filter(r => r.isInvoice).length} <span className="text-xs text-slate-400 font-normal">trường</span>
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 border border-amber-100 rounded-2xl font-bold text-xs uppercase">
            Hóa đơn đỏ
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Thanh toán cá nhân</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {calculatedRows.filter(r => !r.isInvoice).length} <span className="text-xs text-slate-400 font-normal">trường</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-2xl font-bold text-xs uppercase">
            Tiền mặt/Cá nhân
          </div>
        </div>

        {/* Tổng số tiết đã dạy */}
        <div className="bg-gradient-to-tr from-green-600 to-teal-700 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10">
            <Clock className="h-24 w-24" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-green-100">Tổng số tiết đã dạy ({reportMonth})</p>
          <p className="text-3xl font-extrabold mt-2 font-mono">{totalActualPeriods.toLocaleString()} <span className="text-sm font-normal text-green-200">tiết</span></p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-green-100 bg-white/10 px-3 py-1 rounded-xl w-max">
            <CheckCircle2 className="h-3.5 w-3.5" /> {calculatedRows.length} trường
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm trường học..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition"
            />
          </div>
          <div className="text-xs text-blue-600 bg-blue-50 border border-blue-150 px-4 py-2 rounded-2xl font-semibold flex items-center gap-1.5 animate-fadeIn">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Đang đối soát danh sách trường có lịch dạy học hoặc phát sinh chấm công thực tế trong tháng. Đơn giá và số lớp tự động lưu lại vào CSDL khi chỉnh sửa.</span>
          </div>
        </div>

        {/* PAYROLL DETAILS TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 animate-fadeIn">
          <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                <th className="p-4">Tên trường</th>
                <th className="p-4 text-center">Số Lớp</th>
                <th className="p-4 text-right">Đơn Giá</th>
                <th className="p-4 text-center">Tiết Dạy / Tiết Phải Dạy</th>
                <th className="p-4 text-right">Thành Tiền</th>
                <th className="p-4 text-center">Thông báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium font-sans">
                    Không tìm thấy trường nào có lịch dạy học hoặc phát sinh chấm công trong tháng này.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.rowId} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{row.displayName}</div>
                      <div className="flex flex-wrap gap-1.5 items-center mt-1">
                        <label className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 font-bold uppercase cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={row.isInvoice}
                            onChange={(e) => updateSchoolField(row.schoolId, 'isInvoice', e.target.checked)}
                            className="mr-1"
                          />
                          Lấy Hoá Đơn
                        </label>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        step="0.5"
                        value={row.classesCount}
                        onChange={(e) => updateSchoolField(row.schoolId, 'classesCount', parseFloat(e.target.value) || 0)}
                        className="w-16 border border-slate-200 rounded-xl text-center py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <input
                        type="text"
                        value={row.rawHourlyRate}
                        onChange={(e) => updateSchoolField(row.schoolId, 'tuitionRate', e.target.value)}
                        placeholder="Nhập đơn giá (Ví dụ: 700k/t)"
                        className="w-32 border border-slate-200 rounded-xl text-right px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-xs space-y-0.5 animate-fadeIn">
                        <div className="font-bold text-slate-700">
                          {row.actualPeriods} / {row.expectedPeriods} tiết
                        </div>
                        {row.missedPeriods > 0 && (
                          <div className="text-rose-500 text-[10px] font-bold font-sans">
                            (Nghỉ {row.missedPeriods} tiết)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right animate-fadeIn" title={row.formula}>
                      <div className="font-bold text-slate-900 font-mono cursor-help hover:text-blue-600 transition">
                        {formatVND(row.calculatedAmount)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleCopyMessage(row)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition mx-auto border cursor-pointer active:scale-95 ${
                          copiedSchoolId === row.rowId
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {copiedSchoolId === row.rowId ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Đã chép
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            Lấy mẫu tin
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {/* DÒNG TỔNG KẾT CUỐI BẢNG */}
              <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <td className="p-4">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="text-lg">📊</span>
                    <span>TỔNG CỘNG THÁNG {reportMonth}</span>
                    <span className="text-slate-400 text-xs font-normal ml-1">({sortedRows.length} trường)</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
                <td className="p-4 text-right">
                  <span className="text-slate-300 text-xs">—</span>
                </td>
                <td className="p-4 text-center">
                  <div className="text-base font-extrabold text-yellow-300 font-mono">
                    {totalActualPeriods.toLocaleString()} tiết
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">tổng số tiết đã dạy</div>
                </td>
                <td className="p-4 text-right">
                  <div className="text-base font-extrabold text-emerald-300 font-mono">
                    {formatVND(totalPayrollValue)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">tổng học phí phải thu</div>
                </td>
                <td className="p-4 text-center">
                  <span className="text-slate-400 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
