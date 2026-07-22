export interface Teacher {
  id: string; // Mã giáo viên, e.g., 'GV001'
  name: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  hourlyRate: number; // Đơn giá / tiết (VNĐ)
  monthlyAllowance: number; // Phụ cấp cố định (VNĐ)
  bonus: number; // Thưởng thêm (VNĐ)
  deduction: number; // Phạt vi phạm (VNĐ)
  socialInsurance?: number; // BHXH (VNĐ)
  advanceSalary?: number; // Ứng lương (VNĐ)
  bonusPeriodsJSON?: string;
  notes: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  lat: number; // Vĩ độ
  lng: number; // Kinh độ
  qrCodeData: string; // QR code text verification
  isDeleted?: boolean;
  deletedAt?: string;
  tuitionRate?: string;
  isInvoice?: boolean;
  classesCount?: number;
}

export interface ClassInfo {
  id: string;
  name: string; // Mầm 1, Chồi 1, Lá 2...
  schoolId: string;
  studentCount: number;
  standardPeriods: number; // Số tiết chuẩn
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Schedule {
  id: string;
  dayOfWeek: number; // 2 = Thứ 2, 3 = Thứ 3, ..., 8 = Chủ Nhật
  session: string; // Sáng / Chiều / Giờ tuỳ chỉnh
  startTime?: string; // Opt
  teacherId: string;
  schoolId: string;
  schoolName?: string;
  classId: string;
  periods: number;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface AttendanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  scheduleId?: string; // Optional links to schedules
  teacherId: string;
  schoolId: string;
  schoolName?: string;
  classId: string;
  session: string;
  checkInTime: string; // HH:mm:ss
  periods: number;
  lat: number;
  lng: number;
  distanceMeter: number;
  selfieImage: string; // base64 or placeholder URLs
  verificationMethod: 'GPS' | 'QR' | 'BOTH';
  isVerified: boolean;
  isFlagged: boolean; // Trạng thái cảnh báo gian lận
  flagReason?: string;
  confirmedByAdmin: boolean;
}

export interface ChangeRequest {
  id: string;
  teacherId: string;
  requestType: 'sick_leave' | 'swap_shift' | 'substitute_teacher' | 'art_performance';
  date: string; // Ngày xin phép
  session: string;
  originalTeacherId: string;
  targetTeacherId?: string; // Giáo viên dạy thay (nếu có)
  targetScheduleId?: string; // Lịch dạy muốn hoán đổi (nếu có)
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  adminNotes?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  timestamp: string;
  isRead: boolean;
  targetTeacherId?: string; // if null, sends to admin/all
}

export interface AuditLog {
  id: string;
  action: string; // VD: "Sửa lịch dạy từ Cô Thư sang Cô Lan"
  actor: string; // "Admin" hoặc tên giáo viên
  timestamp: string;
  details: string;
}

export interface MeetingAttendance {
  id: string;
  date: string;
  teacherId: string;
  type: 'training' | 'meeting';
  status: 'present' | 'absent_excused' | 'absent_unexcused';
  note?: string;
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'manager' | 'member' | 'hr' | 'training' | 'accounting';
  teacherId?: string | null;
  permissions: string[]; // custom flags
  isDeleted?: boolean;
}

export interface AppSettings {
  id: string;
  allowTeacherScheduleEdit: boolean;
  allowTeacherUpdateSchoolLocation?: boolean;
  requireSelfieCheckIn?: boolean;
}
