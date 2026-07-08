import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, FileSpreadsheet, RefreshCw, LogOut, Check, 
  AlertCircle, Loader2, ArrowRight, Table, User, HelpCircle, Eye, Info,
  Settings, Database, CheckCircle
} from 'lucide-react';
import { Teacher, School, ClassInfo, Schedule } from '../types';
import { 
  googleSignIn, 
  initAuth, 
  logout, 
  getAccessToken 
} from '../utils/googleAuth';
import { 
  listUserSpreadsheets, 
  getSpreadsheetSheets, 
  fetchSpreadsheetData, 
  parseSheetToTeachers,
  parseSpecialScheduleSheet,
  GoogleSpreadsheetFile
} from '../utils/googleSheets';
import { User as FirebaseUser } from 'firebase/auth';
import {
  getSheetsConfig,
  saveSheetsConfig,
  bulkSyncToSheets,
  bulkLoadFromSheets
} from '../services/GoogleSheetsService';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted: (
    teachers: Teacher[], 
    mode: 'overwrite' | 'update',
    schedules?: Schedule[],
    schools?: School[],
    classes?: ClassInfo[],
    attendance?: any[]
  ) => void;
  currentTeachersCount: number;
  existingTeachers?: Teacher[];
  existingSchools?: School[];
  onAddAuditLog?: (action: string, actor: string, details: string) => void;
  onAddNotification?: (title: string, message: string, type: 'info' | 'warning' | 'alert' | 'success') => void;
}

