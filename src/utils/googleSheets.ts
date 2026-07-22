import * as XLSX from 'xlsx';
import { Teacher, School, ClassInfo, Schedule } from '../types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'uid-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

export interface GoogleSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * Fetch list of Google Spreadsheet files (and Excel files) from the user's Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<GoogleSpreadsheetFile[]> {
  try {
    const qParam = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'");
    const url = `https://www.googleapis.com/drive/v3/files?q=${qParam}&orderBy=modifiedTime%20desc&pageSize=20&fields=files(id%2Cname%2CmodifiedTime)`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`Lỗi API Drive: ${errorMsg}`);
    }
    
    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Google Sheets:', error);
    throw error;
  }
}

/**
 * Helper to download an XLSX file from Google Drive as binary and parse it with SheetJS
 */
export async function downloadAndParseXLSX(accessToken: string, spreadsheetId: string): Promise<XLSX.WorkBook> {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorMsg = await res.text();
    throw new Error(`Không thể tự động tải file Excel từ Drive: ${errorMsg}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  return workbook;
}

/**
 * Fetch spreadsheet details and check for sheets/tabs info
 */
export async function getSpreadsheetSheets(accessToken: string, spreadsheetId: string): Promise<string[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      // Safe fallback if document is an Excel/Office file format on Drive
      if (errorMsg.includes('Office file') || errorMsg.includes('FAILED_PRECONDITION')) {
        try {
          const workbook = await downloadAndParseXLSX(accessToken, spreadsheetId);
          return workbook.SheetNames && workbook.SheetNames.length > 0 ? workbook.SheetNames : ['Sheet1'];
        } catch (xlsxErr: any) {
          throw new Error(`Lỗi đọc file Excel (.xlsx): ${xlsxErr.message || xlsxErr}`);
        }
      }
      throw new Error(`Lỗi API Sheets: ${errorMsg}`);
    }

    const data = await res.json();
    return data.sheets?.map((s: any) => s.properties.title) || ['Sheet1'];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Sheet Tabs:', error);
    throw error;
  }
}

/**
 * Fetch rows of grid values from Google Sheets API
 */
export async function fetchSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  try {
    const cleanRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cleanRange}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      // Safe fallback if document is an Excel/Office file format on Drive
      if (errorMsg.includes('Office file') || errorMsg.includes('FAILED_PRECONDITION')) {
        try {
          const workbook = await downloadAndParseXLSX(accessToken, spreadsheetId);
          
          let tabName = range;
          if (range.includes('!')) {
            tabName = range.split('!')[0];
          }
          if (tabName.startsWith("'") && tabName.endsWith("'")) {
            tabName = tabName.slice(1, -1);
          } else if (tabName.startsWith('"') && tabName.endsWith('"')) {
            tabName = tabName.slice(1, -1);
          }

          // Normalized and case-insensitive check to identify correct sheet tab
          const matchTab = workbook.SheetNames.find(name => 
            name.toLowerCase().trim() === tabName.toLowerCase().trim()
          ) || workbook.SheetNames[0];

          const worksheet = workbook.Sheets[matchTab];
          if (!worksheet) {
            return [];
          }
          // Convert sheet to row arrays
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
          return rows;
        } catch (xlsxErr: any) {
          throw new Error(`Lỗi nạp dữ liệu Excel từ tab "${range}": ${xlsxErr.message || xlsxErr}`);
        }
      }
      
      if (errorMsg.includes('Unable to parse range')) {
        console.warn(`Bỏ qua tab không tồn tại: ${range}`);
        return [];
      }
      
      throw new Error(`Lỗi API Sheets khi tải dữ liệu: ${errorMsg}`);
    }

    const data = await res.json();
    return data.values || [];
  } catch (error) {
    console.error('Lỗi khi đọc phạm vi dữ liệu Sheet:', error);
    throw error;
  }
}

/**
 * Smart column mapping parser to convert Google Sheets row data into Teacher array
 */
export function parseSheetToTeachers(rows: any[][], existingTeachers: Teacher[] = []): { teachers: Teacher[]; warnings: string[] } {
  const teachers: Teacher[] = [];
  const warnings: string[] = [];
  
  if (rows.length === 0) {
    return { teachers, warnings: ['Bảng tính rỗng hoặc không có dữ liệu.'] };
  }

  // Smart Header parsing - find row that possesses name / ho ten / ho va ten
  let headerRowIndex = 0;
  let headers = rows[0] ? rows[0].map(h => String(h).trim().toLowerCase()) : [];
  
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowCells = rows[r] ? rows[r].map(h => String(h).trim().toLowerCase()) : [];
    const hasNameCol = rowCells.some(h => ['tên', 'name', 'họ tên', 'ho ten', 'họ và tên', 'ho va ten', 'giao vien', 'giáo viên'].some(kw => h === kw || h.includes(kw)));
    if (hasNameCol) {
      headerRowIndex = r;
      headers = rowCells;
      break;
    }
  }
  
  // Find column indexes based on common keywords
  const findIndex = (keywords: string[]): number => {
    return headers.findIndex(h => keywords.some(kw => h.includes(kw)));
  };

  const idIdx = findIndex(['mã', 'id', 'ma gv', 'mã gv', 'ma_gv']);
  const nameIdx = findIndex(['tên', 'name', 'họ tên', 'ho ten', 'họ và tên', 'ho va ten', 'giao vien', 'giáo viên', 'gv']);
  const dobIdx = findIndex(['ngày sinh', 'dob', 'ngay sinh', 'birth']);
  const phoneIdx = findIndex(['điện thoại', 'phone', 'sđt', 'sdt', 'số đt', 'liên hệ']);
  const emailIdx = findIndex(['email', 'thư điện tử']);
  const addrIdx = findIndex(['địa chỉ', 'address', 'dia chi']);
  const statusIdx = findIndex(['trạng thái', 'status', 'trang thai', 'hoạt động']);
  const rateIdx = findIndex(['đơn giá', 'hourly', 'rate', 'thù lao', 'lương/tiết', 'luong']);
  const allowanceIdx = findIndex(['phụ cấp', 'allowance', 'phu cap']);
  const bonusIdx = findIndex(['thưởng', 'bonus', 'thuong']);
  const deductionIdx = findIndex(['khấu trừ', 'deduction', 'khau tru', 'phạt']);
  const notesIdx = findIndex(['ghi chú', 'notes', 'ghi chu']);

  // If we can't find name, we cannot import
  if (nameIdx === -1) {
    return {
      teachers,
      warnings: ['Không tìm thấy cột chứa thông tin "Họ Tên" (Ví dụ: đặt tên cột là: Họ Tên, Tên, Name).']
    };
  }

  // Iterate from row index headerRowIndex + 1 (skip header)
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // Skip empty rows
    }

    const name = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
    if (!name) {
      warnings.push(`Dòng ${i + 1}: Bỏ qua vì thiếu Họ Tên.`);
      continue;
    }

    let id = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : '';
    if (!id) {
      id = 'GV_' + generateUUID();
    } else {
      id = 'GV_' + id + '_' + generateUUID();
    }

    const dob = dobIdx !== -1 && row[dobIdx] ? String(row[dobIdx]).trim() : '';
    const phone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '';
    const email = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : '';
    const address = addrIdx !== -1 && row[addrIdx] ? String(row[addrIdx]).trim() : '';
    
    // Status resolution (default active)
    let status: 'active' | 'inactive' = 'active';
    if (statusIdx !== -1 && row[statusIdx]) {
      const statusStr = String(row[statusIdx]).trim().toLowerCase();
      if (statusStr.includes('nghỉ') || statusStr.includes('inactive') || statusStr.includes('tắt') || statusStr === '0') {
        status = 'inactive';
      }
    }

    // Number conversions
    const parseNum = (val: any, defaultVal = 0): number => {
      if (val === undefined || val === null) return defaultVal;
      const clean = String(val).replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const hourlyRate = rateIdx !== -1 ? parseNum(row[rateIdx], 0) : 0;
    const monthlyAllowance = allowanceIdx !== -1 ? parseNum(row[allowanceIdx], 0) : 0;
    const bonus = bonusIdx !== -1 ? parseNum(row[bonusIdx], 0) : 0;
    const deduction = deductionIdx !== -1 ? parseNum(row[deductionIdx], 0) : 0;
    const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

    teachers.push({
      id,
      name,
      dob,
      phone,
      email,
      address,
      status,
      hourlyRate,
      monthlyAllowance,
      bonus,
      deduction,
      notes,
    });
  }

  // Create nice helpful summary warnings
  if (idIdx === -1) warnings.push('Chú ý: Hệ thống không tìm thấy cột Mã GV. Mã số GV đã được tạo tự động.');
  if (emailIdx === -1) warnings.push('Chú ý: Không tìm thấy cột Email.');
  if (rateIdx === -1) warnings.push('Chú ý: Không tìm thấy cột Đơn giá/Tiết. Mặc định thù lao là 0 đ/tiết.');

  return { teachers, warnings };
}

export interface SpecialScheduleParseResult {
  teachers: Teacher[];
  schedules: Schedule[];
  schools: School[];
  classes: ClassInfo[];
  warnings: string[];
  isScheduleSheet: boolean;
}

export function isExcelDecimalTime(val: string | number): boolean {
  const num = Number(String(val).trim());
  return !isNaN(num) && num > 0 && num < 1;
}

export function convertExcelDecimalsInText(text: string): string {
  if (!text) return '';
  return text.trim().replace(/0\.\d+/g, (match) => {
    const num = Number(match);
    if (num > 0 && num < 1) {
      if (Math.abs(num - 0.3333) < 0.005) {
        return 'Ca Sáng';
      }
      if (Math.abs(num - 0.3958) < 0.005) {
        return '09:30';
      }
      if (Math.abs(num - 0.1) < 0.03 || Math.abs(num - 0.5833) < 0.005) {
        return 'Ca Chiều';
      }
      const decimalHours = num * 24;
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${pad(hours)}:${pad(minutes)}`;
      }
    }
    return match;
  });
}

