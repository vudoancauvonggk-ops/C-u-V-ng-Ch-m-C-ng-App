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

  // Array of payroll row items (managed reactively in state)
  const [customRows, setCustomRows] = useState<PayrollRowState[]>([]);
  const [csvUploaded, setCsvUploaded] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSchoolId, setCopiedSchoolId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  // Auto-save function to persist changes silently to DB
  const autoSaveToDb = async (rowsToSave: PayrollRowState[]) => {
    if (!currentUser?.username) return;
    const schoolRatesToSave: any[] = [];

    rowsToSave.forEach(r => {
      if (!r.schoolId) return;
      schoolRatesToSave.push({
        schoolId: r.schoolId,
        tuitionRate: r.rawHourlyRate,
        isInvoice: r.isInvoice,
        classesCount: r.classesCount
      });
    });

    if (schoolRatesToSave.length === 0) return;

    setSaveStatus('saving');
    try {
      const response = await fetch('/api/admin/save-school-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.username,
          password: adminPassword,
          schoolRates: schoolRatesToSave
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
      console.error('Auto-save error:', err);
      setSaveStatus('error');
    }
  };

  // Clean name for intelligent matching
  const cleanSchoolName = (name: string): string => {
    return name.toLowerCase()
      .replace(/trường/g, '')
      .replace(/mầm non/g, '')
      .replace(/mn/g, '')
      .replace(/tiểu học/g, '')
      .replace(/cs\d+/g, '')
      .replace(/cs \d+/g, '')
      .replace(/yoga/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Fuzzy match CSV name with DB school
  const getFuzzyMatchedSchoolId = (csvName: string): string => {
    const cleanCsv = cleanSchoolName(csvName);
    if (!cleanCsv) return '';
    
    let match = schools.find(s => !s.isDeleted && cleanSchoolName(s.name) === cleanCsv);
    if (match) return match.id;

    match = schools.find(s => {
      if (s.isDeleted) return false;
      const cleanDb = cleanSchoolName(s.name);
      return cleanDb.includes(cleanCsv) || cleanCsv.includes(cleanDb);
    });

    return match ? match.id : '';
  };

  // Initialize customRows on mount (from localStorage OR from DB schools)
  useEffect(() => {
    try {
      const savedRows = localStorage.getItem('etms_school_payroll_rows_v3');
      if (savedRows) {
        const parsed = JSON.parse(savedRows);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomRows(parsed);
          setCsvUploaded(true);
          return;
        }
      }
    } catch (e) {
      console.error('Error loading payroll rows from localStorage:', e);
    }

    // Fallback: populate from DB schools if customRows is empty
    if (schools && schools.length > 0 && customRows.length === 0) {
      const dbRows: PayrollRowState[] = schools
        .filter(s => !s.isDeleted && s.tuitionRate)
        .map(s => ({
          rowId: `db_${s.id}`,
          displayName: s.name,
          schoolId: s.id,
          classesCount: s.classesCount || 0,
          rawHourlyRate: s.tuitionRate || '',
          isInvoice: !!s.isInvoice,
          isCsvRow: false
        }));
      setCustomRows(dbRows);
    }
  }, [schools]);

  // Save customRows to localStorage & DB automatically whenever they change
  useEffect(() => {
    try {
      if (customRows.length > 0) {
        localStorage.setItem('etms_school_payroll_rows_v3', JSON.stringify(customRows));
      }
    } catch (e) {
      console.error('Error saving payroll rows to localStorage:', e);
    }

    if (customRows.length > 0 && isAdminVerified) {
      const timer = setTimeout(() => {
        autoSaveToDb(customRows);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [customRows, isAdminVerified]);

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
        
        if (result.localFileExists && result.data && result.data.length > 0 && customRows.length === 0) {
          applyCsvData(result.data);
        }
      } else {
        setVerificationError(result.error || 'Mật khẩu xác thực không đúng!');
      }
    } catch (err: any) {
      setVerificationError('Lỗi kết nối máy chủ.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper to apply CSV data
  const applyCsvData = (data: any[]) => {
    const newRows: PayrollRowState[] = data.map((row, index) => {
      const displayName = row.schoolName || 'Chưa đặt tên';
      const rowId = `csv_${index}_${displayName}`;
      const rawHourlyRate = row.rawHourlyRate || '';
      const classesCount = typeof row.classesCount === 'number' ? row.classesCount : (parseFloat(row.classesCount) || 0);
      
      const isInvoice = (row.notes || '').toLowerCase().includes('lấy hoá đơn') || 
                        (row.notes || '').toLowerCase().includes('lấy hóa đơn');

      const matchedId = getFuzzyMatchedSchoolId(displayName);

      return {
        rowId,
        displayName,
        schoolId: matchedId,
        classesCount,
        rawHourlyRate,
        isInvoice,
        isCsvRow: true
      };
    });

    setCustomRows(newRows);
    setCsvUploaded(true);
  };

  // Handle Manual File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        const parsed: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (cols.length < 3) continue;

          const schoolName = cols[0].replace(/^"|"$/g, '').trim();
          if (!schoolName) continue;

          const classesCountStr = cols[1].replace(/^"|"$/g, '').trim();
          const hourlyRateStr = cols[2].replace(/^"|"$/g, '').trim();
          const totalFeeStr = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : '';
          const notes = cols[4] ? cols[4].replace(/^"|"$/g, '').trim() : '';

          parsed.push({
            schoolName,
            classesCount: parseFloat(classesCountStr) || 0,
            rawHourlyRate: hourlyRateStr,
            totalFee: parseFloat(totalFeeStr) || 0,
            notes
          });
        }
        applyCsvData(parsed);
        onAddAuditLog('Tải thủ công file đối soát học phí', currentUser?.username || 'Admin', `File: ${file.name}`);
        alert(`Nạp dữ liệu file Excel/CSV thành công! Đã tải ${parsed.length} trường. Hãy nhấn nút "Lưu Cấu Hình vào DB" để lưu trữ lâu dài.`);
      } catch (err) {
        alert('Lỗi đọc file. Vui lòng kiểm tra định dạng.');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Save temp data to DB
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      const schoolRatesToSave: any[] = [];

      customRows.forEach(r => {
        if (!r.schoolId) return;
        schoolRatesToSave.push({
          schoolId: r.schoolId,
          tuitionRate: r.rawHourlyRate,
          isInvoice: r.isInvoice,
          classesCount: r.classesCount
        });
      });

      if (schoolRatesToSave.length === 0) {
        alert('Không có trường nào được liên kết DB để lưu!');
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/admin/save-school-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser?.username,
          password: adminPassword,
          schoolRates: schoolRatesToSave
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        onUpdateSchools(result.schools);
        onAddAuditLog('Lưu cấu hình đơn giá học phí các trường', currentUser?.username || 'Admin', `Cập nhật ${schoolRatesToSave.length} trường`);
        alert('Đã lưu cấu hình đơn giá các trường vào Cơ sở dữ liệu thành công! Từ giờ số liệu sẽ tự động lưu lại không bị mất khi thoát.');
      } else {
        alert(result.error || 'Có lỗi xảy ra khi lưu cấu hình.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ để lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
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

  // Helper: adjust period count according to business rule
  const adjustPeriod = (p: number) => {
    if (p === 1) return 2;
    if (p === 2) return 2.5;
    return p;
  };

  // Clear local storage draft data
  const handleClearLocalData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu nháp hiện tại trên trình duyệt không? Dữ liệu đã lưu trong DB sẽ không bị ảnh hưởng.')) {
      localStorage.removeItem('etms_school_payroll_rows_v3');
      setCustomRows([]);
      setCsvUploaded(false);
      window.location.reload();
    }
  };

  // Update specific row field reactively
  const updateRowField = (rowId: string, field: keyof PayrollRowState, value: any) => {
    setCustomRows(prev => prev.map(r => r.rowId === rowId ? { ...r, [field]: value } : r));
  };

  // Duplicate a row (allows splitting schools into multiple rows)
  const handleDuplicateRow = (rowToCopy: PayrollRowState) => {
    const newRowId = `copy_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: PayrollRowState = {
      ...rowToCopy,
      rowId: newRowId,
      classesCount: 1
    };
    setCustomRows(prev => [...prev, newRow]);
  };

  // Delete specific row from current list
  const handleDeleteRow = (rowId: string) => {
    setCustomRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  // Perform computations for each row
  const calculatedRows = customRows.map(row => {
    const { amount: unitPrice, isPerPeriod } = parseRate(row.rawHourlyRate);

    // Attendance stats from DB
    let actualPeriods = 0;
    let expectedPeriods = 0;

    // Ánh xạ classId → schoolId (dùng để vá các log bị mất liên kết schoolId)
    const getEffectiveSchoolId = (log: AttendanceLog): string => {
      if (log.schoolId) return log.schoolId;            // ưu tiên schoolId trực tiếp
      const cls = classes.find(c => c.id === log.classId && !c.isDeleted);
      return cls?.schoolId || '';
    };

    // Tập hợp tất cả classId thuộc trường này (để tra ngược orphaned logs)
    const schoolClassIds = new Set(
      classes.filter(c => c.schoolId === row.schoolId && !c.isDeleted).map(c => c.id)
    );

    if (row.schoolId) {
      // 1. Expected periods từ lịch phân công tuần chuẩn
      schoolClassIds.forEach(clsId => {
        const classSchedules = schedules.filter(s => s.classId === clsId && !s.isDeleted);
        const classExpected = classSchedules.reduce((sum, s) =>
          sum + (dayOfWeekOccurrences[s.dayOfWeek] || 0) * (s.periods || 1), 0
        );
        expectedPeriods += classExpected;
      });

      // 2. Tiết thực dạy: ưu tiên schoolId khớp trực tiếp, 
      //    thêm fallback qua classId để bắt các log bị mất liên kết schoolId
      const schoolLogs = attendance.filter(a => {
        if ((a as any).isDeleted) return false;
        if (!a.date.startsWith(reportMonth)) return false;
        // Chỉ đếm các tiết đã được duyệt hoặc xác thực để khớp với số tiết duyệt chấm công
        if (!(a.confirmedByAdmin || a.isVerified)) return false;
        // Khớp trực tiếp schoolId
        if (a.schoolId === row.schoolId) return true;
        // Fallback: classId thuộc trường này
        if (a.classId && schoolClassIds.has(a.classId)) return true;
        // Fallback sâu hơn: dùng getEffectiveSchoolId cho log không có schoolId
        if (!a.schoolId) return getEffectiveSchoolId(a) === row.schoolId;
        return false;
      });
      actualPeriods = schoolLogs.reduce((acc, curr) => acc + (curr.periods || 0), 0);
    }

    let calculatedAmount = 0;
    let formula = '';
    
    if (isPerPeriod) {
      calculatedAmount = actualPeriods * unitPrice;
      formula = `${actualPeriods} tiết thực tế × ${formatVND(unitPrice)}`;
    } else {
      const ratio = expectedPeriods > 0 ? (actualPeriods / expectedPeriods) : 0;
      calculatedAmount = Math.round(unitPrice * row.classesCount * ratio);
      
      if (expectedPeriods > 0) {
        formula = `${formatVND(unitPrice)} × ${row.classesCount} lớp × (${actualPeriods} tiết dạy thực tế / ${expectedPeriods} tiết phải dạy)`;
      } else {
        formula = `${formatVND(unitPrice)} × ${row.classesCount} lớp × (0/0 tiết)`;
      }
    }

    const missedPeriods = Math.max(0, expectedPeriods - actualPeriods);
    const dbSchool = schools.find(s => s.id === row.schoolId);

    return {
      ...row,
      unitPrice,
      isPerPeriod,
      actualPeriods,
      expectedPeriods,
      missedPeriods,
      calculatedAmount,
      formula,
      dbSchool
    };
  });

  // Filtered rows for UI search
  const filteredRows = calculatedRows.filter(row => 
    row.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.dbSchool?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorted alphabetically by displayName (A-Z)
  const sortedRows = [...filteredRows].sort((a, b) => 
    a.displayName.localeCompare(b.displayName, 'vi', { sensitivity: 'base' })
  );

  const totalPayrollValue = calculatedRows.reduce((acc, curr) => acc + curr.calculatedAmount, 0);
  const totalActualPeriods = calculatedRows.reduce((acc, curr) => acc + (curr.actualPeriods || 0), 0);

  // Calculate schools with approved attendance logs that are missing from customRows
  const getEffectiveSchoolId = (log: AttendanceLog): string => {
    if (log.schoolId) return log.schoolId;
    const cls = classes.find(c => c.id === log.classId && !c.isDeleted);
    return cls?.schoolId || '';
  };

  const approvedLogs = attendance.filter(a => 
    !(a as any).isDeleted && 
    a.date.startsWith(reportMonth) && 
    (a.confirmedByAdmin || a.isVerified)
  );

  const currentSchoolIds = customRows.map(r => r.schoolId).filter(Boolean);

  const missingSchoolsMap = new Map<string, number>();
  approvedLogs.forEach(log => {
    const effSchoolId = getEffectiveSchoolId(log);
    if (!effSchoolId) return;
    if (!currentSchoolIds.includes(effSchoolId)) {
      missingSchoolsMap.set(effSchoolId, (missingSchoolsMap.get(effSchoolId) || 0) + log.periods);
    }
  });

  const missingSchoolsList = Array.from(missingSchoolsMap.entries()).map(([schoolId, periods]) => {
    const sch = schools.find(s => s.id === schoolId);
    return {
      schoolId,
      name: sch ? sch.name : `ID: ${schoolId}`,
      periods,
      sch
    };
  }).filter(item => item.sch && !item.sch.isDeleted).sort((a, b) => b.periods - a.periods);

  const totalMissingPeriods = missingSchoolsList.reduce((sum, item) => sum + item.periods, 0);
  const unlinkedRowsCount = customRows.filter(r => !r.schoolId).length;

  const handleAddMissingSchool = (schoolId: string) => {
    const sch = schools.find(s => s.id === schoolId);
    if (!sch) return;
    const newRow: PayrollRowState = {
      rowId: `manual_${Date.now()}_${schoolId}`,
      displayName: sch.name,
      schoolId: sch.id,
      classesCount: sch.classesCount || 1,
      rawHourlyRate: sch.tuitionRate || '',
      isInvoice: !!sch.isInvoice,
      isCsvRow: false
    };
    setCustomRows(prev => [...prev, newRow]);
  };

  const handleAddAllMissingSchools = () => {
    const newRows: PayrollRowState[] = [];
    missingSchoolsList.forEach(item => {
      if (!item.sch) return;
      newRows.push({
        rowId: `manual_${Date.now()}_${item.schoolId}_${Math.random()}`,
        displayName: item.name,
        schoolId: item.schoolId,
        classesCount: item.sch.classesCount || 1,
        rawHourlyRate: item.sch.tuitionRate || '',
        isInvoice: !!item.sch.isInvoice,
        isCsvRow: false
      });
    });
    setCustomRows(prev => [...prev, ...newRows]);
  };

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

          {/* Import CSV */}
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer transition w-full sm:w-auto justify-center">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Nạp Excel/CSV mới</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Auto-save Status Indicator */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl text-xs font-bold animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>Đang tự động lưu...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Đã tự động lưu DB</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span>Lỗi lưu tự động</span>
            </span>
          )}

          {/* Save Configuration */}
          <button
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition w-full sm:w-auto justify-center"
          >
            <Save className="h-4 w-4" />
            <span>Lưu Cấu Hình vào DB</span>
          </button>

          {/* Reset Local Data */}
          {csvUploaded && (
            <button
              onClick={handleClearLocalData}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold cursor-pointer transition w-full sm:w-auto justify-center"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Xóa nháp</span>
            </button>
          )}
        </div>
      </div>

      {/* WARNING ALERTS */}
      {missingSchoolsList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-2xl shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 text-sm">Phát hiện lệch số tiết đã duyệt chấm công!</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                Hệ thống phát hiện có <strong>{totalMissingPeriods} tiết</strong> đã được duyệt chấm công trong <strong>Tháng {reportMonth.split('-')[1]}</strong> thuộc về <strong>{missingSchoolsList.length} trường</strong> nhưng các trường này chưa có trong bảng đối soát hiện tại. Điều này giải thích tại sao tổng số tiết đối soát bị lệch so với số tiết đã duyệt (ví dụ: hiển thị 618 thay vì 782).
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-2">
            {missingSchoolsList.map(item => (
              <div key={item.schoolId} className="flex items-center justify-between gap-3 bg-white border border-amber-100 px-3 py-1.5 rounded-2xl text-xs shadow-sm">
                <span className="font-medium text-slate-800">{item.name} (<span className="text-amber-600 font-bold">{item.periods} tiết</span>)</span>
                <button
                  onClick={() => handleAddMissingSchool(item.schoolId)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-2.5 py-1 rounded-xl text-[10px] transition cursor-pointer"
                >
                  + Thêm vào bảng
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleAddAllMissingSchools}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-2xl text-xs transition shadow-sm cursor-pointer"
            >
              Thêm tất cả {missingSchoolsList.length} trường thiếu vào đối soát (+{totalMissingPeriods} tiết)
            </button>
          </div>
        </div>
      )}
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
          {csvUploaded ? (
            <div className="text-xs text-blue-600 bg-blue-50 border border-blue-150 px-4 py-2 rounded-2xl font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Đang chỉnh sửa bản nháp Excel/CSV. Nhớ click "Lưu Cấu Hình vào DB" để lưu trữ lâu dài.</span>
            </div>
          ) : (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-150 px-4 py-2 rounded-2xl font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Đang hiển thị Cấu hình lưu trong DB. Bạn có thể nạp file Excel/CSV mới hoặc chỉnh sửa trực tiếp.</span>
            </div>
          )}
        </div>

        {/* PAYROLL DETAILS TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                <th className="p-4">Tên trường</th>
                <th className="p-4">Liên kết DB</th>
                <th className="p-4 text-center">Số Lớp</th>
                <th className="p-4 text-right">Đơn Giá</th>
                <th className="p-4 text-center">Tiết Dạy / Tiết Phải Dạy</th>
                <th className="p-4 text-right">Thành Tiền</th>
                <th className="p-4 text-center">Thông báo</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium font-sans">
                    Chưa có trường nào cấu hình đơn giá học phí trong DB. Hãy nạp file Excel/CSV mới để thiết lập.
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
                            onChange={(e) => updateRowField(row.rowId, 'isInvoice', e.target.checked)}
                            className="mr-1"
                          />
                          Lấy Hoá Đơn
                        </label>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={row.schoolId}
                        onChange={(e) => updateRowField(row.rowId, 'schoolId', e.target.value)}
                        className={`text-xs border rounded-xl px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px] ${
                          row.schoolId ? 'border-emerald-300 text-emerald-700 bg-emerald-50/20' : 'border-rose-300 text-rose-700 bg-rose-50/20'
                        }`}
                      >
                        <option value="">-- Chưa liên kết DB --</option>
                        {[...schools]
                          .filter(s => !s.isDeleted)
                          .sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="number"
                        step="0.5"
                        value={row.classesCount}
                        onChange={(e) => updateRowField(row.rowId, 'classesCount', parseFloat(e.target.value) || 0)}
                        className="w-16 border border-slate-200 rounded-xl text-center py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <input
                        type="text"
                        value={row.rawHourlyRate}
                        onChange={(e) => updateRowField(row.rowId, 'rawHourlyRate', e.target.value)}
                        className="w-24 border border-slate-200 rounded-xl text-right px-2 py-0.5 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 text-center">
                      {row.schoolId ? (
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
                      ) : (
                        <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-xl font-bold animate-pulse">
                          Chờ liên kết DB
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right animate-fadeIn" title={row.formula}>
                      <div className="font-bold text-slate-900 font-mono cursor-help hover:text-blue-600 transition">
                        {row.schoolId ? formatVND(row.calculatedAmount) : formatVND(0)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleCopyMessage(row)}
                        disabled={!row.schoolId}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition mx-auto border cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
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
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDuplicateRow(row)}
                          className="p-1.5 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          title="Tách / Nhân bản trường này thành 2 dòng"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa dòng "${row.displayName}" này khỏi danh sách đối soát tháng này?`)) {
                              handleDeleteRow(row.rowId);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {/* DÒNG TỔNG KẾT CUỐI BẢNG */}
              <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <td className="p-4" colSpan={2}>
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
                <td className="p-4 text-center" colSpan={2}>
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