export default function SheetsSyncModal({ 
  isOpen, 
  onClose, 
  onSyncCompleted,
  currentTeachersCount,
  existingTeachers = [],
  existingSchools = [],
  onAddAuditLog,
  onAddNotification
}: SheetsSyncModalProps) {
  
  // Selection tab - Default to 'webapi' to encourage live sync connection first
  const [syncTab, setSyncTab] = useState<'webapi' | 'picker' | 'paste'>('webapi');
  const [pastedDataText, setPastedDataText] = useState<string>('');

  // Apps Script Web App configuration state
  const [webAppUrl, setWebAppUrl] = useState('');
  const [configSpreadsheetId, setConfigSpreadsheetId] = useState('');
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState<string | null>(null);

  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // File loading state
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // Selection state
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [manualInput, setManualInput] = useState<boolean>(true);
  const [manualUrlOrId, setManualUrlOrId] = useState<string>('https://docs.google.com/spreadsheets/d/1eLMRB8Lth6k6VqXgEyvExN3akFVqjuAi/edit?usp=sharing');
  
  // Tabs/Sheets inside the selected spreadsheet
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [syncAllTabs, setSyncAllTabs] = useState<boolean>(true);
  
  // Fetch & Parse State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [parsedTeachers, setParsedTeachers] = useState<Teacher[]>([]);
  const [parsedSchedules, setParsedSchedules] = useState<Schedule[]>([]);
  const [parsedSchools, setParsedSchools] = useState<School[]>([]);
  const [parsedClasses, setParsedClasses] = useState<ClassInfo[]>([]);
  const [isWeeklyScheduleType, setIsWeeklyScheduleType] = useState<boolean>(false);
  const [parsedWarnings, setParsedWarnings] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][] | null>(null);
  
  // Action/Confirm state
  const [syncMode, setSyncMode] = useState<'overwrite' | 'update'>('update');
  const [isCommiting, setIsCommiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Check auth state on mount/open
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = initAuth(
        (loggedInUser, token) => {
          setUser(loggedInUser);
          setAccessToken(token);
          setNeedsAuth(false);
          loadSpreadsheets(token);
        },
        () => {
          setUser(null);
          setAccessToken(null);
          setNeedsAuth(true);
        }
      );
      return unsubscribe;
    }
  }, [isOpen]);

  // Load configuration settings upon opening
  useEffect(() => {
    if (isOpen) {
      const config = getSheetsConfig();
      setWebAppUrl(config.webAppUrl || '');
      setConfigSpreadsheetId(config.spreadsheetId || '');
    }
  }, [isOpen]);

  // Handle saving API specs
  const handleSaveApiSpecs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configSpreadsheetId.trim()) {
      setErrorMessage('Vui lòng cung cấp Google Sheets Spreadsheet ID.');
      return;
    }
    saveSheetsConfig({
      webAppUrl: webAppUrl.trim(),
      spreadsheetId: configSpreadsheetId.trim()
    });
    setApiSuccessMsg('Lưu cấu hình API Google Sheets thành công! ✅');
    setTimeout(() => setApiSuccessMsg(null), 3000);
  };

  // Live pull whole schema from Google Apps Script Web App
  const handleReloadLiveAll = async () => {
    setIsApiLoading(true);
    setErrorMessage(null);
    setApiSuccessMsg(null);
    try {
      if (!webAppUrl.trim() || !configSpreadsheetId.trim()) {
        throw new Error('Bạn cần nhập đầy đủ Apps Script Web App URL và Spreadsheet ID trước khi đồng bộ.');
      }
      
      // Save just in case they didn't click save
      saveSheetsConfig({
        webAppUrl: webAppUrl.trim(),
        spreadsheetId: configSpreadsheetId.trim()
      });

      const data = await bulkLoadFromSheets();
      if (data && data.status === 'success') {
        const teachersList = data.teachers || [];
        const schedulesList = data.schedules || [];
        const schoolsList = data.schools || [];
        const classesList = data.classes || [];
        const attendanceList = data.attendance || [];

        onSyncCompleted(teachersList, 'overwrite', schedulesList, schoolsList, classesList, attendanceList);
        
        if (onAddAuditLog) {
          onAddAuditLog(
            'Đồng bộ từ Google Sheets API',
            'Admin',
            `Tải thành công ${teachersList.length} GV, ${schoolsList.length} trường, ${classesList.length} lớp học trực tuyến qua Web App`
          );
        }
        if (onAddNotification) {
          onAddNotification(
            'Đồng bộ thành công 📊',
            `Dữ liệu real-time từ Google Sheets đã cập nhật hoàn toàn các dashboard.`,
            'success'
          );
        }

        setApiSuccessMsg('SYNC_SUCCESS: Hoàn tất đồng bộ đa lớp dữ liệu từ Google Sheets!');
        console.log('SYNC_SUCCESS', data);
      } else {
        throw new Error(data.message || 'Phản hồi thất bại từ Apps Script Web App.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi bất ngờ xảy ra khi kết nối tới Apps Script API.');
    } finally {
      setIsApiLoading(false);
    }
  };

  // Force bulk upload state to Google Sheets live
  const handlePushLiveAll = async () => {
    setIsApiLoading(true);
    setErrorMessage(null);
    setApiSuccessMsg(null);
    try {
      if (!webAppUrl.trim() || !configSpreadsheetId.trim()) {
        throw new Error('Bạn cần nhập đầy đủ Apps Script Web App URL và Spreadsheet ID trước khi đồng bộ.');
      }

      saveSheetsConfig({
        webAppUrl: webAppUrl.trim(),
        spreadsheetId: configSpreadsheetId.trim()
      });

      // Fetch current state from PostgreSQL
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch data from API');
      const data = await response.json();

      const success = await bulkSyncToSheets({
        teachers: data.teachers || [],
        schools: data.schools || [],
        classes: data.classes || [],
        schedules: data.schedules || [],
        attendance: data.attendance || []
      });

      if (success) {
        setApiSuccessMsg('Đồng bộ đẩy lên (Bulk Export/Push) thành công rực rỡ! 🚀 Dữ liệu đã lưu trữ an toàn.');
        if (onAddAuditLog) {
          onAddAuditLog('Đẩy dữ liệu lên Sheets', 'Admin', 'Xuất toàn bộ cơ sở dữ liệu hiện hành lên Google Spreadsheet thông qua Apps Script.');
        }
      } else {
        throw new Error('Gặp vấn đề khi đẩy ghi đè dữ liệu lên Apps Script.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi đẩy đồng bộ.');
    } finally {
      setIsApiLoading(false);
    }
  };

  // Load list of spreadsheets from Google Drive
  const loadSpreadsheets = async (token: string) => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const files = await listUserSpreadsheets(token);
      setSpreadsheets(files);
      if (files.length > 0) {
        setSelectedSpreadsheetId(files[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Không thể tải danh sách bảng tính từ Google Drive. Vui lòng thử lại.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Sign in via popup
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        loadSpreadsheets(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Đăng nhập Google thất bại. Vui lòng bấm dồng ý cấp quyền.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout / clear credentials
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setSpreadsheets([]);
    setSelectedSpreadsheetId('');
    setSheetTabs([]);
    setSelectedTab('');
    setPreviewRows(null);
    setParsedTeachers([]);
  };

  // Resolve spreadsheet ID from pasted URL or selection
  const getActiveSpreadsheetId = (): string => {
    if (manualInput) {
      const match = manualUrlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
      return manualUrlOrId.trim();
    }
    return selectedSpreadsheetId;
  };

  // Trigger loading sheet tabs when a spreadsheet is chosen
  useEffect(() => {
    const spreadsheetId = getActiveSpreadsheetId();
    if (spreadsheetId && accessToken) {
      loadSheetTabs(accessToken, spreadsheetId);
    } else {
      setSheetTabs([]);
      setSelectedTab('');
    }
  }, [selectedSpreadsheetId, manualInput, manualUrlOrId]);

  const loadSheetTabs = async (token: string, spreadsheetId: string) => {
    if (!spreadsheetId) return;
    setIsLoadingTabs(true);
    setErrorMessage(null);
    try {
      const tabs = await getSpreadsheetSheets(token, spreadsheetId);
      setSheetTabs(tabs);
      if (tabs.length > 0) {
        setSelectedTab(tabs[0]);
      }
    } catch (err: any) {
      console.error(err);
      // Suppress hard crash so they can type custom sheet names if needed
      setSheetTabs(['Trang_tinh_1', 'Sheet1']);
      setSelectedTab('Sheet1');
    } finally {
      setIsLoadingTabs(false);
    }
  };

  // Load and parse spreadsheet data
  const handlePreviewData = async () => {
    const spreadsheetId = getActiveSpreadsheetId();
    if (!spreadsheetId) {
      setErrorMessage('Vui lòng chọn hoặc điền Google Spreadsheet ID/URL.');
      return;
    }

    setIsLoadingData(true);
    setErrorMessage(null);
    setPreviewRows(null);
    setParsedTeachers([]);
    setParsedSchedules([]);
    setParsedSchools([]);
    setParsedClasses([]);
    setIsWeeklyScheduleType(false);
    setParsedWarnings([]);

    // If we have no accessToken, attempt to parse it as a public sheet from the backend
    if (!accessToken) {
      try {
        const response = await fetch('/api/parse-public-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId,
            existingTeachers,
            existingSchools
          })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Không thể đồng bộ từ backend');
        }
        const data = await response.json();
        
        if (data.status === 'success') {
          // Deduplicate and merge teachers by ID
          const uniqueTeachersMap = new Map<string, Teacher>();
          const allTeachers = data.teachers || [];
          allTeachers.forEach((t: any) => {
            const existing = uniqueTeachersMap.get(t.id);
            if (existing) {
              uniqueTeachersMap.set(t.id, {
                ...existing,
                dob: t.dob || existing.dob,
                phone: t.phone || existing.phone,
                email: t.email || existing.email,
                address: t.address || existing.address,
                notes: t.notes || existing.notes,
                hourlyRate: t.hourlyRate || existing.hourlyRate,
                monthlyAllowance: t.monthlyAllowance || existing.monthlyAllowance,
                bonus: t.bonus || existing.bonus,
                deduction: t.deduction || existing.deduction,
                status: t.status === 'inactive' || existing.status === 'inactive' ? 'inactive' : 'active'
              });
            } else {
              uniqueTeachersMap.set(t.id, t);
            }
          });

          const deduplicatedTeachers = Array.from(uniqueTeachersMap.values());
          setParsedTeachers(deduplicatedTeachers);
          setParsedSchedules(data.schedules || []);
          setParsedSchools(data.schools || []);
          setParsedClasses(data.classes || []);
          setPreviewRows(data.previewRows || []);
          setIsWeeklyScheduleType((data.schedules || []).length > 0);
          
          setParsedWarnings([
            `Đồng bộ trực tiếp qua Backend thành công! Đã quét ${data.sheetTabs?.length || 0} tab trang tính.`,
            `Tìm thấy ${deduplicatedTeachers.length} Giáo viên độc lập và ${(data.schedules || []).length} Tiết giảng dạy xếp lịch.`,
            ...(data.warnings || [])
          ]);
          setSheetTabs(data.sheetTabs || []);
        } else {
          throw new Error(data.message || 'Lỗi bất ngờ từ backend');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Lỗi khi tải hoặc phân tích Google Sheet công khai qua server. Hãy chắc chắn trang tính đã được chia sẻ ở chế độ công khai "Bất kỳ ai có đường liên kết đều có thể xem".');
      } finally {
        setIsLoadingData(false);
      }
      return;
    }
    setErrorMessage(null);
    setPreviewRows(null);
    setParsedTeachers([]);
    setParsedSchedules([]);
    setParsedSchools([]);
    setParsedClasses([]);
    setIsWeeklyScheduleType(false);
    setParsedWarnings([]);

    try {
      if (syncAllTabs) {
        if (sheetTabs.length === 0) {
          setErrorMessage('Không có tab trang tính nào được tìm thấy hoặc danh sách trang tính đang trống.');
          setIsLoadingData(false);
          return;
        }

        const allTeachers: Teacher[] = [];
        const allSchedules: Schedule[] = [];
        const allSchoolsSet = new Map<string, School>();
        const allClassesSet = new Map<string, ClassInfo>();
        const allWarnings: string[] = [];
        let previewRowsSet: any[][] | null = null;

        // Load all tab data in parallel
        await Promise.all(
          sheetTabs.map(async (tabName) => {
            const escapeTab = tabName.replace(/'/g, "''");
            const range = `'${escapeTab}'!A1:Z500`;
            try {
              const rows = await fetchSpreadsheetData(accessToken, spreadsheetId, range);
              if (rows && rows.length > 0) {
                if (!previewRowsSet) {
                  previewRowsSet = rows.slice(0, 10); // Keep first tab's preview rows as demo
                }
                const { teachers: docTeachers, warnings: tabWarn } = parseSheetToTeachers(rows, existingTeachers);
                const specialResult = parseSpecialScheduleSheet(rows, existingSchools, tabName);
                const shouldTreatAsSchedule = specialResult.isScheduleSheet;

                if (shouldTreatAsSchedule) {
                  allTeachers.push(...specialResult.teachers);
                  allSchedules.push(...specialResult.schedules);
                  specialResult.schools.forEach(sch => allSchoolsSet.set(sch.id, sch));
                  specialResult.classes.forEach(cls => allClassesSet.set(cls.id, cls));
                } else {
                  allTeachers.push(...docTeachers);
                  tabWarn.forEach(w => allWarnings.push(`[${tabName}]: ${w}`));
                }
              }
            } catch (err) {
              console.warn(`Lỗi đọc tab: ${tabName}`, err);
              allWarnings.push(`Lỗi đọc tab "${tabName}": Có thể tab không đúng định dạng.`);
            }
          })
        );

        if (allTeachers.length === 0) {
          setErrorMessage('Không thể phân tích bất kỳ Giáo viên hay Lịch dạy nào từ toàn bộ các sheet tab.');
          return;
        }

        // Deduplicate and merge teachers by ID (preserving metadata like phone/address when some tabs omit them)
        const uniqueTeachersMap = new Map<string, Teacher>();
        allTeachers.forEach(t => {
          const existing = uniqueTeachersMap.get(t.id);
          if (existing) {
            uniqueTeachersMap.set(t.id, {
              ...existing,
              dob: t.dob || existing.dob,
              phone: t.phone || existing.phone,
              email: t.email || existing.email,
              address: t.address || existing.address,
              notes: t.notes || existing.notes,
              hourlyRate: t.hourlyRate || existing.hourlyRate,
              monthlyAllowance: t.monthlyAllowance || existing.monthlyAllowance,
              bonus: t.bonus || existing.bonus,
              deduction: t.deduction || existing.deduction,
              status: t.status === 'inactive' || existing.status === 'inactive' ? 'inactive' : 'active'
            });
          } else {
            uniqueTeachersMap.set(t.id, t);
          }
        });

        const deduplicatedTeachers = Array.from(uniqueTeachersMap.values());
        setParsedTeachers(deduplicatedTeachers);
        setParsedSchedules(allSchedules);
        setParsedSchools(Array.from(allSchoolsSet.values()));
        setParsedClasses(Array.from(allClassesSet.values()));
        setPreviewRows(previewRowsSet || []);
        setIsWeeklyScheduleType(allSchedules.length > 0);
        
        setParsedWarnings([
          `Đồng bộ hàng loạt hoàn tất! Đã quét và đọc thành công ${sheetTabs.length} tab trang tính song song.`,
          `Tìm thấy ${deduplicatedTeachers.length} Giáo viên độc lập và ${allSchedules.length} Tiết giảng dạy xếp lịch.`,
          ...allWarnings
        ]);

      } else {
        // Individual single tab sync
        const escapeTab = (selectedTab || 'Sheet1').replace(/'/g, "''");
        const range = `'${escapeTab}'!A1:Z500`;
        const rows = await fetchSpreadsheetData(accessToken, spreadsheetId, range);
        
        if (!rows || rows.length === 0) {
          setErrorMessage('Không nhận được dữ liệu nào từ phạm vi này. Hãy đảm bảo Tab có dữ liệu.');
          return;
        }

        setPreviewRows(rows.slice(0, 15)); // Top 15 for preview table
        
        // Prioritise tabular teacher parsing unless it is identified as a schedule sheet
        const { teachers: docTeachers, warnings: docWarnings } = parseSheetToTeachers(rows, existingTeachers);
        const specialResult = parseSpecialScheduleSheet(rows, existingSchools, selectedTab);
        const shouldTreatAsSchedule = specialResult.isScheduleSheet;

        if (shouldTreatAsSchedule) {
          setParsedTeachers(specialResult.teachers);
          setParsedSchedules(specialResult.schedules);
          setParsedSchools(specialResult.schools);
          setParsedClasses(specialResult.classes);
          setIsWeeklyScheduleType(true);
          setParsedWarnings([
            'Phát hiện Bảng Phân Lịch biểu giảng dạy cá nhân (Weekly Grid Calendar)!',
            `Hệ thống sẽ đồng bộ lịch dạy của giáo viên "${specialResult.teachers[0].name}" với ${specialResult.schedules.length} tiết học tại các trường mầm non.`
          ]);
        } else {
          // Tabular teacher database list
          setParsedTeachers(docTeachers);
          setParsedWarnings(docWarnings);
          setIsWeeklyScheduleType(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi tải hoặc phân tích Google Sheet. Vui lòng kiểm tra quyền truy cập file.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Commit sync data
  const handleSaveSync = () => {
    if (parsedTeachers.length === 0) return;

    setIsCommiting(true);
    try {
      if (isWeeklyScheduleType) {
        onSyncCompleted(parsedTeachers, syncMode, parsedSchedules, parsedSchools, parsedClasses);
      } else {
        onSyncCompleted(parsedTeachers, syncMode);
      }
      setSuccessCount(parsedTeachers.length);
      setTimeout(() => {
        setSuccessCount(null);
        setPreviewRows(null);
        setParsedTeachers([]);
        setParsedSchedules([]);
        setParsedSchools([]);
        setParsedClasses([]);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage('Lỗi lưu trữ cục bộ: ' + err.message);
    } finally {
      setIsCommiting(false);
    }
  };

  const handleParsePastedData = () => {
    setErrorMessage(null);
    setApiSuccessMsg(null);
    setPreviewRows(null);
    setParsedTeachers([]);
    setParsedSchedules([]);
    setParsedSchools([]);
    setParsedClasses([]);

    const text = pastedDataText.trim();
    if (!text) {
      setErrorMessage('Vui lòng nhập hoặc dán dữ liệu Excel/JSON vào ô dưới đây.');
      return;
    }

    if (text.startsWith('[') || text.startsWith('{')) {
      // Try JSON parsing
      try {
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const mapped: Teacher[] = items.map((item, idx) => ({
          id: String(item.id || item.teacherId || item.GVID || `GV${String(existingTeachers.length + idx + 1).padStart(3, '0')}`),
          name: String(item.name || item.fullName || 'Giáo viên mới'),
          dob: String(item.dob || item.birthday || ''),
          phone: String(item.phone || item.mobile || ''),
          email: String(item.email || ''),
          address: String(item.address || ''),
          status: item.status || 'active',
          hourlyRate: Number(item.hourlyRate || item.rate || 0),
          monthlyAllowance: Number(item.monthlyAllowance || item.allowance || 0),
          bonus: Number(item.bonus || 0),
          deduction: Number(item.deduction || 0),
          notes: String(item.notes || '')
        }));
        setParsedTeachers(mapped);
        setPreviewRows(mapped.map(t => [t.id, t.name, t.hourlyRate, t.phone, t.email]));
        setApiSuccessMsg(`Phân tích thành công ${mapped.length} giáo viên từ JSON! Hãy xem bảng xem trước bên dưới và bấm Xác nhận để ghi.`);
      } catch (err: any) {
        setErrorMessage('Không phân tích được JSON: ' + err.message);
      }
    } else {
      // Parse TSV (tab separated values) from Excel/Sheets copy-paste
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 1) {
        setErrorMessage('Dữ liệu copy-paste rỗng hoặc không đúng định dạng.');
        return;
      }

      // Convert lines to a rows grid for checking if it's a schedule sheet
      const rows = lines.map(line => line.split('\t'));
      
      // Let's call the updated parseSpecialScheduleSheet on these rows!
      const specialResult = parseSpecialScheduleSheet(rows, existingSchools, 'Bảng dán từ Excel');
      if (specialResult.isScheduleSheet && specialResult.schedules.length > 0) {
        setParsedTeachers(specialResult.teachers);
        setParsedSchedules(specialResult.schedules);
        setParsedSchools(specialResult.schools);
        setParsedClasses(specialResult.classes);
        setPreviewRows(rows.slice(0, 15));
        setIsWeeklyScheduleType(true);
        setApiSuccessMsg(`Phân tích thành công Lịch giảng dạy tuần học từ Excel copy-paste! Tìm thấy ${specialResult.teachers.length} Giáo viên và ${specialResult.schedules.length} Tiết dạy.`);
        return;
      }
      
      const firstLineParts = lines[0].split('\t').map(h => h.trim().toLowerCase());
      const hasHeader = firstLineParts.some(h => 
        h.includes('tên') || h.includes('name') || h.includes('mã') || h.includes('id') || 
        h.includes('phone') || h.includes('sđt') || h.includes('liên hệ') || h.includes('đơn giá') ||
        h.includes('lương') || h.includes('email')
      );

      let headers = firstLineParts;
      let startIdx = 1;
      
      if (!hasHeader) {
        headers = Array.from({ length: firstLineParts.length }, (_, k) => `column_${k}`);
        startIdx = 0;
      }

      const idxId = headers.findIndex(h => h.includes('mã') || h.includes('id') || h.includes('identity'));
      const idxName = headers.findIndex(h => h.includes('tên') || h.includes('name') || h.includes('họ'));
      const idxPhone = headers.findIndex(h => h.includes('thoại') || h.includes('sđt') || h.includes('phone') || h.includes('đt'));
      const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('thư'));
      const idxRate = headers.findIndex(h => h.includes('lương') || h.includes('rate') || h.includes('tiết') || h.includes('đơn giá') || h.includes('giá'));
      const idxDob = headers.findIndex(h => h.includes('sinh') || h.includes('dob'));
      const idxAddress = headers.findIndex(h => h.includes('địa chỉ') || h.includes('address'));
      const idxAllowance = headers.findIndex(h => h.includes('phụ cấp') || h.includes('allowance'));
      const idxNotes = headers.findIndex(h => h.includes('ghi chú') || h.includes('note') || h.includes('tài khoản'));

      const list: Teacher[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length === 0 || !parts[0]) continue;

        const idVal = idxId !== -1 && parts[idxId] ? parts[idxId].trim() : `GV${String(existingTeachers.length + list.length + 1).padStart(3, '0')}`;
        const nameVal = idxName !== -1 && parts[idxName] ? parts[idxName].trim() : (parts[1] || parts[0] || 'Giáo viên mới').trim();
        const phoneVal = idxPhone !== -1 && parts[idxPhone] ? parts[idxPhone].trim() : (parts[2] || '');
        const emailVal = idxEmail !== -1 && parts[idxEmail] ? parts[idxEmail].trim() : (parts[3] || '');
        
        let rateVal = 0;
        if (idxRate !== -1 && parts[idxRate]) {
          const cleaned = parts[idxRate].replace(/[^0-9]/g, '');
          rateVal = cleaned ? Number(cleaned) : 0;
        } else if (parts[4]) {
          const cleaned = parts[4].replace(/[^0-9]/g, '');
          if (cleaned) rateVal = Number(cleaned);
        }

        const dobVal = idxDob !== -1 && parts[idxDob] ? parts[idxDob].trim() : '';
        const addrVal = idxAddress !== -1 && parts[idxAddress] ? parts[idxAddress].trim() : '';
        
        let allowVal = 0;
        if (idxAllowance !== -1 && parts[idxAllowance]) {
          const cleaned = parts[idxAllowance].replace(/[^0-9]/g, '');
          allowVal = cleaned ? Number(cleaned) : 0;
        }
        const noteVal = idxNotes !== -1 && parts[idxNotes] ? parts[idxNotes].trim() : '';

        list.push({
          id: idVal,
          name: nameVal,
          dob: dobVal,
          phone: phoneVal,
          email: emailVal,
          address: addrVal,
          status: 'active',
          hourlyRate: rateVal,
          monthlyAllowance: allowVal,
          bonus: 0,
          deduction: 0,
          notes: noteVal
        });
      }

      if (list.length === 0) {
        setErrorMessage('Không nhận dạng được dòng dữ liệu Excel nào. Hãy đảm bảo bạn bôi đen và copy bảng từ Excel rồi dán vào.');
        return;
      }

      setParsedTeachers(list);
      setPreviewRows(list.map(t => [t.id, t.name, t.hourlyRate, t.phone, t.email]));
      setApiSuccessMsg(`Phân tích thành công ${list.length} giáo viên từ Excel dán trực tiếp! Hãy xem bảng xem trước bên dưới và bấm Xác nhận để ghi.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" id="sheets_sync_modal">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-50/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-2xl text-white">
              <FileSpreadsheet className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Đồng Bộ Hồ Sơ Giáo Viên từ Google Sheets</h3>
              <p className="text-xs text-slate-500">Kết nối trực tiếp Google Drive, tự động phân tích và import danh bạ</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-3 py-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 font-semibold transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toggle between Sync Modes */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 shrink-0">
          <button 
            type="button"
            onClick={() => {
              setSyncTab('webapi');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition rounded-xl uppercase tracking-wider cursor-pointer ${
              syncTab === 'webapi' 
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-150' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Đồng bộ Live (Apps Script Web API)</span>
          </button>
          <button 
            type="button"
            onClick={() => {
              setSyncTab('picker');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition rounded-xl uppercase tracking-wider cursor-pointer ${
              syncTab === 'picker' 
                ? 'bg-white text-blue-700 shadow-xs border border-slate-150' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="h-4 w-4" />
            <span>Nạp Excel Picker (Đọc trực tiếp)</span>
          </button>
          <button 
            type="button"
            onClick={() => {
              setSyncTab('paste');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition rounded-xl uppercase tracking-wider cursor-pointer ${
              syncTab === 'paste' 
                ? 'bg-white text-amber-700 shadow-xs border border-slate-150' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Dán Bảng Excel / JSON (Trực tiếp)</span>
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-3 text-rose-700 text-xs text-left animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <span className="font-bold">Lập tức phát hiện lỗi:</span> {errorMessage}
                </div>
              </div>
              <div className="pl-8 flex flex-col gap-1.5 border-t border-rose-100 pt-2 bg-rose-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl">
                <p className="font-medium text-[11px] text-slate-505 leading-relaxed">
                  💡 <strong>Luồng Dán Dự Phòng:</strong> Nếu cổng kết nối API trực tuyến bị chặn, chưa cấu hình, hoặc file Google Sheets bị hạn chế quyền truy cập, bạn có thể dán trực tiếp dữ liệu copy/excel để nạp tức thì:
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSyncTab('paste');
                      setErrorMessage(null);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition shadow-xs select-none active:scale-95 cursor-pointer"
                  >
                    Sử dụng Chế độ Dán Excel dự phòng (Ctrl+V) &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {apiSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs text-left animate-fadeIn font-bold">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="font-semibold">{apiSuccessMsg}</div>
            </div>
          )}

          {/* RENDER BY TAB */}
          {syncTab === 'webapi' && (
            <div className="space-y-6 text-left animate-fadeIn">
              
              {/* API Configuration Form */}
              <form onSubmit={handleSaveApiSpecs} className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Settings className="h-4.5 w-4.5 text-slate-500" />
                  <h4 className="font-bold text-slate-700 text-xs uppercase font-mono">CẤU HÌNH LIÊN KẾT GOOGLE APPS SCRIPT WEB APP</h4>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <span>1. Google Spreadsheet ID:</span>
                      <span className="text-[9px] bg-blue-150 text-blue-700 px-1 py-0.2 rounded uppercase">Yêu cầu</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Nhập ID (VD: 1eLMRB8Lth6k6VqXgEyvExN3akFVqjuAi...) hoặc URL đầy đủ"
                      value={configSpreadsheetId}
                      onChange={(e) => {
                        const url = e.target.value;
                        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                        setConfigSpreadsheetId(match && match[1] ? match[1] : url);
                      }}
                      required
                    />
                    <p className="text-[10px] text-slate-400">Dùng chung một file Google Sheet để đồng bộ tất cả cơ sở dữ liệu: Giáo viên, Lớp, Trường, Chấm công.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <span>2. Google Apps Script Web App URL:</span>
                      <span className="text-[9px] bg-slate-200 text-slate-500 px-1 py-0.2 rounded uppercase">Khi cần đồng bộ Live</span>
                    </label>
                    <input 
                      type="url"
                      className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Dán URL Web App triển khai từ Google Apps Script (VD: https://script.google.com/macros/s/.../exec)"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400">Nếu để trống, ứng dụng sẽ lưu trữ offline an toàn trong LocalStorage. Dán URL vào để kích hoạt truy vấn mạng thực tế sang Google Sheets.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Lưu cấu hình cục bộ
                  </button>
                </div>
              </form>

              {/* ACTION PANELS */}
              <div className="bg-white border border-slate-250/60 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-700 text-xs uppercase font-mono border-b border-slate-100 pb-3">HÀNH ĐỘNG ĐỒNG BỘ DỮ LIỆU</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PULL CORES */}
                  <div className="border border-slate-150 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-gradient-to-br from-white to-slate-50/50">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-1.5 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[10px] font-bold">PULL DB</span>
                        <h5 className="font-bold text-slate-800 text-xs">Đồng bộ & Tải lại từ Google Sheets</h5>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Truy vấn REST API tới Apps Script Web App để tải về toàn bộ danh bạ Giáo viên mới nhất, danh sách trường học và phân công lịch dạy trực tuyến. Dashboard sẽ cập nhật ngay.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isApiLoading}
                      onClick={handleReloadLiveAll}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs p-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isApiLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Đang đồng bộ mạng...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" /> Đồng bộ & Tải lại ngay
                        </>
                      )}
                    </button>
                  </div>

                  {/* PUSH CORES */}
                  <div className="border border-slate-150 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-gradient-to-br from-white to-slate-50/50">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-1.5 bg-blue-100 text-blue-800 rounded-md font-mono text-[10px] font-bold">PUSH BACK</span>
                        <h5 className="font-bold text-slate-800 text-xs">Đẩy dữ liệu hiện tại lên Google Sheets</h5>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Ghi đè tất cả trạng thái hiện thời của ứng dụng lên các tab tương ứng của Google Sheets. Hành động này thích hợp khi bạn muốn sao lưu offline lên đám mây.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isApiLoading}
                      onClick={handlePushLiveAll}
                      className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs p-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isApiLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Đang đẩy dữ liệu...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-4 w-4" /> Backup dồn dữ liệu lên Sheets
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>



            </div>
          )}

          {syncTab === 'picker' && (
            <div className="space-y-6 text-left animate-fadeIn">
              
              {/* Linked Google Account Info / Sign-In Button */}
              {needsAuth ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">Đăng nhập Google (Tùy chọn)</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Chỉ cần thiết nếu bảng tính của bạn đang để ở chế độ Riêng tư.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 shadow-xs rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition shrink-0 cursor-pointer"
                  >
                    {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : 'Đăng nhập Google'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="h-10 w-10 rounded-full border border-slate-200" />
                    ) : (
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800">{user?.displayName || 'Tài khoản Google'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </button>
                </div>
              )}

              {/* FILE SELECTION CONTROLS */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs uppercase font-mono">1. Chọn tập tin bảng tính quản trị</h4>
                  {!needsAuth && (
                    <button 
                      type="button"
                      onClick={() => setManualInput(!manualInput)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      {manualInput ? 'Chọn từ danh sách Drive' : 'Nhập URL bảng tính thủ công'}
                    </button>
                  )}
                </div>

                {(needsAuth || manualInput) ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 block">Dán URL tài liệu Google Sheet hoặc Spreadsheet ID:</label>
                    <input 
                      type="text" 
                      placeholder="VD: https://docs.google.com/spreadsheets/d/1BxiM3v0DMvOzsWd5tLu..."
                      value={manualUrlOrId}
                      onChange={(e) => setManualUrlOrId(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 block">Danh sách Bảng tính gần nhất trên Google Drive của bạn:</label>
                    {isLoadingFiles ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Đang quét tìm các Sheets (.xlsx, .gsh)...
                      </div>
                    ) : spreadsheets.length === 0 ? (
                      <div className="p-4 text-center border border-slate-100 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                        Không tìm thấy file Google Sheets nào trên tài khoản của bạn.
                      </div>
                    ) : (
                      <select 
                        value={selectedSpreadsheetId}
                        onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {spreadsheets.map(file => (
                          <option key={file.id} value={file.id}>
                            📊 {file.name} (Sửa cuối: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('vi-VN') : 'chưa rõ'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">2. Phạm vi Đồng bộ (Sheet Tabs):</label>
                    <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input 
                          type="checkbox" 
                          checked={syncAllTabs} 
                          onChange={(e) => setSyncAllTabs(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        Đồng bộ tất cả các Tabs / Trang tính
                      </label>
                      
                      {!syncAllTabs && (
                        <div className="mt-2 space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 block">Chọn tên Trang tính (Tab):</label>
                          {needsAuth ? (
                            <input 
                              type="text" 
                              placeholder="Nhập tên Tab (VD: Sheet1, Lịch Dạy...)"
                              value={selectedTab}
                              onChange={(e) => setSelectedTab(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          ) : isLoadingTabs ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-450 italic">
                              <Loader2 className="h-3 w-3 animate-spin text-blue-500" /> Đang tải các Tabs...
                            </div>
                          ) : (
                            <select
                              value={selectedTab}
                              onChange={(e) => setSelectedTab(e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-650"
                            >
                              {sheetTabs.map(tab => (
                                <option key={tab} value={tab}>{tab}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">3. Chế độ đồng bộ dữ liệu:</label>
                    <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input 
                          type="radio" 
                          name="pickerSyncMode"
                          checked={syncMode === 'update'} 
                          onChange={() => setSyncMode('update')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Cập nhật & Ghép (Khuyên dùng)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input 
                          type="radio" 
                          name="pickerSyncMode"
                          checked={syncMode === 'overwrite'} 
                          onChange={() => setSyncMode('overwrite')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        Ghi đè & Thay thế toàn bộ
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={handlePreviewData}
                    disabled={isLoadingData || (!selectedSpreadsheetId && !manualUrlOrId)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingData ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" /> Xem trước dữ liệu (Preview)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SHEET PARSING STRUCTURAL GUIDELINE PANEL */}
              {!previewRows && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-left">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-slate-700 text-xs text-left">
                    <p className="font-bold">Mẹo Đặt Tên Cột Bảng Sheets Để Đồng Bộ Thành Công:</p>
                    <p className="leading-relaxed text-[11px] text-slate-500">
                      Hãy đặt tên tiêu đề ở dòng thứ 1 của Google Sheet chứa các từ khoá gần giống gồm: 
                      <strong> Họ Tên </strong> (hoặc Họ và Tên, Tên, Name), 
                      <strong> Điện Thoại </strong> (SĐT), 
                      <strong> Email</strong>, 
                      <strong> Ngày sinh </strong> (Ngày sinh, DOB), 
                      <strong> Đơn giá </strong> (Hourly rate, Lương/tiết), và 
                      <strong> Mã GV </strong> (Mã Số Giáo Viên).
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {syncTab === 'paste' && (
            <div className="space-y-6 text-left animate-fadeIn">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm font-sans">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase font-mono flex items-center gap-1.5">
                      <Table className="h-4.5 w-4.5 text-amber-600" />
                      <span>Sao Chép & Dán trực tiếp từ Excel / Google Sheets</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Cho phép bạn dán trực tiếp dữ liệu thô từ Excel để cập nhật nhanh chóng mà không cần qua cấu hình kết nối.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block">Dán các hàng được copy từ Excel (Dạng phân tách bằng phím Tab) hoặc chuỗi JSON Array:</label>
                  <textarea
                    rows={8}
                    value={pastedDataText}
                    onChange={(e) => setPastedDataText(e.target.value)}
                    placeholder="Hãy copy từ file Excel của bạn và dán vào đây. Ví dụ:&#10;Mã GV	Họ Tên	SĐT	Email	Đơn giá	Địa chỉ&#10;GV001	Nguyễn Văn A	0912345678	a@school.edu.vn	150000	Hà Nội"
                    className="w-full text-xs p-3.5 bg-slate-50 font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div className="text-[10px] text-slate-550 leading-relaxed max-w-lg">
                    💡 <strong>Mẹo nhỏ:</strong> Tiêu đề ở dòng đầu giúp nhận dạng cột tốt hơn (Ví dụ cột có chữ "Tên", "Điện Thoại", "Lương" hoặc "Đơn Giá"). Nếu không có tiêu đề, hệ thống vẫn nạp thô theo thứ tự mặc định của cột.
                  </div>
                  <button
                    type="button"
                    onClick={handleParsePastedData}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-xs transition select-none active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    <span>Phân tích dữ liệu dán</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW TABLE */}
          {previewRows && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4 text-left animate-fadeIn">
              
              {/* Warnings */}
              {parsedWarnings.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[11px] space-y-1">
                  <p className="font-semibold flex items-center gap-1"><AlertCircle className="h-4 w-4 text-amber-500" /> Hệ thống nhận diện cảnh báo:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-mono">
                    {parsedWarnings.map((warn, index) => (
                      <li key={index}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 -mx-5 -mt-5 p-4 rounded-t-2xl border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Xem Trước {Math.min(10, parsedTeachers.length)} Bản Ghi Phân Tích Được</h4>
                  <p className="text-[11px] text-slate-500">Tìm thấy tổng cộng <span className="font-bold text-blue-600">{parsedTeachers.length}</span> giáo viên sẵn sàng nạp.</p>
                </div>

                {/* Mode selection radio */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-medium">
                  <button 
                    onClick={() => setSyncMode('update')}
                    className={`px-4 py-1.5 rounded-lg transition ${syncMode === 'update' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Đối chiếu Mã GV: cập nhật giáo viên cũ nếu trùng mã, thêm mới giáo viên chưa có"
                  >
                    Cập nhật chéo (Merge)
                  </button>
                  <button 
                    onClick={() => setSyncMode('overwrite')}
                    className={`px-4 py-1.5 rounded-lg transition ${syncMode === 'overwrite' ? 'bg-rose-500 text-white shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Xoá toàn bộ hồ sơ cũ trong hệ thống và ghi đè hoàn toàn bằng danh bạ Sheet mới"
                  >
                    Ghi đè sạch (Overwrite)
                  </button>
                </div>
              </div>

              {parsedTeachers.length === 0 ? (
                <div className="py-8 text-center text-rose-500 font-medium text-xs">
                  Không tìm thấy bất kỳ giáo viên hợp lệ nào trong file sheet được cung cấp. Vui lòng kiểm tra lại cấu trúc cột.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl -mx-5">
                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-mono font-semibold">
                          <th className="p-3 pl-5">Mã GV</th>
                          <th className="p-3">Họ Tên</th>
                          <th className="p-3">Đơn giá/Tiết</th>
                          <th className="p-3">Điện Thoại / Email</th>
                          <th className="p-3">Địa Chỉ</th>
                          <th className="p-3 pr-5 text-center">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedTeachers.slice(0, 10).map((gv, idx) => (
                          <tr key={gv.id + idx} className="border-b border-slate-100 last:border-0 divide-slate-100 hover:bg-slate-50/50">
                            <td className="p-3 pl-5 font-mono font-bold text-slate-800">{gv.id}</td>
                            <td className="p-3 font-semibold text-slate-700">{gv.name}</td>
                            <td className="p-3 font-medium text-slate-500">{gv.hourlyRate.toLocaleString('vi-VN')} đ</td>
                            <td className="p-3 text-slate-500">
                              <div>📞 {gv.phone}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{gv.email}</div>
                            </td>
                            <td className="p-3 text-slate-500 truncate max-w-xs">{gv.address || '—'}</td>
                            <td className="p-3 pr-5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${gv.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {gv.status === 'active' ? 'đang làm' : 'tắt'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary note before syncing */}
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 text-[11px] leading-relaxed">
                    {syncMode === 'update' ? (
                      <p>
                        👉 <strong>Chế độ Cập Nhật:</strong> Hệ thống đối sánh {parsedTeachers.length} hồ sơ trong Sheet với {currentTeachersCount} giáo viên hiện có trong app. Cập nhật lương thù lao/phụ cấp cho hồ sơ cũ trùng Mã GV, đồng thời tạo mới các giáo viên bổ sung.
                      </p>
                    ) : (
                      <p className="text-rose-700">
                        ⚠️ <strong>Chế độ GHI ĐÈ SẠCH:</strong> Bạn sẽ <strong>Xoá vĩnh viễn</strong> {currentTeachersCount} giáo viên hiện tại và thay thế hoàn toàn bằng {parsedTeachers.length} giáo viên từ bảng tính. Hành động này sẽ được ghi nhận vào Nhật ký bảo mật (Audit log).
                      </p>
                    )}
                  </div>

                  {/* Modal operations */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 -mx-5 -mb-5 p-5 bg-slate-50 rounded-b-2xl">
                    <span className="text-[10px] text-slate-400 italic font-medium">Đã nạp thành công và sẵn sàng đồng bộ</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setPreviewRows(null);
                          setParsedTeachers([]);
                        }}
                        className="px-4 py-2 text-xs font-semibold hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                      >
                        Hủy kết quả đọc
                      </button>
                      
                      <button 
                        onClick={handleSaveSync}
                        disabled={isCommiting}
                        className={`px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer ${syncMode === 'overwrite' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                        {isCommiting ? (
                          <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                        ) : null}
                        Xác nhận ghi dữ liệu ({parsedTeachers.length} GV)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