export function matchSchoolByName(text: string, schoolsList: School[]): { school: School; matchedKeyword: string } | null {
  const cleanText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!cleanText) return null;

  // Let's check explicit mappings for maximum accuracy
  const mappings = [
    { schoolId: 'SCH004', keywords: ['anh duong hong', 'anh duong', 'ánh dương'] },
    { schoolId: 'SCH005', keywords: ['thien than', 'thien than ty hon'] },
    { schoolId: 'SCH006', keywords: ['mai vang'] },
    { schoolId: 'SCH007', keywords: ['ma non'] },
    { schoolId: 'SCH008', keywords: ['tho ngoc', 'tho ngoc trang'] },
    { schoolId: 'SCH009', keywords: ['thien my'] },
    { schoolId: 'SCH010', keywords: ['donalkid'] },
    { schoolId: 'SCH001', keywords: ['anh cau vong', 'cau vong'] },
    { schoolId: 'SCH002', keywords: ['hoa hong'] },
    { schoolId: 'SCH003', keywords: ['tuoi tho'] },
  ];

  for (const m of mappings) {
    for (const kw of m.keywords) {
      if (cleanText.includes(kw) || cleanText.replace(/\s+/g, '').includes(kw.replace(/\s+/g, ''))) {
        const sch = schoolsList.find(s => s.id === m.schoolId);
        if (sch) {
          return { school: sch, matchedKeyword: kw };
        }
      }
    }
  }

  // Generic fallback substring match for schools in the list
  for (const sch of schoolsList) {
    if (sch.id === 'SCH_UNCLASSIFIED') continue;
    const schNameClean = sch.name.replace(/Mầm non\s+/i, '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (schNameClean.length >= 4 && cleanText.includes(schNameClean)) {
      return { school: sch, matchedKeyword: schNameClean };
    }
  }

  return null;
}

export function isValidTeacherName(name: string): boolean {
  if (!name) return false;
  // Exclude empty-like indicators or numbers
  if (/^[0-9.,-]+$/.test(name) || !isNaN(Number(name))) return false;
  
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!lower || lower.length < 2) return false;
  
  if (lower.includes('mam non') || lower.includes('mầm non') || lower.includes('truong') || lower.includes('trường') || lower.includes('lich chưa phan loai') || lower.includes('lich day')) {
    return false;
  }
  
  const days = ['thu hai', 'thu ba', 'thu tu', 'thu nam', 'thu sau', 'thu bay', 'chu nhat', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy', 'chủ nhật', 'sunday', 'monday'];
  if (days.includes(lower)) return false;
  
  const ignoreKeywords = [
    'lịch dạy', 'lich day', 'tuần', 'tuan', 'ghi chú', 'ghi chu', 'đơn giá', 'don gia', 'phụ cấp', 'phu cap',
    'tổng cộng', 'tong cong', 'thành tiền', 'thanh tien', 'ngày sinh', 'ngay sinh', 'địa chỉ', 'dia chi', 'stt',
    'chữ ký', 'chu ky', 'ngày', 'ngay', 'tháng', 'thang', 'năm', 'nam', 'bận', 'rảnh', 'ranh', 'trình độ', 'hệ số',
    'tất cả', 'tat ca', 'chồi', 'choi', 'mầm', 'mam', 'lá', 'la', 'nhà trẻ', 'nha tre', 'vietcombank', 'inkindy', 
    'dreamhouse', 'dream house', 'mầm 1', 'chồi 2', 'bác 4', 'bc 4', 'lớp', 'lop', 'buổi', 'tiết', 't2', 't3', 't4', 't5', 't6', 't7', 'cn'
  ];
  if (ignoreKeywords.some(kw => lower === kw || lower.includes(kw))) {
    return false;
  }
  
  return true;
}

export function parseSpecialScheduleSheet(rows: any[][], existingSchools?: School[], tabName?: string): SpecialScheduleParseResult {
  let isScheduleSheet = false;
  
  // If tabName is provided, check if it represents a schedule sheet (not a generic database list)
  if (tabName) {
    const normTab = tabName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isTeacherDbName = normTab.includes('danh sach') || normTab.includes('database') || normTab.includes('giao vien tong hop') || normTab === 'teachers' || normTab === 'sheet1';
    if (!isTeacherDbName) {
      isScheduleSheet = true;
    }
  }

  // 1. Loose Check: scan all rows & check for days, schedules, or calendars in text
  if (!isScheduleSheet) {
    for (const row of rows) {
      if (!row) continue;
      const text = row.map(c => String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")).join(' ');
      if (
        text.includes('lich day') || 
        text.includes('lịch dạy') || 
        text.includes('thu hai') || 
        text.includes('thu ba') || 
        text.includes('thu tu') || 
        text.includes('thu nam') || 
        text.includes('thu sau') || 
        text.includes('thu bay') || 
        text.includes('chu nhat') || 
        text.includes('thu 2') || 
        text.includes('thu 3') || 
        text.includes('thu 4') || 
        text.includes('thu 5') || 
        text.includes('thu 6') || 
        text.includes('thu 7') || 
        text.includes('t2') || 
        text.includes('t3') || 
        text.includes('t4') || 
        text.includes('t5') || 
        text.includes('t6') || 
        text.includes('t7') || 
        text.includes('choi - la') || 
        text.includes('mam - choi') || 
        text.includes('lich ranh') ||
        text.includes('lich hoc') ||
        text.includes('buổi sáng') ||
        text.includes('buoi sang') ||
        text.includes('buổi chiều') ||
        text.includes('buoi chieu') ||
        text.includes('sáng') ||
        text.includes('chiều')
      ) {
        isScheduleSheet = true;
        break;
      }
    }
  }

  // Fallback Check: if there's no name header column (like "Họ Tên", "Tên", "Name") in the first few rows,
  // then we treat it as a schedule sheet of that tab rather than a teacher database list
  if (!isScheduleSheet && rows.length > 0) {
    let hasNameHeader = false;
    for (let r = 0; r < Math.min(3, rows.length); r++) {
      if (!rows[r]) continue;
      const rowHeaders = rows[r].map(h => String(h).trim().toLowerCase());
      if (rowHeaders.some(h => ['tên', 'name', 'họ tên', 'ho ten', 'họ và tên'].some(kw => h.includes(kw)))) {
        hasNameHeader = true;
        break;
      }
    }
    if (!hasNameHeader) {
      isScheduleSheet = true;
    }
  }

  // Intercept and verify if this is actually a structured teacher database sheet
  // BUT only if it is NOT forced as schedule sheet!
  let isTeacherList = false;
  if (!isScheduleSheet && rows.length > 0) {
    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const cells = row.map(c => String(c).trim().toLowerCase());
      
      const hasNameHeader = cells.some(h => ['tên', 'name', 'họ tên', 'ho ten', 'họ và tên', 'ho va ten', 'giao vien', 'giáo viên'].some(kw => h === kw || h.includes(kw)));
      const hasSecondaryHeader = cells.some(h => ['mã', 'email', 'phone', 'sđt', 'sdt', 'điện thoại', 'đơn giá', 'phụ cấp', 'địa chỉ', 'dob', 'ngày sinh', 'trạng thái'].some(kw => h.includes(kw)));
      
      if (hasNameHeader && hasSecondaryHeader) {
        isTeacherList = true;
        break;
      }
    }
  }

  if (isTeacherList) {
    return { teachers: [], schedules: [], schools: [], classes: [], warnings: [], isScheduleSheet: false };
  }

  if (!isScheduleSheet) {
    return { teachers: [], schedules: [], schools: [], classes: [], warnings: [], isScheduleSheet: false };
  }

  const warnings: string[] = [];
  const schedules: Schedule[] = [];
  
  const schoolsList: School[] = [
    {
      id: 'SCH_UNCLASSIFIED',
      name: 'Lịch chưa phân loại',
      address: 'Hệ thống tự động gom nhóm dịch vụ chưa phân khu',
      contactPerson: 'Admin',
      phone: '',
      lat: 10.8234,
      lng: 106.7788,
      qrCodeData: 'UNCLASSIFIED'
    },
    {
      id: 'SCH004',
      name: 'Mầm non Ánh Dương Hồng',
      address: '12 Đường Lê Văn Việt, Hiệp Phú, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Cô Xuân Quỳnh (Hiệu trưởng)',
      phone: '02837330111',
      lat: 10.8485,
      lng: 106.7725,
      qrCodeData: 'ETMS_QR_VERIFY_SCH004_ANH_DUONG_HONG'
    },
    {
      id: 'SCH005',
      name: 'Mầm non Thiên Thần Tý Hon',
      address: '56 Man Thiện, Tăng Nhơn Phú A, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Cô Ngọc Bích (Tổ trưởng)',
      phone: '02837330222',
      lat: 10.8412,
      lng: 106.7845,
      qrCodeData: 'ETMS_QR_VERIFY_SCH005_THIEN_THAN_TY_HON'
    },
    {
      id: 'SCH006',
      name: 'Mầm non Mai Vàng',
      address: '89 Lã Xuân Oai, Tăng Nhơn Phú A, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Thầy Hoàng Nam',
      phone: '02837330333',
      lat: 10.8358,
      lng: 106.7801,
      qrCodeData: 'ETMS_QR_VERIFY_SCH006_MAI_VANG'
    },
    {
      id: 'SCH007',
      name: 'Mầm non Mạ Non',
      address: '215 Lê Văn Việt, Tăng Nhơn Phú A, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Cô Thu Thủy',
      phone: '02837330444',
      lat: 10.8465,
      lng: 106.7820,
      qrCodeData: 'ETMS_QR_VERIFY_SCH007_MA_NON'
    },
    {
      id: 'SCH008',
      name: 'Mầm non Thỏ Ngọc Trắng',
      address: '44 Tăng Nhơn Phú, Phước Long B, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Cô Quỳnh Chi',
      phone: '02837330555',
      lat: 10.8288,
      lng: 106.7760,
      qrCodeData: 'ETMS_QR_VERIFY_SCH008_THO_NGOC_TRANG'
    },
    {
      id: 'SCH009',
      name: 'Mầm non Thiện Mỹ',
      address: '102 Đường Số 4, Phước Bình, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Cô Thảo Nguyên',
      phone: '02837330666',
      lat: 10.8194,
      lng: 106.7705,
      qrCodeData: 'ETMS_QR_VERIFY_SCH009_THIEN_MY'
    },
    {
      id: 'SCH010',
      name: 'Mầm non Donalkid Q9',
      address: '300 Đỗ Xuân Hợp, Phước Long B, TP. Thủ Đức, TP. HCM',
      contactPerson: 'Thầy Thanh Tú',
      phone: '02837330777',
      lat: 10.8115,
      lng: 106.7905,
      qrCodeData: 'ETMS_QR_VERIFY_SCH010_DONALKID'
    },
    {
      id: 'SCH001',
      name: 'Mầm non Ánh Cầu Vồng',
      address: '125 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      contactPerson: 'Cô Minh Tuyết (Hiệu trưởng)',
      phone: '02838111222',
      lat: 10.7742,
      lng: 106.7025,
      qrCodeData: 'ETMS_QR_VERIFY_SCH001_ANH_CAU_VONG'
    },
    {
      id: 'SCH002',
      name: 'Mầm non Hoa Hồng',
      address: '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      contactPerson: 'Thầy Đức Thịnh (Quản lý Hành chính)',
      phone: '02838999888',
      lat: 10.7758,
      lng: 106.7001,
      qrCodeData: 'ETMS_QR_VERIFY_SCH002_HOA_HONG'
    },
    {
      id: 'SCH003',
      name: 'Mầm non Tuổi Thơ',
      address: '310 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP. Hồ Chí Minh',
      contactPerson: 'Cô Hồng Hạnh (Tổ trưởng Chuyên môn)',
      phone: '02839222333',
      lat: 10.7794,
      lng: 106.6895,
      qrCodeData: 'ETMS_QR_VERIFY_SCH003_TUOI_THO'
    }
  ];

  if (existingSchools && Array.isArray(existingSchools)) {
    existingSchools.forEach(es => {
      if (!schoolsList.find(s => s.id === es.id)) {
        schoolsList.push(es);
      }
    });
  }

  const classesMap = new Map<string, ClassInfo>();
  const parsedTeachersMap = new Map<string, Teacher>();

  // A helper and register pool to keep/look up parsed teachers dynamically
  const getOrCreateTeacher = (name: string): Teacher => {
    const cleanName = name.trim();
    // Unique matching of system standard accounts
    const slug = cleanName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');

    let normalizedId = '';
    if (slug === 'vohuynhdieu') {
      normalizedId = 'GV004';
    } else if (slug === 'lemythu') {
      normalizedId = 'GV001';
    } else if (slug === 'nguyenlamlan') {
      normalizedId = 'GV002';
    } else if (slug === 'tranhuuhai') {
      normalizedId = 'GV003';
    } else if (slug === 'giaovien' || slug === 'chuaphancong' || !slug) {
      // Create a completely unique ID for every unclassified unnamed teacher tab to absolutely prevent copying/overwriting details across tabs
      normalizedId = 'GV_UNMAPPED_' + generateUUID().substring(0, 8).toUpperCase();
    } else {
      normalizedId = 'GV_' + slug.substring(0, 15).toUpperCase();
    }

    const cached = parsedTeachersMap.get(normalizedId);
    if (cached) {
      return cached;
    }

    const tObj: Teacher = {
      id: normalizedId,
      name: cleanName,
      dob: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
      hourlyRate: 0,
      monthlyAllowance: 0,
      bonus: 0,
      deduction: 0,
      notes: ''
    };
    parsedTeachersMap.set(normalizedId, tObj);
    return tObj;
  };

  // Find a tab-level teacher and school first from header cells
  let tabTeacherName = '';
  let tabSchool: School | null = null;
  let extractedPhone = '';
  let extractedAddress = '';
  let extractedNotes = '';
  let extractedEmail = '';

  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c]).trim();
      if (!cellText) continue;

      const lowerCellText = cellText.toLowerCase();

      // Check if matches label pattern like "Giáo viên: Ms. Trang"
      const tenMatch = cellText.match(/^(tên\s*(gv|giáo\s*viên)?|giao\s*vien|giáo\s*viên|họ\s*tên|ho\s*ten|họ\s*và\s*tên|ho\s*va\s*ten)\s*[:\-\s=]\s*(.*)$/i);
      if (tenMatch && tenMatch[3] && isValidTeacherName(tenMatch[3].trim())) {
        tabTeacherName = tenMatch[3].trim();
      }

      // Contiguous check: cell contains "giáo viên" and next cell contains name
      if (['tên', 'tên gv', 'giáo viên', 'giao vien', 'họ tên', 'ho ten', 'họ và tên', 'ho va ten', 'tên giáo viên'].includes(lowerCellText)) {
        if (c + 1 < row.length) {
          const nextVal = String(row[c + 1]).trim();
          if (nextVal && isValidTeacherName(nextVal)) {
            tabTeacherName = nextVal;
          }
        }
      }

      // Check for tab-level school matches (e.g. "Trường: Mầm non Mai Vàng")
      const truongMatch = cellText.match(/^(trường\s*(học)?|truong\s*(hoc)?|địa\s*điểm|dia\s*diem)\s*[:\-\s=]\s*(.*)$/i);
      if (truongMatch && truongMatch[3]) {
        const matched = matchSchoolByName(truongMatch[3].trim(), schoolsList);
        if (matched) {
          tabSchool = matched.school;
        }
      }
      if (['trường', 'truong', 'trường học', 'truong hoc', 'địa điểm', 'dia diem'].includes(lowerCellText)) {
        if (c + 1 < row.length) {
          const nextVal = String(row[c + 1]).trim();
          const matched = matchSchoolByName(nextVal, schoolsList);
          if (matched) {
            tabSchool = matched.school;
          }
        }
      }

      const sdtMatch = cellText.match(/^(sđt|sdt|điện thoại|dien thoai)\s*[:\-\s=]\s*(.*)$/i);
      if (sdtMatch && sdtMatch[2]) {
        extractedPhone = sdtMatch[2].trim();
      }
      if (['sđt', 'sdt', 'điện thoại', 'dien thoai', 'số đt'].includes(lowerCellText)) {
        if (c + 1 < row.length) {
          extractedPhone = String(row[c + 1]).trim();
        }
      }

      const dcMatch = cellText.match(/^(đ\/c|d\/c|địa chỉ|dia chi|dc)\s*[:\-\s=]\s*(.*)$/i);
      if (dcMatch && dcMatch[2]) {
        extractedAddress = dcMatch[2].trim();
      }
      if (['đ/c', 'd/c', 'địa chỉ', 'dia chi', 'dc'].includes(lowerCellText)) {
        if (c + 1 < row.length) {
          extractedAddress = String(row[c + 1]).trim();
        }
      }

      const stkMatch = cellText.match(/^(stk|tài khoản|tai khoan|ngân hàng|so tai khoan)\s*[:\-\s=]\s*(.*)$/i);
      if (stkMatch && stkMatch[2]) {
         extractedNotes = 'STK: ' + stkMatch[2].trim();
      }
      if (['stk', 'tài khoản', 'tai khoan', 'ngân hàng', 'ngan hang'].includes(lowerCellText)) {
        if (c + 1 < row.length) {
          extractedNotes = 'STK: ' + String(row[c + 1]).trim();
        }
      }

      const emailMatch = cellText.match(/^(email|thư điện tử|thu dien tu)\s*[:\-\s=]\s*(.*)$/i);
      if (emailMatch && emailMatch[2]) {
        extractedEmail = emailMatch[2].trim();
      }
      if (['email', 'thư điện tử', 'thu dien tu'].includes(lowerCellText)) {
        if (c + 1 < row.length) {
          extractedEmail = String(row[c + 1]).trim();
        }
      }
    }
  }

  // Fallback to tabName if cells didn't contain metadata, checking validity
  if (!tabTeacherName && tabName) {
    let cleanTabName = tabName.trim();
    if (cleanTabName.toUpperCase().startsWith('GV_')) {
      cleanTabName = cleanTabName.substring(3).trim();
    } else if (cleanTabName.toUpperCase().startsWith('GV ')) {
      cleanTabName = cleanTabName.substring(3).trim();
    }
    
    let formattedName = cleanTabName;
    if (cleanTabName.toUpperCase() === 'MSTRANG') {
      formattedName = 'Ms. Trang';
    } else if (cleanTabName.toUpperCase() === 'MSCAMBINH') {
      formattedName = 'Ms. Cẩm Bình';
    } else {
      // Prettify name split strings
      formattedName = cleanTabName.split('_').join(' ').split('-').join(' ').trim();
    }

    if (isValidTeacherName(formattedName)) {
      tabTeacherName = formattedName;
    } else if (isValidTeacherName(cleanTabName)) {
      tabTeacherName = cleanTabName;
    } else {
      tabTeacherName = formattedName || 'Giáo viên';
    }
  }

  let defaultTeacher: Teacher | null = null;
  if (tabTeacherName) {
    defaultTeacher = getOrCreateTeacher(tabTeacherName);
    if (extractedPhone) defaultTeacher.phone = extractedPhone;
    if (extractedAddress) defaultTeacher.address = extractedAddress;
    if (extractedNotes) defaultTeacher.notes = extractedNotes;
    if (extractedEmail) defaultTeacher.email = extractedEmail;
  }

  let isAfternoon = false;
  let scheduleCount = 100;

  // Let's locate Day columns dynamically!
  const detectedDays: { colIndex: number; dayOfWeek: number }[] = [];
  const foundDays = new Set<number>();

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c]).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!val) continue;

      let dow = -1;
      if (val === 'hai' || val === 't2' || val.startsWith('t2') || val.includes('thu hai') || val.includes('thu 2')) dow = 2;
      else if (val === 'ba' || val === 't3' || val.startsWith('t3') || val.includes('thu ba') || val.includes('thu 3')) dow = 3;
      else if (val === 'tu' || val === 't4' || val.startsWith('t4') || val.includes('thu tu') || val.includes('thu 4')) dow = 4;
      else if (val === 'nam' || val === 't5' || val.startsWith('t5') || val.includes('thu nam') || val.includes('thu 5')) dow = 5;
      else if (val === 'sau' || val === 't6' || val.startsWith('t6') || val.includes('thu sau') || val.includes('thu 6')) dow = 6;
      else if (val === 'bay' || val === 't7' || val.startsWith('t7') || val.includes('thu bay') || val.includes('thu 7')) dow = 7;
      else if (val === 'chu nhat' || val === 'cn' || val === 'sun' || val.includes('chu nhat') || val.includes('cn') || val.includes('thu 8')) dow = 8;

      if (dow !== -1 && !foundDays.has(dow)) {
        detectedDays.push({ colIndex: c, dayOfWeek: dow });
        foundDays.add(dow);
      }
    }
  }

  // For each day of the week, we check BOTH the primary column (odd index) and secondary column (even index)
  // because in these schedules, time ranges and text classes can reside across adjacent merged/split cells.
  const parsedDayColumns: { dayOfWeek: number; cols: number[] }[] = [];
  if (foundDays.size >= 3) {
    detectedDays.forEach(item => {
      parsedDayColumns.push({
        dayOfWeek: item.dayOfWeek,
        cols: [item.colIndex, item.colIndex + 1]
      });
    });
  } else {
    // Fallback covering both columns for days 2-7
    parsedDayColumns.push(
      { dayOfWeek: 2, cols: [1, 2] },
      { dayOfWeek: 3, cols: [3, 4] },
      { dayOfWeek: 4, cols: [5, 6] },
      { dayOfWeek: 5, cols: [7, 8] },
      { dayOfWeek: 6, cols: [9, 10] },
      { dayOfWeek: 7, cols: [11, 12] }
    );
  }

  // Let's find Teacher column dynamically across row headers
  let teacherColIndex = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c]).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (val === 'giao vien' || val === 'giáo viên' || val === 'ten gv' || val === 'tên gv' || val === 'ho ten' || val === 'họ tên' || val === 'gv' || val === 'tên') {
        teacherColIndex = c;
        break;
      }
    }
    if (teacherColIndex !== -1) break;
  }
  if (teacherColIndex === -1) {
    teacherColIndex = 0; // fallback scan
  }

  let activeTeacher: Teacher | null = defaultTeacher;
  const isLockedTeacher = !!defaultTeacher;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowText = row.map(c => String(c).trim().toUpperCase()).join(' ');
    if (rowText.includes('NGHỈ TRƯA') || rowText.includes('NGHI TRUA')) {
      isAfternoon = true;
      continue;
    }

    // Determine row-specific teacher name - ONLY if not locked to single teacher
    let currentRowTeacherName = '';

    if (!isLockedTeacher) {
      if (teacherColIndex !== -1 && teacherColIndex < row.length) {
        const cellVal = String(row[teacherColIndex]).trim();
        if (isValidTeacherName(cellVal)) {
          currentRowTeacherName = cellVal;
        }
      }

      if (!currentRowTeacherName) {
        // Look in columns 0, 1, 2 for any text that constitutes a valid teacher name
        for (let c = 0; c < Math.min(3, row.length); c++) {
          const cellVal = String(row[c]).trim();
          if (isValidTeacherName(cellVal) && !cellVal.toLowerCase().includes('bận') && !cellVal.toLowerCase().includes('rảnh')) {
            currentRowTeacherName = cellVal;
            break;
          }
        }
      }

      if (currentRowTeacherName) {
        activeTeacher = getOrCreateTeacher(currentRowTeacherName);
      }
    }

    for (const item of parsedDayColumns) {
      for (const colIndex of item.cols) {
        if (colIndex >= row.length) continue;
        
        // If the day column is the same column as the teacher name, skip parsing schedule here
        if (colIndex === teacherColIndex) continue;

        const cellContent = String(row[colIndex]).trim();
        if (!cellContent || cellContent === '' || cellContent.toLowerCase() === 'bận' || cellContent.toLowerCase() === 'rãnh' || cellContent.toLowerCase() === 'rảnh' || cellContent.toLowerCase() === 'stt' || cellContent.toLowerCase() === 'thứ hai' || cellContent.toLowerCase() === 'thu hai') {
          continue;
        }

        // STRICT split using split(/\r?\n/) to isolate stacked classes in excel rows
        const cellLines = cellContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let sessionOverride: 'morning' | 'afternoon' | null = null;

        for (const line of cellLines) {
          if (!line || line === '' || line.toLowerCase() === 'bận' || line.toLowerCase() === 'rãnh' || line.toLowerCase() === 'rảnh' || line.toLowerCase() === 'stt' || line.toLowerCase() === 'thứ hai' || line.toLowerCase() === 'thu hai') {
            continue;
          }

          // Convert any excel decimal times (even inside or standalone)
          let convertedLine = convertExcelDecimalsInText(line);

          // Check if the line is purely an Excel decimal time (e.g. 0.3958) or converted pure time
          const isDecimal = isExcelDecimalTime(line);
          const isPureConvertedTime = isDecimal || 
            /^\d\d?:\d\d?$/.test(convertedLine) || 
            /^\d\d?h\d\d?$/.test(convertedLine) || 
            convertedLine === 'Ca Sáng' || 
            convertedLine === 'Ca Chiều';

          if (isPureConvertedTime) {
            const lowerConverted = convertedLine.toLowerCase();
            if (lowerConverted.includes('chiều') || lowerConverted.includes('afternoon')) {
              sessionOverride = 'afternoon';
            } else if (lowerConverted.includes('sáng') || lowerConverted.includes('morning')) {
              sessionOverride = 'morning';
            } else {
              const matchHour = convertedLine.match(/^(\d\d?):(\d\d?)$/);
              if (matchHour) {
                const hourNum = parseInt(matchHour[1], 10);
                if (hourNum >= 12) {
                  sessionOverride = 'afternoon';
                } else {
                  sessionOverride = 'morning';
                }
              }
            }
            // Do not create a schedule for the pure time text itself - skip it!
            continue;
          }

          // Skip Excel numeric expressions
          if (/^[0-9.,-]+$/.test(line) || !isNaN(Number(line)) || /^\d+\.\d+$/.test(line)) {
            continue;
          }

          // Ignore headers & metadata text
          const lowerLine = line.toLowerCase();
          const ignoreKeywords = [
            'lịch dạy', 'lich day', 'tuần', 'tuan', 'ghi chú', 'ghi chu', 
            'thứ hai', 'thu hai', 'thứ ba', 'thu ba', 'thứ tư', 'thu tu', 'thứ năm', 'thu nam', 'thứ sáu', 'thu sau', 'thứ bảy', 'thu bay', 'chủ nhật', 'chu nhat',
            'tên gv', 'ten gv', 'giáo viên', 'giao vien', 'sđt', 'sdt', 'đơn giá', 'don gia', 'phụ cấp', 'phu cap',
            'tổng cộng', 'tong cong', 'thành tiền', 'thanh tien', 'ngày sinh', 'ngay sinh', 'địa chỉ', 'dia chi',
            'bằng chữ', 'bang chu', 'ký nhận', 'ky nhan', 'ký tên', 'ky ten', 'chữ ký', 'chu ky', 'stt', 'ca sáng', 'ca chiều', 'buổi', 'tiết'
          ];
          if (ignoreKeywords.some(kw => lowerLine === kw || lowerLine.includes(kw) || convertedLine.toLowerCase().includes(kw))) {
            continue;
          }

          // Robust match utilizing custom matching logic, fully preventing accidental fallback to Mầm non Ánh Dương
          const searchResult = matchSchoolByName(convertedLine, schoolsList);
          let matchedSchool = searchResult?.school || tabSchool || null;
          let matchedSchoolName = searchResult?.matchedKeyword || '';

          // Fallback to dynamically creating a school based on the class text, instead of lumping 110 schools together!
          if (!matchedSchool) {
            // Only map to new dynamic school if it's likely a class/school name (length >= 3...)
            const lowerLine = convertedLine.toLowerCase();
            const garbageRegex = /thứ(\s|-)*([0-9]|hai|ba|tư|năm|sáu|bảy)|tuần|tiết|ghi chú|đơn giá|tổng cộng|thành tiền|ngân hàng|vietcombank|stk|số tk|số tài khoản|agribank|vietinbank|bidv|mbbank|acb|techcombank|sacombank|vpbank|\bstt\b|chủ nhật/i;

            const isValidUnclassified = convertedLine.length >= 3 && 
              !/^[0-9.,\-+:\s]+$/.test(convertedLine) && 
              !convertedLine.includes(':') && 
              !convertedLine.includes('/') && 
              !lowerLine.includes('địa chỉ') && 
              !garbageRegex.test(convertedLine);

            if (isValidUnclassified) {
              let dynSchoolName = convertedLine.trim();
              let dynClassName = convertedLine.trim();
              
              if (convertedLine.includes('-')) {
                const parts = convertedLine.split('-');
                if (parts.length >= 2) {
                  const part1 = parts.slice(0, -1).join('-').trim();
                  const part2 = parts[parts.length - 1].trim();
                  
                  const classKeywords = /mầm|chồi|lá|nhà trẻ|lớp ghép|lớp nhóm|nhóm|dino|dinosaur|lion|monkey|hippo|elephant|rainy|moon|kiwi|panda|rabbit|nemo|dolphin|hugo|piggold|kiwi|koala|parrot|nt|nhỏ|lớn|vip/i;
                  
                  if (classKeywords.test(part2) && !classKeywords.test(part1)) {
                    // It's likely "School - Class" format (e.g. Tuổi Tiên 2 - mầm 1)
                    dynClassName = part2;
                    dynSchoolName = part1;
                  } else if (classKeywords.test(part2) && classKeywords.test(part1)) {
                    // Both are class-related (e.g. "NT - Lion"), keep the entire text as the class name
                    dynClassName = convertedLine.trim();
                    dynSchoolName = tabSchool ? tabSchool.name : 'Trường chưa rõ';
                  } else {
                    // Default to "Class - School" format (e.g. Lá vip1 - Tuổi Tiên)
                    dynClassName = part1;
                    dynSchoolName = part2;
                  }
                }
              } else {
                // No hyphen, attempt keyword extraction
                const lowered = convertedLine.toLowerCase();
                const classRegex = /(mầm non|mầm|chồi|lá|nhà trẻ|lớp ghép|lớp nhóm|nhóm)\s*[0-9a-z]*\s*(.*)/i;
                const match = convertedLine.match(classRegex);
                
                if (match) {
                  dynClassName = convertedLine.trim();
                  // Extracted the rest as school name
                  if (match[2] && match[2].trim()) {
                    dynSchoolName = match[2].trim();
                  } else {
                    dynSchoolName = 'Trường chưa rõ';
                  }
                } else {
                  // Does not contain Mầm, Chồi, Lá... Likely just a School Name
                  dynSchoolName = convertedLine.trim();
                  dynClassName = 'Lớp ghép';
                }
              }

              // Capitalize school name for consistency
              if (dynSchoolName) {
                 dynSchoolName = dynSchoolName.charAt(0).toUpperCase() + dynSchoolName.slice(1);
              }
              if (!dynSchoolName) dynSchoolName = 'Trường chưa rõ';
              if (!dynClassName) dynClassName = 'Lớp ghép';

              let existingDynSchool = schoolsList.find(s => s.name.toLowerCase() === dynSchoolName.toLowerCase());
              
              if (existingDynSchool) {
                matchedSchool = existingDynSchool;
              } else {
                matchedSchool = {
                  id: 'SCH_DYN_' + generateUUID().substring(0, 8).toUpperCase(),
                  name: dynSchoolName,
                  address: 'Trường chưa phân khu (Tự động tách từ dữ liệu)',
                  contactPerson: 'Ban Giám Hiệu',
                  phone: '',
                  lat: 10.8234 + (Math.random() * 0.05 - 0.025),
                  lng: 106.7788 + (Math.random() * 0.05 - 0.025),
                  qrCodeData: 'DYN_' + generateUUID().substring(0, 8)
                };
                schoolsList.push(matchedSchool);
              }
              // We successfully separated School and Class, so we set the matchedSchoolName to force the class name
              matchedSchoolName = dynSchoolName;
              convertedLine = dynClassName; // force the class downstream logic
            } else {
              continue;
            }
          }

          let className = convertedLine;
          if (matchedSchoolName && searchResult?.school) {
            // Only strip the school name if this is a standard static school match!
            // If it's a dynamic school we just parsed, we keep the separated className intact to avoid turning "Mầm Tuổi Thơ" into just "Mầm"
            const escapedSchoolName = matchedSchoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const matchRegex = new RegExp(escapedSchoolName, 'gi');
            className = convertedLine.replace(matchRegex, '').trim();
            className = className.replace(/^-\s*/, '').replace(/\s*-$/, '').trim();
          }

          className = className.replace(/^-\s*/, '').replace(/\s*-$/, '').trim();

          if (!className) {
            className = 'Lớp ghép';
          }

          // Fail-safe protection: if class name contains raw decimals like 0.3958, ignore it
          if (/0\.\d+/.test(className)) {
            continue;
          }

          const cleanClassNameSlug = className.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!cleanClassNameSlug) continue;

          const classKey = `${matchedSchool.id}_${cleanClassNameSlug}`;
          
          let classObj = classesMap.get(classKey);
          if (!classObj) {
            classObj = {
              id: `CLS_${matchedSchool.id}_${cleanClassNameSlug}`,
              name: className,
              schoolId: matchedSchool.id,
              studentCount: 20 + Math.floor(Math.random() * 10),
              standardPeriods: 1
            };
            classesMap.set(classKey, classObj);
          }

          // Strict mapping context assignment ensuring correct teacherId is registered
          const finalTeacher = activeTeacher || getOrCreateTeacher('Chưa phân công');

          scheduleCount++;
          schedules.push({
            id: 'SKD_' + generateUUID(),
            dayOfWeek: item.dayOfWeek,
            session: sessionOverride || (isAfternoon ? 'afternoon' : 'morning'),
            teacherId: finalTeacher.id,
            schoolId: matchedSchool.id,
            classId: classObj.id,
            periods: 1
          });
        }
      }
    }
  }

  const createdClasses = Array.from(classesMap.values());
  const createdTeachers = Array.from(parsedTeachersMap.values());

  return {
    teachers: createdTeachers.length > 0 ? createdTeachers : (defaultTeacher ? [defaultTeacher] : []),
    schedules,
    schools: schoolsList,
    classes: createdClasses,
    warnings,
    isScheduleSheet: true
  };
}
