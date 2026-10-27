import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Calendar, Clock, DollarSign, ArrowLeftRight, Check, AlertCircle, Bell, 
  MapPin, Camera, QrCode, Sparkles, Send, ShieldAlert, Smartphone, CheckCircle, RefreshCw, Edit2, X, Save, Image as ImageIcon, Building, CalendarPlus,
  Target, TrendingUp, Award, Download, Share2, Copy, BarChart3, Paperclip, Eye, Upload, ZoomIn, ChevronDown, ChevronUp, CheckCircle2, RotateCcw,
  MessageCircle
} from 'lucide-react';
import { Teacher, School, ClassInfo, Schedule, AttendanceLog, ChangeRequest, SystemNotification, AppUser, AppSettings } from '../types';
import { calculateDistance } from '../utils/localStorage';
import { getAccurateCurrentPosition } from '../utils/gps';
import TeacherDayPollModal from './TeacherDayPollModal';

interface TeacherDashboardProps {
  teachers: Teacher[];
  schools: School[];
  classes: ClassInfo[];
  schedules: Schedule[];
  attendance: AttendanceLog[];
  changes: ChangeRequest[];
  settings?: AppSettings;
  currentUser?: AppUser | null;
  onUpdateSchools: (schools: School[]) => Promise<void> | void;
  onUpdateClasses: (classes: ClassInfo[]) => Promise<void> | void;
  onUpdateSchedules: (schedules: Schedule[]) => Promise<void> | void;
  onUpdateAttendance: (attendance: AttendanceLog[]) => Promise<void> | void;
  onUpdateChanges: (changes: ChangeRequest[]) => Promise<void> | void;
  onAddAuditLog: (action: string, actor: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'warning' | 'alert' | 'success', targetTeacherId?: string) => void;
  quickAnnouncement?: { id: string; title: string; message: string; targetUserId?: string | null; timestamp: string } | null;
  schoolCancellations: any[];
  onUpdateSchoolCancellations: (updated: any[]) => void;
}

const getSessionCategory = (sess: string) => {
  const s = (sess || '').toLowerCase();
  const timeMatch = s.match(/(\d{1,2})[:h](\d{2})?/);
  let minutes = 0;
  if (timeMatch) {
     let hour = parseInt(timeMatch[1], 10);
     const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
     if ((s.includes('chiều') || s.includes('chieu') || s.includes('pm') || s.includes('p.m')) && hour < 12) hour += 12;
     minutes = hour * 60 + min;
  } else if (s === 'morning' || s.includes('sáng') || s.includes('sang') || s.includes('am')) {
     minutes = 6 * 60;
  } else if (s === 'afternoon' || s.includes('chiều') || s.includes('chieu') || s.includes('pm')) {
     minutes = 13 * 60;
  }
  return minutes < 12 * 60 ? 'morning' : 'afternoon';
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function TeacherDashboard({
  teachers,
  schools,
  classes,
  schedules,
  attendance,
  changes,
  settings,
  currentUser,
  onUpdateSchools,
  onUpdateClasses,
  onUpdateSchedules,
  onUpdateAttendance,
  onUpdateChanges,
  onAddAuditLog,
  onAddNotification,
  quickAnnouncement,
  schoolCancellations,
  onUpdateSchoolCancellations
}: TeacherDashboardProps) {
  // Current active teacher simulator state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [lastReadQaId, setLastReadQaId] = useState(() => localStorage.getItem('read_qa_id') || '');
  const [isQaDismissedTemp, setIsQaDismissedTemp] = useState(false);

  // [NÂNG CẤP MỤC 7]: TRẠNG THÁI NGOẠI TUYẾN & ĐỒNG BỘ CHẤM CÔNG OFFLINE
  const [isNetworkOnline, setIsNetworkOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlinePendingCount, setOfflinePendingCount] = useState(() => {
    try {
      const raw = localStorage.getItem('cauvong_offline_attendance_queue');
      if (!raw) return 0;
      const q = JSON.parse(raw);
      return Array.isArray(q?.upsert) ? q.upsert.length : 0;
    } catch { return 0; }
  });

  useEffect(() => {
    const updateNetStatus = () => setIsNetworkOnline(navigator.onLine);
    const handleOfflineStatus = (e: any) => {
      if (typeof e.detail?.count === 'number') {
        setOfflinePendingCount(e.detail.count);
      }
      if (e.detail?.synced) {
        customAlert('Thành công', '✅ Đã đồng bộ thành công ca chấm công ngoại tuyến lên máy chủ Cầu Vồng!');
      }
    };

    window.addEventListener('online', updateNetStatus);
    window.addEventListener('offline', updateNetStatus);
    window.addEventListener('cauvong_offline_status_change', handleOfflineStatus);

    return () => {
      window.removeEventListener('online', updateNetStatus);
      window.removeEventListener('offline', updateNetStatus);
      window.removeEventListener('cauvong_offline_status_change', handleOfflineStatus);
    };
  }, []);
  
  const rawPerms = typeof currentUser?.permissions === 'string' 
    ? (() => { try { return JSON.parse(currentUser.permissions || '[]'); } catch { return []; } })() 
    : (currentUser?.permissions || []);
  const userPermsArray = Array.isArray(rawPerms) ? rawPerms : (typeof rawPerms === 'string' ? [rawPerms] : []);

  const canViewAllTeachers = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_teachers');
  const canViewAllSchedules = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_schedules') || userPermsArray.includes('can_edit_schedule');
  const isRestrictedView = !canViewAllSchedules;
  const effectiveTeacherId = currentUser?.teacherId || teachers.find(t => !t.isDeleted && (
    t.id === currentUser?.username || 
    t.name.toLowerCase() === currentUser?.username?.toLowerCase() ||
    (currentUser?.username && (
      t.id.toLowerCase().replace(/[^a-z0-9]/g, '') === currentUser.username.toLowerCase().replace(/[^a-z0-9]/g, '') ||
      t.id.toLowerCase().replace(/^gv_?/, '') === currentUser.username.toLowerCase().replace(/^gv_?/, '') ||
      t.id.toLowerCase().replace(/^gv_?(mr|ms)_?/, '') === currentUser.username.toLowerCase().replace(/^gv_?(mr|ms)_?/, '') ||
      currentUser.username.toLowerCase().includes(t.id.toLowerCase().replace(/^gv_?(mr|ms)_?/, ''))
    ))
  ))?.id;
  const rawAllowed = teachers.filter(t => !t.isDeleted && (!isRestrictedView || t.id === effectiveTeacherId));
  // Fallback an toàn: nếu chưa khớp do chữ hoa/thường hoặc thiếu prefix GV_
  const fallbackAllowed = rawAllowed.length > 0 
    ? rawAllowed 
    : teachers.filter(t => !t.isDeleted && currentUser?.username && (
        t.id.toLowerCase() === currentUser.username.toLowerCase() ||
        t.id.toLowerCase().replace(/^gv_?/, '') === currentUser.username.toLowerCase().replace(/^gv_?/, '') ||
        t.id.toLowerCase().replace(/^gv_?(mr|ms)_?/, '') === currentUser.username.toLowerCase().replace(/^gv_?(mr|ms)_?/, '') ||
        ((currentUser as any)?.name && t.name.toLowerCase() === (currentUser as any).name.toLowerCase())
      ));
  // Bảo mật tuyệt đối: Nếu là giáo viên (isRestrictedView) mà chưa liên kết hồ sơ, không bao giờ fallback ra toàn bộ danh sách để tránh nhảy sang thầy An
  const allowedTeachers = fallbackAllowed.length > 0 
    ? fallbackAllowed 
    : (isRestrictedView ? [] : teachers.filter(t => !t.isDeleted));

  const currentTeacher = allowedTeachers.find(t => t.id === selectedTeacherId) || (isRestrictedView && effectiveTeacherId ? allowedTeachers.find(t => t.id === effectiveTeacherId) : null) || allowedTeachers[0] || (!isRestrictedView ? (teachers.find(t => !t.isDeleted) || teachers[0] || null) : null);
  const isViewingSelf = currentTeacher?.id === currentUser?.teacherId;
  const isTeacherJoined = Boolean(
    currentTeacher?.notificationToken && 
    currentTeacher.notificationToken !== '' && 
    currentTeacher.notificationToken !== 'null'
  );

  // Auto-select first teacher if state is empty and a new teacher is added
  useEffect(() => {
    if (isRestrictedView) {
      // Với giáo viên thông thường: Bắt buộc chỉ xem chính mình
      if (effectiveTeacherId && allowedTeachers.some(t => t.id === effectiveTeacherId)) {
        if (selectedTeacherId !== effectiveTeacherId) {
          setSelectedTeacherId(effectiveTeacherId);
        }
      }
    } else {
      // Với Admin hoặc người có quyền xem tất cả giáo viên: Tự do chọn giáo viên khác từ dropdown
      if (!selectedTeacherId) {
        if (effectiveTeacherId && allowedTeachers.some(t => t.id === effectiveTeacherId)) {
          setSelectedTeacherId(effectiveTeacherId);
        } else if (allowedTeachers.length > 0) {
          setSelectedTeacherId(allowedTeachers[0].id);
        }
      } else if (allowedTeachers.length > 0 && !allowedTeachers.some(t => t.id === selectedTeacherId)) {
        setSelectedTeacherId(allowedTeachers[0].id);
      }
    }
  }, [allowedTeachers, selectedTeacherId, currentUser, effectiveTeacherId, isRestrictedView]);

  // Mobile navigation tabs inside smartphone framework
  const [mobileTab, setMobileTab] = useState<'home' | 'schedule' | 'checkin' | 'salary' | 'swap' | 'substitute_tab' | 'school' | 'account'>('home');
  const [adminOverrideDate, setAdminOverrideDate] = useState<string>('');

  // Reset mobile tab if viewing restricted tabs
  useEffect(() => {
    const isViewingSelf = currentTeacher?.id === currentUser?.teacherId;
    if (!isViewingSelf && !canViewAllTeachers && !['home', 'schedule'].includes(mobileTab)) {
      setMobileTab('home');
    }
  }, [currentTeacher?.id, currentUser?.teacherId, canViewAllTeachers, mobileTab]);

  const [homeSubTab, setHomeSubTab] = useState<'overview' | 'history'>('overview');
  const nowForHistory = new Date();
  const [historyYear, setHistoryYear] = useState<string>(String(nowForHistory.getFullYear()));
  const [historyMonth, setHistoryMonth] = useState<string>(String(nowForHistory.getMonth() + 1).padStart(2, '0'));
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  const [alertModal, setAlertModal] = useState<{title: string, message: string} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  const customAlert = (title: string, message: string) => setAlertModal({ title, message });
  const customConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ title, message, onConfirm });


  const [showMakeupForm, setShowMakeupForm] = useState(false);
    const [editingSchool, setEditingSchool] = useState<string | null | undefined>(undefined);
  const [editSchoolData, setEditSchoolData] = useState<any>({});
  const [updatingGpsSchoolId, setUpdatingGpsSchoolId] = useState<string | null>(null);
  const [gpsMessage, setGpsMessage] = useState<{type: 'error'|'success', text: string} | null>(null);
  
    const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    
    if (!currentUser) {
      setPasswordMessage({ type: 'error', text: 'Không tìm thấy thông tin tài khoản.' });
      return;
    }

    try {
      const res = await fetch(`/api/users/${currentUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Đổi mật khẩu thất bại.' });
      }
    } catch (err) {
      console.error(err);
      setPasswordMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const handleSaveSchoolEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchool) {
      const originalSchool = schools.find(s => s.id === editingSchool);
      
      const schedulesToUpdate = schedules.map(s => s);
      
      const updated = schools.map(s => s.id === editingSchool ? { ...s, ...editSchoolData } : s);
      
      if (JSON.stringify(schedulesToUpdate) !== JSON.stringify(schedules)) {
         onUpdateSchedules(schedulesToUpdate);
      }
      onUpdateSchools(updated);
    } else {
      const newId = 'SCH_' + Date.now() + (currentTeacher?.id ? '_' + currentTeacher.id : '');
      const newSch = {
        name: editSchoolData.name || 'Trường mới',
        address: editSchoolData.address || '',
        lat: Number(editSchoolData.lat) || 0,
        lng: Number(editSchoolData.lng) || 0,
        contactPerson: '',
        phone: '',
        qrCodeData: `ETMS_QR_VERIFY_${newId}`,
        ...editSchoolData,
        id: newId
      };
      onUpdateSchools([...schools, newSch]);
    }
    setEditingSchool(undefined);
    customAlert('Thông báo', 'Đã lưu thông tin trường!');
  };

  const [makeupDate, setMakeupDate] = useState('');
  const [makeupScheduleId, setMakeupScheduleId] = useState('');
  const [makeupReason, setMakeupReason] = useState('');

  // Interactive GPS simulator options:
  // We allow simulating different location coordinates to test the 100-meter GPS blocker
  const [locationSimulation, setLocationSimulation] = useState<'correct' | 'far' | 'extreme'>('correct');
  
  // Custom slider coordinates (starts near Ánh Cầu Vồng)
  const [userLat, setUserLat] = useState<number>(10.7742);
  const [userLng, setUserLng] = useState<number>(106.7025);

  // Active schedule selected for check-in
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [selectedCheckinScheduleIds, setSelectedCheckinScheduleIds] = useState<string[]>([]);

  // Selfie camera state
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // QR confirmation
  const [scannedQR, setScannedQR] = useState<string>('');
  const [isScanningQR, setIsScanningQR] = useState<boolean>(false);

  // Shift substitution form states
  const [reqType, setReqType] = useState<'sick_leave' | 'swap_shift' | 'emergency_swap' | 'substitute_teacher' | 'art_performance'>('substitute_teacher');
  const [reqDate, setReqDate] = useState<string>('');
  const [reqSession, setReqSession] = useState<string>('morning');
  const [reqReason, setReqReason] = useState<string>('');
  const [artCount, setArtCount] = useState<number>(1);
  const [reqStatusMessage, setReqStatusMessage] = useState<string>('');
  const [substituteMode, setSubstituteMode] = useState<'regular' | 'past_leave'>('regular');
  const [selectedPastLeaveIds, setSelectedPastLeaveIds] = useState<string[]>([]);
  const [emergencySubMode, setEmergencySubMode] = useState<'has_substitute' | 'no_substitute'>('has_substitute');
  const [emergencyTargetTeacherId, setEmergencyTargetTeacherId] = useState<string>('');
  const [substituteTargetTeacherId, setSubstituteTargetTeacherId] = useState<string>('');

  // Proof Image State for Change Requests
  const [proofImagePreview, setProofImagePreview] = useState<string>('');
  const [isCompressingProof, setIsCompressingProof] = useState<boolean>(false);
  const [selectedProofModal, setSelectedProofModal] = useState<{ url: string; title: string } | null>(null);

  // KPI & Teaching Progress State
  const [showKpiDetails, setShowKpiDetails] = useState<boolean>(false);

  // Schedule Edit
  const [editingScheduleItem, setEditingScheduleItem] = useState<Schedule | null>(null);

  // Custom Background Image
  // Auto-subscribe to Web Push if permission is already granted
  useEffect(() => {
    const autoRegisterPush = async () => {
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && currentTeacher) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BP4ox6NYl1dug9LnF3Y2kjl23EE_ruRp3W03du42IFoIjSJa_x8SsFf8r7jb2ReVgkSWqKKkP9IRc3mGYqK4f5c')
          };
          let subscription = await reg.pushManager.getSubscription();
          if (!subscription) {
            subscription = await reg.pushManager.subscribe(subscribeOptions);
          }
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentTeacher.id,
              subscription
            })
          });
        } catch (e) {
          console.warn('Auto-registering push subscription failed:', e);
        }
      }
    };
    autoRegisterPush();
  }, [currentTeacher]);

  // Morning Greeting Notification
  useEffect(() => {
    if (!currentTeacher) return;
    
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 5 is Friday
    const hours = now.getHours();

    // Monday to Friday, and time is >= 7:00 AM (and before 12:00 PM for safety)
    if (day >= 1 && day <= 5 && hours >= 7 && hours < 12) {
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const greetingKey = `morning_greeting_${todayStr}_${currentTeacher.id}`;
      if (!localStorage.getItem(greetingKey)) {
        onAddNotification(
          '🌞 Chúc ngày mới tốt lành!',
          'Chúc mừng buổi sáng từ công ty Cầu Vồng! Chúc bạn tràn đầy năng lượng trên bục giảng.',
          'success',
          currentTeacher.id
        );
        localStorage.setItem(greetingKey, 'true');
      }
    }
  }, [currentTeacher, onAddNotification]);

  const [schoolClosedModalSchedule, setSchoolClosedModalSchedule] = useState<Schedule | null>(null);
  const [selectedCancelScheduleIds, setSelectedCancelScheduleIds] = useState<string[]>([]);
  const [closedType, setClosedType] = useState<'arrived' | 'notified'>('arrived');
  const [closedReason, setClosedReason] = useState<string>('');
  const [submittingClosed, setSubmittingClosed] = useState(false);

  const handleOpenSchoolClosedModal = (sc: Schedule) => {
    setSchoolClosedModalSchedule(sc);
    setSelectedCancelScheduleIds([sc.id]);
    setClosedType('arrived');
    setClosedReason('Trường báo nghỉ');
  };

  const handleSubmitSchoolClosed = async () => {
    if (!schoolClosedModalSchedule || !currentTeacher || selectedCancelScheduleIds.length === 0) return;
    setSubmittingClosed(true);
    try {
      const selectedSchedules = todaySchedules.filter(s => selectedCancelScheduleIds.includes(s.id));
      if (selectedSchedules.length === 0) {
        customAlert('Thông báo', 'Vui lòng chọn ít nhất 1 tiết/lớp để báo nghỉ!');
        setSubmittingClosed(false);
        return;
      }

      const newRecords: any[] = [];
      const creditedSessions = new Set<string>();
      for (let i = 0; i < selectedSchedules.length; i++) {
        const sc = selectedSchedules[i];
        const sessCat = getSessionCategory(sc.session);
        const sessKey = `${sc.schoolId}_${sessCat}`;
        const isFirstInSession = !creditedSessions.has(sessKey);
        if (closedType === 'arrived' && isFirstInSession) {
          creditedSessions.add(sessKey);
        }
        newRecords.push({
          id: `CAN_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
          date: todayStr,
          scheduleId: sc.id,
          teacherId: currentTeacher.id,
          schoolId: sc.schoolId,
          classId: sc.classId,
          session: sc.session,
          cancellationType: closedType,
          periodsCredited: (closedType === 'arrived' && isFirstInSession) ? 1.0 : 0.0,
          reason: closedReason.trim() || 'Trường báo nghỉ',
          createdAt: new Date().toISOString()
        });
      }

      const res = await fetch('/api/school-cancellations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsert: newRecords })
      });

      if (res.ok) {
        const selectedIdsSet = new Set(selectedCancelScheduleIds);
        const selectedClassIdsSet = new Set(selectedSchedules.map(s => s.classId));
        
        // Loại bỏ các bản ghi cũ của các tiết được chọn
        const filteredOld = (schoolCancellations || []).filter(c => 
          !(c.teacherId === currentTeacher.id && c.date === todayStr && (selectedIdsSet.has(c.scheduleId) || (c.schoolId === schoolClosedModalSchedule.schoolId && selectedClassIdsSet.has(c.classId))))
        );
        onUpdateSchoolCancellations([...filteredOld, ...newRecords]);
        
        const classNamesStr = selectedSchedules.map(s => getClassName(s.classId)).join(', ');
        onAddAuditLog(
          'Báo trường nghỉ', 
          currentTeacher.name, 
          `Báo trường nghỉ ${selectedSchedules.length} tiết (Lớp: ${classNamesStr}) trường ${getSchoolName(schoolClosedModalSchedule.schoolId, schoolClosedModalSchedule)} ngày ${todayStr} (${closedType === 'arrived' ? 'Đã tới trường (+1 tiết)' : 'Báo trước'}). Lý do: ${closedReason.trim() || 'Trường báo nghỉ'}`
        );
        
        onAddNotification(
          'Báo Trường Nghỉ mới 🚫',
          `Giáo viên ${currentTeacher.name} báo Trường Nghỉ ${selectedSchedules.length} tiết (Lớp: ${classNamesStr}) trường ${getSchoolName(schoolClosedModalSchedule.schoolId, schoolClosedModalSchedule)} ngày ${todayStr}. Lý do: ${closedReason.trim() || 'Trường báo nghỉ'}`,
          'warning'
        );

        customAlert('Thành công', `Đã ghi nhận thông tin trường báo nghỉ cho ${selectedSchedules.length} tiết (${classNamesStr}) thành công! Các tiết này đã được chuyển thành trạng thái Rảnh Ca.`);
        setSchoolClosedModalSchedule(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        customAlert('Thất bại', errData.error || 'Không thể gửi yêu cầu báo nghỉ. Vui lòng thử lại!');
      }
    } catch (e: any) {
      console.error('Submit school closed error:', e);
      customAlert('Lỗi kết nối', 'Đã xảy ra lỗi kết nối khi gửi yêu cầu báo trường nghỉ: ' + (e?.message || ''));
    } finally {
      setSubmittingClosed(false);
    }
  };

  const handleCancelSchoolClosed = async (cancellationId: string, sc: Schedule) => {
    setConfirmModal({
      title: 'Hủy báo trường nghỉ?',
      message: `Bạn có chắc chắn muốn hủy trạng thái báo nghỉ của lớp "${getClassName(sc.classId)}" để quay lại trạng thái dạy và điểm danh bình thường?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/school-cancellations/${cancellationId}`, { method: 'DELETE' });
          if (res.ok) {
            const updated = (schoolCancellations || []).filter(c => c.id !== cancellationId);
            onUpdateSchoolCancellations(updated);
            onAddAuditLog(
              'Hủy báo trường nghỉ',
              currentTeacher?.name || 'Giáo viên',
              `Hủy báo nghỉ lớp ${getClassName(sc.classId)} trường ${getSchoolName(sc.schoolId, sc)} ngày ${todayStr}`
            );
            customAlert('Thành công', `Đã hủy báo nghỉ lớp "${getClassName(sc.classId)}"! Thầy/Cô có thể tiến hành Điểm danh dạy học.`);
          } else {
            customAlert('Lỗi', 'Không thể hủy báo trường nghỉ. Vui lòng thử lại!');
          }
        } catch (err: any) {
          console.error('Cancel school closed error:', err);
          customAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ: ' + (err?.message || ''));
        }
      }
    });
  };

  // Dynamic calculations based on selected simulation coordinates
  const activeSchedules = schedules.filter(s => !s.isDeleted && s.teacherId === currentTeacher?.id);
  
  const dToday = adminOverrideDate ? new Date(adminOverrideDate) : new Date(); 
  const todayStr = adminOverrideDate || `${dToday.getFullYear()}-${String(dToday.getMonth() + 1).padStart(2, '0')}-${String(dToday.getDate()).padStart(2, '0')}`;
  const todayJS = dToday.getDay();
  // Map JavaScript getDay (0=Sunday, 1=Monday...) to app format (2=Monday, 3=Tuesday... 8=Sunday)
  const currentDayOfWeek = todayJS === 0 ? 8 : todayJS + 1;
  const todaySchedules = activeSchedules
    .filter(s => s.dayOfWeek === currentDayOfWeek)
    .sort((a, b) => {
      // Sáng first, then Chiều
      const getWeight = (session: string) => {
         const s = session?.toLowerCase() || '';
         const timeMatch = s.match(/(\d{1,2})[:h](\d{2})?/);
         if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            if (s.includes('chiều') && hour < 12) hour += 12;
            return hour * 60 + minute;
         }
         if (s === 'morning' || s.includes('sáng')) return 6 * 60;
         if (s === 'afternoon' || s.includes('chiều')) return 13 * 60;
         return 24 * 60;
      };
      return getWeight(a.session) - getWeight(b.session);
    });

  // Find all approved substitute assignments for this teacher starting from today
  const upcomingSubRequests = changes.filter(c => 
    c.status === 'approved' && 
    c.targetTeacherId === currentTeacher?.id && 
    c.date >= todayStr
  );

  // Find substitute assignments for today
  if (currentTeacher) {
    const todaySubRequests = changes.filter(c => 
      c.status === 'approved' && 
      c.date === todayStr && 
      c.targetTeacherId === currentTeacher.id
    );
    
    todaySubRequests.forEach(req => {
      let originalSchedules: Schedule[] = [];

      if (req.targetScheduleId && req.targetScheduleId.trim()) {
        const itemIds = req.targetScheduleId.split(',').map(s => s.trim()).filter(Boolean);
        itemIds.forEach(itemId => {
          if (itemId.startsWith('missed_')) {
            const parts = itemId.split('_');
            const schedId = parts.slice(1, parts.length - 1).join('_');
            const s = schedules.find(x => x.id === schedId && !x.isDeleted && x.teacherId === req.originalTeacherId);
            if (s) originalSchedules.push(s);
          } else if (itemId.startsWith('leave_')) {
            const reqId = itemId.replace('leave_', '');
            const parts = reqId.split('_');
            if (parts.length > 1) {
              const schedId = parts.slice(1).join('_');
              const s = schedules.find(x => x.id === schedId && !x.isDeleted && x.teacherId === req.originalTeacherId);
              if (s) originalSchedules.push(s);
            } else {
              const origReq = changes.find(c => c.id === reqId);
              if (origReq) {
                const [y, m, d] = origReq.date.split('-');
                const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                const dayScheds = schedules.filter(s => 
                  !s.isDeleted && 
                  s.teacherId === origReq.originalTeacherId && 
                  s.dayOfWeek === reqDayOfWeek && 
                  getSessionCategory(s.session) === origReq.session
                );
                originalSchedules.push(...dayScheds);
              }
            }
          } else {
            const s = schedules.find(x => x.id === itemId && !x.isDeleted && x.teacherId === req.originalTeacherId);
            if (s) originalSchedules.push(s);
          }
        });
      }
      
      if (originalSchedules.length === 0) {
        originalSchedules = schedules.filter(s => 
          !s.isDeleted &&
          s.teacherId === req.originalTeacherId && 
          s.dayOfWeek === currentDayOfWeek && 
          getSessionCategory(s.session) === getSessionCategory(req.session)
        );
      }

      originalSchedules.forEach(subSched => {
        if (!todaySchedules.find(ts => ts.id === subSched.id)) {
           // We clone it and attach a flag just for the UI so Teacher knows it's a sub shift
           todaySchedules.push({ ...subSched, isSubstitute: true } as any);
        }
      });
    });
  }

  const selectedSchedule = todaySchedules.find(s => s.id === selectedScheduleId) || schedules.find(s => s.id === selectedScheduleId);
  const targetSchool = selectedSchedule 
    ? (schools.find(s => s.id === selectedSchedule.schoolId) || 
       schools.find(s => s.name === selectedSchedule.schoolId) || { 
        id: selectedSchedule.schoolId, 
        name: selectedSchedule.schoolId, 
        address: 'Chưa xác định', 
        lat: 0, 
        lng: 0, 
        qrCodeData: `QR-CODE-${selectedSchedule.schoolId}` 
      }) as import('../types').School
    : null;

  // Track coordinates depending on preset coordinate simulator
  const getSchoolName = (id: string, s?: any) => {
    if (s && s.schoolName) return s.schoolName; // Prefer frozen custom name
    return schools.find(sch => sch.id === id)?.name || id;
  };
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || id;
  const getSessionLabel = (session: string) => {
    if (session === 'morning') return 'Sáng (07:30)';
    if (session === 'afternoon') return 'Chiều (13:30)';
    return session;
  };
  const getSessionShort = (session: string) => {
    if (!session) return '';
    const s = session.toLowerCase();
    if (s === 'morning' || s.includes('sáng') || s.startsWith('0') || s.startsWith('7') || s.startsWith('8') || s.startsWith('9') || s.startsWith('10') || s.startsWith('11')) return 'Sáng';
    if (s === 'afternoon' || s.includes('chiều') || s.startsWith('1') || s.startsWith('2')) return 'Chiều';
    return session;
  };

  useEffect(() => {
    if (!targetSchool || targetSchool.lat === 0) {
      // Default coordinates
      setUserLat(10.7742);
      setUserLng(106.7025);
      return;
    }

    if (locationSimulation === 'correct') {
      // Near Target school (5 meters difference)
      setUserLat(targetSchool.lat + 0.00003);
      setUserLng(targetSchool.lng - 0.00003);
    } else if (locationSimulation === 'far') {
      // Around 280 meters (outside 100m)
      setUserLat(targetSchool.lat + 0.002);
      setUserLng(targetSchool.lng + 0.001);
    } else {
      // Extreme distance (e.g. 8.4 km away - triggers AI cheat alarm if they simulate jumping)
      setUserLat(10.7100);
      setUserLng(106.6200);
    }
  }, [locationSimulation, selectedScheduleId, targetSchool]);

  useEffect(() => {
    if (selectedSchedule) {
      const shiftScheds = todaySchedules.filter(s => 
        getSessionShort(s.session) === getSessionShort(selectedSchedule.session) && 
        (s.schoolId === selectedSchedule.schoolId || (getSchoolName(s.schoolId, s).trim().toLowerCase() === getSchoolName(selectedSchedule.schoolId, selectedSchedule).trim().toLowerCase())) &&
        !attendance.some(a => a.teacherId === currentTeacher?.id && a.date === todayStr && a.scheduleId === s.id) &&
        !schoolCancellations.some(c => c.teacherId === currentTeacher?.id && c.date === todayStr && (c.scheduleId === s.id || (c.schoolId === s.schoolId && c.classId === s.classId)))
      );
      setSelectedCheckinScheduleIds(shiftScheds.map(s => s.id));
    } else {
      setSelectedCheckinScheduleIds([]);
    }
  }, [selectedScheduleId, todayStr, attendance.length, schoolCancellations.length]);

  // Handle webcam selfie activation
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedImage('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt này không hỗ trợ Camera (hoặc đang mở trong ứng dụng Zalo/Facebook/Telegram). Vui lòng bấm vào biểu tượng la bàn/ba dấu chấm để "Mở bằng Safari" (iPhone) hoặc "Mở bằng Chrome" (Android) để chấm công.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      
      // React DOM might take a tick to mount the <video> element.
      // We check recursively every 50ms until videoRef is ready.
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => {
            console.warn("Video play error:", e);
            customAlert('Lỗi Camera', 'Trình duyệt chặn tính năng tự động phát video của camera.');
          });
        } else {
          setTimeout(attachStream, 50);
        }
      };
      attachStream();
    } catch (err: any) {
      console.error("Webcam error:", err);
      setIsCameraActive(false);
      
      let errMsg = 'Không thể kết nối với Camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Quyền truy cập Camera bị chặn. Vui lòng click vào biểu tượng ổ khóa/cảnh báo ở thanh địa chỉ trình duyệt và chọn "Cho phép (Allow)" Camera.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Không tìm thấy thiết bị Camera (Webcam) trên máy tính/điện thoại này.';
      } else if (err.name === 'SecurityError') {
        errMsg = 'Trình duyệt chặn Camera do trang web bị đánh dấu "Không an toàn/Nguy hiểm".';
      } else {
        errMsg = `Lỗi Camera: ${err.message || err}`;
      }
      
      customAlert('Lỗi Thiết Bị', errMsg);
    }
  };

  const takeSnapshotFromVideo = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 320, 320);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    }
    return null;
  };

  const captureSelfiePhoto = () => {
    const dataUrl = takeSnapshotFromVideo();
    if (dataUrl) {
      setCapturedImage(dataUrl);
      stopCamera();
    } else {
      // Fallback cartoon avatar
      const avatars = [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150"
      ];
      const selectedAvatar = currentTeacher 
        ? avatars[Math.abs(currentTeacher.id.charCodeAt(currentTeacher.id.length - 1)) % avatars.length]
        : avatars[0];
      setCapturedImage(selectedAvatar);
      setIsCameraActive(false);
    }
  };

  const handleSelfieFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 320, 320);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedImage(dataUrl);
          stopCamera();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  // Perform Simulated check-in
  
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      customAlert('Thông báo', 'Trình duyệt của bạn không hỗ trợ thông báo (Push Notifications).');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BP4ox6NYl1dug9LnF3Y2kjl23EE_ruRp3W03du42IFoIjSJa_x8SsFf8r7jb2ReVgkSWqKKkP9IRc3mGYqK4f5c')
          };
          
          let subscription = await reg.pushManager.getSubscription();
          if (!subscription) {
            subscription = await reg.pushManager.subscribe(subscribeOptions);
          }
          
          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: currentTeacher?.id || currentUser?.username || 'unknown',
              subscription
            })
          });
          
          if (response.ok) {
            customAlert('Thông báo', 'Hệ thống thông báo đẩy trên điện thoại đã được kích hoạt thành công!');
          } else {
            console.error('Failed to save push subscription on server');
            customAlert('Thông báo', 'Đã bật thông báo, nhưng lỗi đồng bộ với máy chủ.');
          }
        } else {
          customAlert('Thông báo', 'Trình duyệt không hỗ trợ Service Worker để nhận tin nhắn chạy ngầm.');
        }
      } else {
        customAlert('Thông báo', 'Bạn đã từ chối quyền gửi thông báo.');
      }
    } catch (err: any) {
      console.error('Error enabling push notifications:', err);
      customAlert('Lỗi', `Không thể thiết lập thông báo đẩy: ${err.message}`);
    }
  };

  const handleCheckInNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !targetSchool) {
      customAlert('Thông báo', "Vui lòng chọn ca lịch học muốn điểm danh!");
      return;
    }

    // Measure distance using Haversine formula
    const distance = calculateDistance(userLat, userLng, targetSchool.lat, targetSchool.lng);
    // GPS TEMPORARILY DISABLED BY ADMIN REQUEST
    // const inRange = distance <= 500;

    // if (!inRange) {
    //   customAlert('Thông báo', `KHÔNG THỂ CHẤM CÔNG ❌\nBạn hiện đang ở xa trường ${distance}m (Vượt quá giới hạn cho phép là 500m). Hãy kéo cần gạt GPS giả lập về sát trường để chấm công!`);
    //   return;
    // }

    let finalSelfieImage = capturedImage;

    // Tự động chụp nếu camera đang bật mà giáo viên chưa nhấn nút "Bấm Chụp Ảnh"
    if (!finalSelfieImage && isCameraActive) {
      const autoSnapped = takeSnapshotFromVideo();
      if (autoSnapped) {
        finalSelfieImage = autoSnapped;
        setCapturedImage(autoSnapped);
        stopCamera();
      }
    }

    if (settings?.requireSelfieCheckIn !== false && !finalSelfieImage) {
      customAlert('Thông báo', "❌ YÊU CẦU BẮT BUỘC: Bạn hãy nhấn 'Kích Hoạt Camera' (hoặc 'Tải Ảnh') để chụp ảnh Selfie xác thực tại trường trước khi nộp chấm công!");
      return;
    }

    // Simulated QR requirement
    const qrScannedCode = scannedQR || targetSchool.qrCodeData;

    // AI Check-in Fraud Detection Engine analysis
    // Detect whether teacher has checked in somewhere far away very recently
    const lastTeacherAttendance = currentTeacher 
      ? [...attendance]
          .filter(a => a.teacherId === currentTeacher.id)
          .sort((a, b) => b.date.localeCompare(a.date) || b.checkInTime.localeCompare(a.checkInTime))[0]
      : undefined;

    let isCheatFlagged = false;
    let cheatReason = '';

    // If simulated coordinate is 'extreme' distance, let's flag as suspicious AI hack 
    // TEMPORARY DISABLED AS ADMIN MENTIONED NO GPS REQUIREMENT FOR NOW
    /*
    if (locationSimulation === 'extreme') {
      isCheatFlagged = true;
      cheatReason = `CẢNH BÁO PHÁT HIỆN GIAN LẬN AI 🤖: Định vị viên của ${currentTeacher.name} lệch hơn 8.4km một cách phi lý so với trường ${targetSchool.name}. Phát hiện khả nghi giả lập vị trí ảo GPS!`;
    }
    */

    // Real-time dynamic dates
    const now = adminOverrideDate ? new Date(adminOverrideDate) : new Date();
    const timeStr = (adminOverrideDate ? new Date() : now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // Create actual ISO date string for today using local time
    const todayStr = adminOverrideDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const isMorning = typeof selectedSchedule.session === 'string' && (selectedSchedule.session.toLowerCase() === 'morning' || selectedSchedule.session.toLowerCase().includes('sáng') || selectedSchedule.session.startsWith('0') || selectedSchedule.session.startsWith('10') || selectedSchedule.session.startsWith('11') || selectedSchedule.session.startsWith('7') || selectedSchedule.session.startsWith('8') || selectedSchedule.session.startsWith('9'));
    
    let limitHour = isMorning ? 7 : 13;
    let limitMinute = 30;
    
    // Parse actual start time (e.g. "09:00", "09h00", "9h", "9h30", "Chiều 15h10", "1h30")
    const cleanSession = String(selectedSchedule.session).toLowerCase();
    const timeMatch = cleanSession.match(/(\d{1,2})[:h](\d{2})?/) || cleanSession.match(/(\d{1,2})\s*h/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      let minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      
      // Convert 12-hour format afternoon times to 24-hour (e.g. 1h30 -> 13:30, 2h -> 14:00)
      if (!isMorning && hour < 12) {
        hour += 12;
      }
      
      limitHour = hour;
      limitMinute = minute;
    }
    
    const realNow = new Date();
    const isLateFlagged = realNow.getHours() > limitHour || (realNow.getHours() === limitHour && realNow.getMinutes() > limitMinute);
    let lateReason = '';
    if (isLateFlagged) lateReason = `Chấm công TRỄ. Giờ vào lớp quy định là ${limitHour.toString().padStart(2, '0')}:${limitMinute.toString().padStart(2, '0')} nhưng chấm lúc ${timeStr}. Tiết học này bị đánh dấu cần duyệt.`;

    const sessionSchedules = todaySchedules
      .filter(s => getSessionShort(s.session) === getSessionShort(selectedSchedule.session) && (s.schoolId === selectedSchedule.schoolId || (getSchoolName(s.schoolId, s).trim().toLowerCase() === getSchoolName(selectedSchedule.schoolId, selectedSchedule).trim().toLowerCase())))
      .filter(s => {
        const cName = getClassName(s.classId).toLowerCase();
        const sName = getSchoolName(s.schoolId, s).toLowerCase();
        if (cName.includes('chuyên môn') || sName.includes('chuyên môn') || cName.includes('họp') || sName.includes('họp')) return false;
        return true;
      });

    // Exclude schedules that already have a selfie photo, but allow manual checkins to be upgraded with photo!
    const availableSchedules = sessionSchedules.filter(s => {
      const existing = attendance.find(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date === todayStr && (a.scheduleId === s.id || (a.schoolId === s.schoolId && a.classId === s.classId)));
      const hasPhoto = existing && (existing.hasSelfie || (existing.selfieImage && existing.selfieImage.length > 50));
      const isCancelled = schoolCancellations.some(c => 
        c.teacherId === currentTeacher.id && 
        c.date === todayStr && 
        (c.scheduleId === s.id || (c.schoolId === s.schoolId && c.classId === s.classId))
      );
      return !hasPhoto && !isCancelled;
    });

    const uncheckedSchedules = availableSchedules.filter(s => 
      selectedCheckinScheduleIds.length > 0 ? selectedCheckinScheduleIds.includes(s.id) : s.id === selectedSchedule.id
    );

    if (uncheckedSchedules.length === 0) {
      customAlert('Thông báo', "Vui lòng chọn ít nhất 1 lớp muốn điểm danh (hoặc các lớp đã được điểm danh / báo nghỉ hết rồi)!");
      setIsCameraActive(false);
      return;
    }

    const targetFlagged = isCheatFlagged || isLateFlagged;
    const targetReason = isCheatFlagged ? cheatReason : lateReason;

    // Filter out existing manual records that will be replaced/upgraded with this new photo check-in
    const existingFilteredAttendance = attendance.filter(a => {
      if (a.teacherId !== currentTeacher.id || a.date !== todayStr) return true;
      const isReplacing = uncheckedSchedules.some(s => s.id === a.scheduleId || (s.schoolId === a.schoolId && s.classId === a.classId));
      return !isReplacing;
    });

    const newLogs: AttendanceLog[] = uncheckedSchedules.map((sched, idx) => {
       return {
         id: `ATT_${Date.now()}_${idx}`,
         date: todayStr,
         scheduleId: sched.id,
         teacherId: currentTeacher.id,
         schoolId: sched.schoolId,
         classId: sched.classId,
         session: sched.session,
         checkInTime: timeStr,
         periods: sched.periods,
         lat: userLat,
         lng: userLng,
         distanceMeter: distance,
         selfieImage: finalSelfieImage,
         hasSelfie: true,
         verificationMethod: scannedQR ? 'BOTH' : 'GPS',
         isVerified: !targetFlagged,
         isFlagged: targetFlagged,
         flagReason: targetReason,
         confirmedByAdmin: !targetFlagged
       };
    });

    onUpdateAttendance([...existingFilteredAttendance, ...newLogs]);

    if (isCheatFlagged) {
      onAddAuditLog(
        'BÁO ĐỘNG AI GIAN LẬN', 
        'Hệ thống AI', 
        `Phát hiện giáo viên ${currentTeacher.name} check-in sai lệch địa giới quy chuẩn tại trường ${targetSchool.name}. Hệ thống đã báo động đỏ lên bảng Admin.`
      );
      onAddNotification(
        '⚠️ Báo động gian lận vị trí!',
        `Xác thực GPS của Cô ${currentTeacher.name} lệch hơn quy định.`,
        'alert',
        currentTeacher.id
      );
      customAlert('Thông báo', "Cảnh báo khẩn cấp 🚨: Định vị GPS của bạn bị lệch quá xa quy định. Báo cáo đã gửi cho Quản lý.");
    } else if (isLateFlagged) {
      onAddAuditLog(
        'Chấm công trễ giờ', 
        currentTeacher.name, 
        `Đã check-in TRỄ lúc ${timeStr} cho lớp ${getClassName(selectedSchedule.classId)}.`
      );
      onAddNotification(
        '⚠️ Giáo viên đi trễ',
        `Giáo viên ${currentTeacher.name} chấm công trễ lúc ${timeStr}.`,
        'warning',
        currentTeacher.id
      );
      customAlert('Thông báo', `Bạn đã chấm công TRỄ (vào lúc ${timeStr}). Giới hạn là ${limitHour.toString().padStart(2, '0')}:${limitMinute.toString().padStart(2, '0')}. Yêu cầu Quản lý duyệt lại.`);
    } else {
      const totalPeriods = uncheckedSchedules.reduce((acc, curr) => acc + curr.periods, 0);
      onAddAuditLog(
        'Chấm công trực tuyến', 
        currentTeacher.name, 
        `Đã điểm danh thành công ${uncheckedSchedules.length} lớp (${totalPeriods} tiết)`
      );
      onAddNotification(
        'Check-in thành công ✓',
        `Giáo viên ${currentTeacher.name} vừa điểm danh ${uncheckedSchedules.length} lớp (${totalPeriods} tiết).`,
        'info',
        currentTeacher.id
      );
      customAlert('Thông báo', `CHẤM CÔNG THÀNH CÔNG RỰC RỠ ☀️\nHệ thống đã tự động ghi nhận điểm danh cho TOÀN BỘ ${uncheckedSchedules.length} lớp học (tổng ${totalPeriods} tiết) của ca ${isMorning ? 'sáng' : 'chiều'} hôm nay. Chúc bạn một buổi dạy vui vẻ!`);
    }

    setMobileTab('home');
    setCapturedImage('');
    setScannedQR('');
  };

  const getPastMissedSessions = () => {
    if (!currentTeacher) return [];

    const missed: Array<{ id: string; date: string; session: string; label: string; reason: string; schedule?: Schedule }> = [];
    
    const pastMonthDate = new Date();
    pastMonthDate.setMonth(pastMonthDate.getMonth() - 1);
    const pastMonthStr = pastMonthDate.toISOString().split('T')[0];
    const todayStrYmd = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    // 1. Get approved leaves
    const approvedLeaves = changes.filter(c => 
      c.teacherId === currentTeacher.id &&
      c.status === 'approved' &&
      c.date >= pastMonthStr &&
      c.date <= todayStrYmd &&
      (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher') &&
      (!c.targetTeacherId || c.targetTeacherId === 'no_substitute')
    );

    approvedLeaves.forEach(c => {
      const [y, m, d] = c.date.split('-');
      const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
      const matchingScheds = schedules.filter(s => s.teacherId === currentTeacher.id && s.dayOfWeek === reqDayOfWeek && getSessionCategory(s.session) === c.session && !s.isDeleted);
      
      if (matchingScheds.length > 0) {
        matchingScheds.forEach(s => {
          const schoolName = getSchoolName(s.schoolId, s);
          const classNameStr = getClassName(s.classId);
          missed.push({
            id: `leave_${c.id}_${s.id}`,
            date: c.date,
            session: c.session,
            label: `${d}/${m}/${y} (${c.session === 'morning' ? 'Sáng' : 'Chiều'}) - ${schoolName} - Lớp ${classNameStr} (Nghỉ phép có đơn)`,
            reason: c.reason,
            schedule: s
          });
        });
      } else {
        missed.push({
          id: `leave_${c.id}`,
          date: c.date,
          session: c.session,
          label: `${d}/${m}/${y} (${c.session === 'morning' ? 'Sáng' : 'Chiều'}) - Nghỉ phép cả buổi`,
          reason: c.reason
        });
      }
    });

    // 2. Scan past 30 days for weekly schedules that have no attendance logs
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (dStr > todayStrYmd) continue;
      
      const dayOfWeek = d.getDay() === 0 ? 8 : d.getDay() + 1;
      const daySchedules = schedules.filter(s => s.teacherId === currentTeacher.id && s.dayOfWeek === dayOfWeek && !s.isDeleted);
      
      daySchedules.forEach(s => {
        const cName = getClassName(s.classId).toLowerCase();
        const sName = getSchoolName(s.schoolId, s).toLowerCase();
        if (cName.includes('chuyên môn') || sName.includes('chuyên môn') || cName.includes('họp') || sName.includes('họp')) return;

        const hasLog = attendance.some(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date === dStr && a.scheduleId === s.id);
        const hasLeave = approvedLeaves.some(c => c.date === dStr && c.session === getSessionCategory(s.session));
        
        if (!hasLog && !hasLeave) {
          const [y, m, dayVal] = dStr.split('-');
          const schoolName = getSchoolName(s.schoolId, s);
          const classNameStr = getClassName(s.classId);
          missed.push({
            id: `missed_${s.id}_${dStr}`,
            date: dStr,
            session: getSessionCategory(s.session),
            label: `${dayVal}/${m}/${y} (${getSessionCategory(s.session) === 'morning' ? 'Sáng' : 'Chiều'}) - ${schoolName} - Lớp ${classNameStr} (Chưa điểm danh)`,
            reason: 'Không có dữ liệu điểm danh',
            schedule: s
          });
        }
      });
    }

    return missed.sort((a, b) => b.date.localeCompare(a.date));
  };

  // Submit Shift Proposal
  const handleRequestShiftChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate || !reqReason) {
      customAlert('Thông báo', "Vui lòng nhập đầy đủ thông tin biểu mẫu phép.");
      return;
    }

    const newReqId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    let targetTeacherIdVal: string | undefined = undefined;
    let finalReason = reqReason;

    if (reqType === 'art_performance') {
      finalReason = `[Số lượng: ${artCount}] - ${reqReason}`;
    } else if (reqType === 'substitute_teacher') {
      if (substituteMode === 'past_leave') {
        targetTeacherIdVal = currentTeacher.id;
        finalReason = `[Tự dạy bù - Giữ chuyên cần] ${reqReason}`;
      } else {
        targetTeacherIdVal = substituteTargetTeacherId || undefined;
      }
    } else if (reqType === 'emergency_swap' || reqType === 'swap_shift') {
      if (emergencySubMode === 'no_substitute') {
        targetTeacherIdVal = 'no_substitute';
        finalReason = `[Đổi ca khẩn cấp - Không có GV thay ca gốc (Giữ chuyên cần)] ${reqReason}`;
      } else {
        targetTeacherIdVal = emergencyTargetTeacherId || undefined;
        finalReason = `[Đổi ca khẩn cấp - Có GV thay ca gốc] ${reqReason}`;
      }
    }

    const newRequest: ChangeRequest = {
      id: newReqId,
      teacherId: currentTeacher.id,
      requestType: reqType,
      date: reqDate,
      session: reqSession,
      originalTeacherId: currentTeacher.id,
      targetTeacherId: targetTeacherIdVal,
      targetScheduleId: (reqType === 'substitute_teacher' && substituteMode === 'past_leave') ? selectedPastLeaveIds.join(',') : undefined,
      reason: finalReason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      proofImage: proofImagePreview || ''
    };

    const typeText = reqType === 'sick_leave' ? 'nghỉ ốm' : 
                     (reqType === 'emergency_swap' || reqType === 'swap_shift') ? 'đổi ca khẩn cấp' : 
                     reqType === 'substitute_teacher' ? 'nhờ người dạy thay' : 'coi văn nghệ';

    onUpdateChanges([...changes, newRequest]);
    onAddAuditLog('Xin nghỉ/đổi ca/dạy thay', currentTeacher.name, `Gửi yêu cầu ${typeText} ngày ${reqDate}.`);
    
    onAddNotification(
      'Yêu cầu duyệt phép mới 📣',
      `${currentTeacher.name} gửi đơn yêu cầu ${typeText} ngày ${reqDate}. Đợi Admin duyệt và xếp giáo viên thế.`,
      'info'
    );

    setReqStatusMessage('Gửi đơn xin thành công! Vui lòng chờ Giám đốc duyệt chốt.');
    setReqReason('');
    setProofImagePreview('');
    setSubstituteMode('regular');
    setSelectedPastLeaveIds([]);
    setEmergencyTargetTeacherId('');
    
    setTimeout(() => {
      setReqStatusMessage('');
      setMobileTab('home');
    }, 2500);
  };

  const handleMakeupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeupDate || !makeupScheduleId || !makeupReason || !currentTeacher) return;

    const sched = schedules.find(s => s.id === makeupScheduleId);
    if (!sched) return;

    const newLog: AttendanceLog = {
      id: `MAKEUP_${Date.now()}`,
      date: makeupDate,
      scheduleId: sched.id,
      teacherId: currentTeacher.id,
      schoolId: sched.schoolId,
      classId: sched.classId,
      session: sched.session,
      checkInTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      periods: sched.periods,
      lat: 0,
      lng: 0,
      distanceMeter: 0,
      selfieImage: '',
      verificationMethod: 'GPS',
      isVerified: false,
      isFlagged: true,
      flagReason: `Điểm danh bù do: ${makeupReason}`,
      confirmedByAdmin: false
    };

    onUpdateAttendance([...attendance, newLog]);
    onAddAuditLog('Gửi đơn điểm danh bù', currentTeacher.name, `Gửi yêu cầu điểm danh bù cho ngày ${makeupDate} (${makeupReason})`);
    onAddNotification(
      '📥 Yêu cầu điểm danh bù mới',
      `${currentTeacher.name} gửi đơn báo cáo điểm danh bù cho ca ngày ${makeupDate}. Lý do: ${makeupReason}`,
      'info'
    );

    customAlert('Thông báo', "Đã gửi đơn báo cáo điểm danh bù! Vui lòng chờ Giám đốc hoặc Quản lý phê duyệt.");
    setShowMakeupForm(false);
    setMakeupDate('');
    setMakeupScheduleId('');
    setMakeupReason('');
  };

  // Monthly compiled wallet details for the logged-in teacher
  const reportDate = new Date();
  const reportMonth = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
  const reportMonthDisplay = `${String(reportDate.getMonth() + 1).padStart(2, '0')}/${reportDate.getFullYear()}`;
  const thisMonthLogs = currentTeacher ? attendance.filter(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date.startsWith(reportMonth) && (a.confirmedByAdmin || a.isVerified || !a.isFlagged)) : [];
  
  // Find substitute logs
  const groups: Record<string, AttendanceLog[]> = {};
  thisMonthLogs.forEach(l => {
    if (!l || !l.date) return;
    const key = l.date + '_' + getSessionCategory(l.session);
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  let regularPeriods = 0;
  let substitutePeriods = 0;

  Object.values(groups).forEach(group => {
    let regSum = 0;
    let subSum = 0;
    group.forEach(l => {
      const sched = schedules.find(s => s && s.id === l.scheduleId)
        || schedules.find(s => s && !s.isDeleted && s.teacherId === currentTeacher?.id && l.schoolId && l.classId && s.schoolId === l.schoolId && s.classId === l.classId)
        || schedules.find(s => s && !s.isDeleted && l.schoolId && l.classId && s.schoolId === l.schoolId && s.classId === l.classId);
      const p = (sched && sched.periods !== undefined && sched.periods !== null) ? Number(sched.periods) : (Number(l?.periods) || 1);
      const isSub = sched && sched.teacherId && sched.teacherId !== currentTeacher?.id;
      if (isSub) subSum += p;
      else regSum += p;
    });

    const sessionTotal = regSum + subSum;
    if (sessionTotal === 0) return;

    if (sessionTotal === 1) {
      if (subSum > 0) substitutePeriods += 2;
      else regularPeriods += 2;
    } else if (sessionTotal === 2) {
      if (subSum === 2) substitutePeriods += 2.5;
      else if (regSum === 2) regularPeriods += 2.5;
      else {
        substitutePeriods += subSum;
        regularPeriods += (regSum + 0.5);
      }
    } else {
      regularPeriods += regSum;
      substitutePeriods += subSum;
    }
  });
  
  let bonusPeriodsDict: Record<string, number> = {};
  try { if (currentTeacher?.bonusPeriodsJSON) bonusPeriodsDict = JSON.parse(currentTeacher.bonusPeriodsJSON); } catch(e) {}
  const currentBonusPeriods = bonusPeriodsDict[reportMonth] || 0;

  // Hỗ trợ trường nghỉ (Tới nơi mới báo): chuẩn hóa theo ca dạy (mỗi ca tối đa +1 tiết)
  const arrivedSessionSet = new Set<string>();
  if (currentTeacher) {
    (schoolCancellations || []).forEach(c => {
      if (c && c.teacherId === currentTeacher.id && c.date && typeof c.date === 'string' && c.date.startsWith(reportMonth) && c.cancellationType === 'arrived') {
        const sessCat = getSessionCategory(c.session);
        arrivedSessionSet.add(`${c.date}_${c.schoolId}_${sessCat}`);
      }
    });
  }
  const schoolClosedArrivedPeriods = arrivedSessionSet.size;

  const totalVerifiedSchedules = regularPeriods + substitutePeriods + currentBonusPeriods + schoolClosedArrivedPeriods;
  
  const SUB_HOURLY_RATE = 55000;
  const regularWagesEarned = currentTeacher ? (regularPeriods + currentBonusPeriods + schoolClosedArrivedPeriods) * currentTeacher.hourlyRate : 0;
  const substituteWagesEarned = getSubstituteWages(substitutePeriods, SUB_HOURLY_RATE); // simple calc
  const totalWagesEarned = regularWagesEarned + substituteWagesEarned;
  
  // Helper to allow referencing avoiding TS errors
  function getSubstituteWages(periods: number, rate: number) { return periods * rate; }
  
  let attendanceOverrideDict: Record<string, 'granted' | 'revoked'> = {};
  try {
    if (currentTeacher?.attendanceBonusOverrideJSON) {
      attendanceOverrideDict = JSON.parse(currentTeacher.attendanceBonusOverrideJSON);
    }
  } catch(e) {}
  const overrideStatus = attendanceOverrideDict[reportMonth];

  // Áp dụng Phụ cấp xăng xe (500k) và Phụ cấp chuyên cần (300k - mất nếu nghỉ ốm hoặc nhờ người dạy thay)
  const hasApprovedLeave = currentTeacher ? changes.some(c => {
    if (!c || c.teacherId !== currentTeacher.id || c.status !== 'approved' || !c.date || typeof c.date !== 'string' || !c.date.startsWith(reportMonth)) return false;
    if (c.requestType === 'art_performance') return false;

    const reasonLower = (c.reason || '').toLowerCase();
    const adminNotesLower = (c.adminNotes || '').toLowerCase();

    // 1. Trường báo nghỉ -> Giữ chuyên cần (bỏ qua, không phạt)
    const isSchoolCancelled = 
      c.requestType === 'school_closed' ||
      reasonLower.includes('trường báo nghỉ') || 
      reasonLower.includes('trường nghỉ') || 
      reasonLower.includes('nhà trường nghỉ') || 
      reasonLower.includes('nhà trường cho nghỉ') || 
      reasonLower.includes('trường đóng cửa') || 
      reasonLower.includes('trường hoãn') || 
      reasonLower.includes('nghỉ lễ') || 
      reasonLower.includes('lễ khai giảng') || 
      reasonLower.includes('bù nghỉ lễ') ||
      adminNotesLower.includes('trường báo nghỉ') ||
      adminNotesLower.includes('trường nghỉ');
    if (isSchoolCancelled) return false;

    // 2. Có đơn xin tự dạy bù cho đủ tiết -> Giữ chuyên cần (bỏ qua, không phạt)
    const isSelfMakeup = 
      c.targetTeacherId === currentTeacher.id ||
      adminNotesLower.includes('tự dạy bù') ||
      adminNotesLower.includes('giữ chuyên cần') ||
      ((reasonLower.includes('tự dạy bù') || reasonLower.includes('dạy bù') || reasonLower.includes('giữ chuyên cần')) && 
       (!c.targetTeacherId || c.targetTeacherId === currentTeacher.id || c.targetTeacherId === 'no_substitute'));
    if (isSelfMakeup) return false;

    // Tất cả các trường hợp nghỉ khác (nghỉ ốm, việc riêng, nhờ người dạy thay...) ĐỀU CẮT CHUYÊN CẦN
    return true;
  }) : false;
  const artEvents = currentTeacher ? changes.filter(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance') : [];
  let artPerformanceBonus = 0;
  artEvents.forEach(c => {
    const match = c.reason.match(/\[Số lượng: (\d+)\]/);
    if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
    else artPerformanceBonus += 100000;
  });

  const currentAllowance = currentTeacher ? (currentTeacher.monthlyAllowance || 500000) : 0;
  const potentialBonus = currentTeacher ? (currentTeacher.bonus || 300000) : 0;

  let isAttendanceBonusGranted = !hasApprovedLeave;
  if (overrideStatus === 'granted') isAttendanceBonusGranted = true;
  else if (overrideStatus === 'revoked') isAttendanceBonusGranted = false;

  const currentBonus = currentTeacher ? (isAttendanceBonusGranted ? potentialBonus : 0) + artPerformanceBonus : 0;

  const netEarnings = currentTeacher ? totalWagesEarned + currentAllowance + currentBonus - currentTeacher.deduction : 0;

  // DYNAMIC CALENDAR-BASED KPI CALCULATION (Thời khóa biểu chuẩn × Số ngày trong tháng)
  const reportYear = reportDate.getFullYear();
  const reportMonthIndex = reportDate.getMonth();
  const daysInCurrentMonth = new Date(reportYear, reportMonthIndex + 1, 0).getDate();
  const todayDayNumber = reportDate.getDate();

  // Active regular schedules for this teacher
  const teacherActiveSchedules = currentTeacher 
    ? schedules.filter(s => !s.isDeleted && s.teacherId === currentTeacher.id) 
    : [];

  // Group schedules by dayOfWeek to find standard periods per dayOfWeek
  const dayOfWeekScheduleSummary: Record<number, { dayLabel: string; count: number; periodsPerDay: number; totalPeriods: number }> = {
    2: { dayLabel: 'Thứ 2', count: 0, periodsPerDay: 0, totalPeriods: 0 },
    3: { dayLabel: 'Thứ 3', count: 0, periodsPerDay: 0, totalPeriods: 0 },
    4: { dayLabel: 'Thứ 4', count: 0, periodsPerDay: 0, totalPeriods: 0 },
    5: { dayLabel: 'Thứ 5', count: 0, periodsPerDay: 0, totalPeriods: 0 },
    6: { dayLabel: 'Thứ 6', count: 0, periodsPerDay: 0, totalPeriods: 0 },
    7: { dayLabel: 'Thứ 7', count: 0, periodsPerDay: 0, totalPeriods: 0 },
    8: { dayLabel: 'Chủ Nhật', count: 0, periodsPerDay: 0, totalPeriods: 0 },
  };

  for (let dow = 2; dow <= 8; dow++) {
    const daySchedules = teacherActiveSchedules.filter(s => s.dayOfWeek === dow);
    const sessionGroups: Record<string, Schedule[]> = {};
    daySchedules.forEach(s => {
      const sessCat = getSessionCategory(s.session);
      if (!sessionGroups[sessCat]) sessionGroups[sessCat] = [];
      sessionGroups[sessCat].push(s);
    });

    let dayPeriods = 0;
    Object.values(sessionGroups).forEach(group => {
      let sessSum = group.reduce((acc, curr) => {
        return acc + ((curr.periods !== undefined && curr.periods !== null) ? Number(curr.periods) : 1);
      }, 0);
      if (sessSum === 1) sessSum = 2;
      else if (sessSum === 2) sessSum = 2.5;
      dayPeriods += sessSum;
    });
    dayOfWeekScheduleSummary[dow].periodsPerDay = dayPeriods;
  }

  // Iterate every day in the month (e.g. 28, 29, 30, 31 days)
  let monthlyScheduleTotalPeriods = 0;
  let scheduledUpToTodayPeriods = 0;
  const weeklyScheduledTarget: number[] = [0, 0, 0, 0, 0];

  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dObj = new Date(reportYear, reportMonthIndex, day);
    const dOfWeek = dObj.getDay() === 0 ? 8 : dObj.getDay() + 1; // 2=T2, ..., 8=CN
    dayOfWeekScheduleSummary[dOfWeek].count += 1;

    const dayP = dayOfWeekScheduleSummary[dOfWeek].periodsPerDay;
    monthlyScheduleTotalPeriods += dayP;
    if (day <= todayDayNumber) {
      scheduledUpToTodayPeriods += dayP;
    }

    if (day <= 7) weeklyScheduledTarget[0] += dayP;
    else if (day <= 14) weeklyScheduledTarget[1] += dayP;
    else if (day <= 21) weeklyScheduledTarget[2] += dayP;
    else if (day <= 28) weeklyScheduledTarget[3] += dayP;
    else weeklyScheduledTarget[4] += dayP;
  }

  // Multiply count by periodsPerDay for summary
  for (let dow = 2; dow <= 8; dow++) {
    dayOfWeekScheduleSummary[dow].totalPeriods = dayOfWeekScheduleSummary[dow].count * dayOfWeekScheduleSummary[dow].periodsPerDay;
  }

  const kpiMonthlyTarget = monthlyScheduleTotalPeriods;
  const kpiProgressPct = kpiMonthlyTarget > 0 ? Math.min(200, Math.round((totalVerifiedSchedules / kpiMonthlyTarget) * 100)) : 0;
  const kpiRemainingPeriods = Math.max(0, kpiMonthlyTarget - totalVerifiedSchedules);

  // Group verified attendance by week in the current month
  const weeklyDistribution: { weekLabel: string; periods: number }[] = [
    { weekLabel: 'Tuần 1 (1-7)', periods: 0 },
    { weekLabel: 'Tuần 2 (8-14)', periods: 0 },
    { weekLabel: 'Tuần 3 (15-21)', periods: 0 },
    { weekLabel: 'Tuần 4 (22-28)', periods: 0 },
    { weekLabel: 'Tuần 5 (29+)', periods: 0 },
  ];

  thisMonthLogs.forEach(log => {
    const day = parseInt(log.date.split('-')[2], 10);
    const p = Number(log.periods) || 1;
    if (day <= 7) weeklyDistribution[0].periods += p;
    else if (day <= 14) weeklyDistribution[1].periods += p;
    else if (day <= 21) weeklyDistribution[2].periods += p;
    else if (day <= 28) weeklyDistribution[3].periods += p;
    else weeklyDistribution[4].periods += p;
  });

  // Group by school
  const schoolDistributionMap = new Map<string, number>();
  thisMonthLogs.forEach(log => {
    const sName = getSchoolName(log.schoolId, log);
    const p = Number(log.periods) || 1;
    schoolDistributionMap.set(sName, (schoolDistributionMap.get(sName) || 0) + p);
  });
  const schoolDistribution = Array.from(schoolDistributionMap.entries()).map(([name, periods]) => ({ name, periods }));

  // Helper: Client-side compression for proof image
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((e.target?.result as string) || '');
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          resolve(compressedBase64);
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleProofImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressingProof(true);
      try {
        const compressed = await compressImageFile(file);
        setProofImagePreview(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
      } finally {
        setIsCompressingProof(false);
      }
    }
  };

  if (!currentTeacher) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm border border-blue-100 animate-pulse">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Đang đồng bộ hồ sơ giáo viên...</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
          {teachers.length === 0 
            ? 'Hệ thống đang tải dữ liệu danh sách giáo viên từ máy chủ, vui lòng đợi trong giây lát...' 
            : `Đang kết nối tài khoản (${currentUser?.username || 'Chưa rõ'}) với hồ sơ giáo viên Cầu Vồng.`}
        </p>

        <div className="flex flex-col gap-2.5 mt-6 w-full max-w-xs">
          <button
            onClick={() => {
              try { localStorage.removeItem('etms_is_wiped'); } catch {}
              window.location.reload();
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại dữ liệu ngay</span>
          </button>

          <button
            onClick={() => {
              try { localStorage.removeItem('etms_current_user'); } catch {}
              window.location.href = '/';
            }}
            className="w-full py-2.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-4xl mx-auto bg-slate-50 relative flex flex-col overflow-hidden text-slate-800 select-none shadow-xl border-x border-slate-200">
      
      {/* Screen Content Scrollable Wrapper */}
      <div className="w-full h-full flex flex-col justify-between relative">
        
        {/* Header Bar */}
          <div className="px-6 py-4 flex justify-between items-center text-sm font-bold text-neutral-900 bg-white border-b border-neutral-200 z-30 shrink-0 shadow-sm relative">
            {!isRestrictedView ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Giáo viên:</span>
                <select 
                  className="bg-slate-100 border border-slate-200 rounded px-2 py-1 outline-none font-semibold text-blue-700 max-w-[150px] sm:max-w-xs truncate"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                >
                  {allowedTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span>Giáo viên: {currentTeacher?.name || '---'}</span>
            )}
            <div className="flex items-center gap-2">
              {currentUser?.role === 'admin' && (
                <div className="flex items-center gap-1.5 mr-2">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <input
                    type="date"
                    value={adminOverrideDate}
                    onChange={(e) => setAdminOverrideDate(e.target.value)}
                    className="p-1 border border-neutral-200 rounded text-[10px] font-medium outline-none bg-slate-100 text-slate-600 focus:bg-white focus:border-blue-300"
                    title="Đổi ngày giả lập (Admin)"
                  />
                  {adminOverrideDate && (
                    <button onClick={() => setAdminOverrideDate('')} className="text-red-500 hover:text-red-700 p-1 rounded-full bg-red-50" title="Xoá ngày giả lập">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Trực tuyến</span>
            </div>
          </div>

          {/* INTERNAL ROUTED VIEWS BODY */}
          <div 
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4 font-sans relative" 
            id="iphone_screen_body"
            style={{ 
              backgroundColor: '#f8fafc',
                backgroundAttachment: 'local'
            }}
          >
            
            <div className="relative z-10 space-y-4">
            {!currentTeacher ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 my-auto animate-fadeIn">
                <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                  <User className="h-10 w-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Không tìm thấy Hồ Sơ</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Hệ thống chưa ghi nhận hồ sơ giáo viên nào sau khi làm sạch. Vui lòng thêm giáo viên mới ở mục <strong>"Hồ Sơ & Thù Lao"</strong> của Web Admin trước khi bắt đầu mô phỏng điện thoại.
                  </p>
                </div>
              </div>
            ) : (
              <>

            {/* TAB: MOBILE HOME / PORTAL */}
            {mobileTab === 'home' && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Banner & Modal Khảo Sát Bình Chọn Tiệc 20/11 (Đặt Phòng VIP) */}
                <TeacherDayPollModal 
                  teacherId={currentTeacher?.id || currentUser?.teacherId}
                  teacherName={currentTeacher?.name || currentUser?.username}
                  isSelf={true}
                />

                {changes.filter(c => c.teacherId === currentTeacher.id && c.status === 'rejected').length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex gap-3 items-start animate-pulse">
                    <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-700">Đơn xin nghỉ bị từ chối</h4>
                      <p className="text-[10px] text-rose-600 mt-0.5">Một hoặc nhiều đơn xin phép của bạn đã không được duyệt. Vui lòng kiểm tra lại lịch để đảm bảo công tác.</p>
                    </div>
                  </div>
                )}

                {/* Sub Tab Navigation */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button 
                    onClick={() => setHomeSubTab('overview')}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg font-bold transition ${homeSubTab === 'overview' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:bg-slate-200/50'}`}
                  >
                    Tổng Quan Làm Việc
                  </button>
                  <button 
                    onClick={() => setHomeSubTab('history')}
                    className={`flex-1 py-1.5 text-[11px] rounded-lg font-bold transition ${homeSubTab === 'history' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:bg-slate-200/50'}`}
                  >
                    Lịch Sử Điểm Danh
                  </button>
                </div>

                {homeSubTab === 'overview' ? (
                  <>
                    {/* Personalized Greeting */}
                    <div className="mb-2 px-1">
                      <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                        {new Date().getHours() < 12 ? 'Chào buổi sáng' : new Date().getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'}, {currentTeacher.name.split(' ').pop()}! 👋
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng.</p>
                    </div>

                    {upcomingSubRequests.length > 0 && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-3xl p-4 flex gap-3 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <Bell className="w-20 h-20 text-amber-550" />
                        </div>
                        <div className="p-2 bg-amber-100 rounded-2xl text-amber-700 shrink-0 self-start">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 relative z-10">
                          <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                            🔔 LỊCH DẠY THAY CHƯA CHẤM CÔNG
                          </h4>
                          <p className="text-[11px] text-amber-850 leading-relaxed">
                            Bạn được phân công dạy thay vào các ngày sau:
                          </p>
                          <ul className="text-[11px] text-amber-900 font-semibold space-y-1 list-disc list-inside mt-1 font-mono">
                            {upcomingSubRequests.map((req, idx) => {
                              const origName = teachers.find(t => t.id === req.originalTeacherId || t.id === req.teacherId)?.name || 'Đồng nghiệp';
                              return (
                                <li key={req.id || idx}>
                                  Ngày {req.date} ({req.session === 'morning' ? 'Sáng' : 'Chiều'}) - Dạy thay: {origName}
                                </li>
                              );
                            })}
                          </ul>
                          <p className="text-[10px] text-amber-600 italic mt-2">
                            Vui lòng kiểm tra tab <span className="font-bold underline">"Dạy Dùm"</span> để xem chi tiết lịch học và tab <span className="font-bold underline">"Định vị"</span> để chấm công đúng vị trí.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Teacher Profile Card with beautiful badge */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 font-bold font-mono text-8xl">GV</div>
                      <div>
                        <span className="text-[10px] bg-white/20 text-white font-mono px-2 py-0.5 rounded-full font-bold">MÃ SỐ: {currentTeacher.id}</span>
                        <h3 className="text-lg font-bold mt-1 tracking-tight">{currentTeacher.name}</h3>
                        <p className="text-[10px] text-white/70 italic mt-0.5">{currentTeacher.notes}</p>
                      </div>

                      <div className="border-t border-white/15 pt-3 grid grid-cols-2 gap-2 text-xs font-mono text-white/90">
                        <div>
                          <p className="text-[9px] text-white/50 font-sans">ĐƠN GIÁ TIẾT DẠY</p>
                          <p className="font-bold">{currentTeacher.hourlyRate.toLocaleString('vi-VN')} đ</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-white/50 font-sans">PHỤ CẤP THÁNG</p>
                          <p className="font-bold">{currentTeacher.monthlyAllowance.toLocaleString('vi-VN')} đ</p>
                        </div>
                      </div>
                    </div>

                    {/* TEACHER KPI & MONTHLY TEACHING PROGRESS CARD */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3.5 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight">TIẾN ĐỘ KPI GIẢNG DẠY</h4>
                            <span className="text-[10px] text-slate-400 font-mono">Tháng {reportMonthDisplay} ({daysInCurrentMonth} ngày)</span>
                          </div>
                        </div>

                        {/* Automatic Dynamic KPI Badge */}
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Chỉ tiêu theo TKB</span>
                          <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                            {kpiMonthlyTarget} tiết
                          </span>
                        </div>
                      </div>

                      {/* Main Progress Bar & Counter */}
                      <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold font-mono text-slate-900">{totalVerifiedSchedules}</span>
                            <span className="text-xs font-semibold text-slate-400">/ {kpiMonthlyTarget} tiết kế hoạch</span>
                          </div>
                          <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-full ${
                            kpiProgressPct >= 100 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : kpiProgressPct >= 60 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {kpiProgressPct}%
                          </span>
                        </div>

                        {/* Animated Visual Bar */}
                        <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden p-0.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              kpiProgressPct >= 100 
                                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400' 
                                : kpiProgressPct >= 60 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-500' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-400'
                            }`}
                            style={{ width: `${Math.min(100, kpiProgressPct)}%` }}
                          />
                        </div>

                        {/* Progress Status & Comparison to Day-of-Month Schedule */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[10px] text-slate-500 pt-0.5 gap-0.5">
                          <span>
                            {kpiProgressPct >= 100 ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" /> Xuất sắc! Vượt toàn bộ chỉ tiêu TKB tháng (+{totalVerifiedSchedules - kpiMonthlyTarget} tiết)
                              </span>
                            ) : (
                              <span>
                                Đến ngày {todayDayNumber}/{reportMonthDisplay}: Kế hoạch <b>{scheduledUpToTodayPeriods}t</b>
                                {totalVerifiedSchedules >= scheduledUpToTodayPeriods ? (
                                  <span className="text-emerald-600 font-bold ml-1">✓ Đạt tiến độ</span>
                                ) : (
                                  <span className="text-amber-600 font-bold ml-1">(Chậm {scheduledUpToTodayPeriods - totalVerifiedSchedules}t)</span>
                                )}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-slate-400">Dự kiến thù lao: {netEarnings.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>

                      {/* 3 Mini KPI Badges */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className={`p-2 rounded-2xl border flex flex-col items-center justify-center gap-0.5 ${
                          !hasApprovedLeave ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800' : 'bg-rose-50/70 border-rose-100 text-rose-700'
                        }`}>
                          <Award className="w-3.5 h-3.5" />
                          <span className="font-bold">{!hasApprovedLeave ? '100% Chuyên Cần' : 'Mất Chuyên Cần'}</span>
                          <span className="text-[8px] opacity-75">{!hasApprovedLeave ? '+300.000 đ' : 'Có đơn nghỉ'}</span>
                        </div>

                        <div className="p-2 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-800 flex flex-col items-center justify-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="font-bold">{substitutePeriods > 0 ? `+${substitutePeriods}t Dạy Thay` : '0t Dạy Thay'}</span>
                          <span className="text-[8px] opacity-75">{substitutePeriods > 0 ? `+${substituteWagesEarned.toLocaleString('vi-VN')} đ` : 'Hỗ trợ lớp'}</span>
                        </div>

                        <div className="p-2 rounded-2xl bg-purple-50/70 border border-purple-100 text-purple-800 flex flex-col items-center justify-center gap-0.5">
                          <Building className="w-3.5 h-3.5" />
                          <span className="font-bold">{schoolDistribution.length} Điểm Trường</span>
                          <span className="text-[8px] opacity-75">{regularPeriods}t chính ngạch</span>
                        </div>
                      </div>

                      {/* Expandable Mini Charts & TKB Calculation Breakdown */}
                      <div className="pt-1">
                        <button
                          onClick={() => setShowKpiDetails(!showKpiDetails)}
                          className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-semibold flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> 
                            {showKpiDetails ? 'Thu gọn chi tiết tính KPI' : 'Xem chi tiết cách tính KPI theo lịch dạy'}
                          </span>
                          {showKpiDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {showKpiDetails && (
                          <div className="mt-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-150 space-y-3.5 animate-fadeIn text-[11px]">
                            {/* Breakdown of Days × Periods in this specific month */}
                            <div>
                              <span className="font-bold text-slate-700 block mb-1.5 text-[10px] uppercase flex items-center justify-between">
                                <span>🗓️ Lịch phân công theo thứ (Tháng {reportMonthDisplay}):</span>
                                <span className="font-mono text-indigo-600 font-bold">{daysInCurrentMonth} ngày</span>
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                {([2, 3, 4, 5, 6, 7, 8] as const).map(dow => {
                                  const item = dayOfWeekScheduleSummary[dow];
                                  if (!item || item.periodsPerDay === 0) return null;
                                  return (
                                    <div key={dow} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                                      <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-slate-800">{item.dayLabel}</span>
                                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded font-mono">{item.count} ngày</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        {item.periodsPerDay}t/buổi × {item.count} = <b className="text-slate-800 font-bold">{item.totalPeriods}t</b>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Weekly Distribution Chart with comparison */}
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="font-bold text-slate-700 block mb-1.5 text-[10px] uppercase">
                                📊 Tiến độ thực tế so với kế hoạch từng tuần:
                              </span>
                              <div className="grid grid-cols-5 gap-1.5">
                                {weeklyDistribution.map((w, idx) => (
                                  <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200/80 text-center shadow-xs flex flex-col justify-between">
                                    <span className="text-[9px] text-slate-400 font-mono block">T{idx + 1}</span>
                                    <span className="text-sm font-extrabold font-mono text-indigo-700 my-0.5">{w.periods}t</span>
                                    <span className="text-[8px] text-slate-400 truncate">Kế hoạch: {weeklyScheduledTarget[idx]}t</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* School Distribution List */}
                            {schoolDistribution.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <span className="font-bold text-slate-700 block mb-1 text-[10px] uppercase">
                                  🏫 Phân bổ tiết theo điểm trường:
                                </span>
                                <div className="space-y-1">
                                  {schoolDistribution.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-1.5 bg-white rounded-lg border border-slate-100">
                                      <span className="text-slate-700 font-medium truncate max-w-[200px]">{item.name}</span>
                                      <span className="font-mono font-bold text-blue-700 text-[10px] shrink-0 bg-blue-50 px-1.5 py-0.5 rounded">
                                        {item.periods} tiết
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TODAY LESSONS FEED HIGHLIGHT */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-neutral-400 tracking-wider font-mono">LỊCH DẠY CỦA BẠN HÔM NAY (THỨ {currentDayOfWeek})</h4>
                      
                      <div className="space-y-2.5">
                        {todaySchedules.map(sc => {
  const isCheckedIn = attendance.some(a => 
    !(a as any).isDeleted && 
    a.teacherId === currentTeacher.id && 
    a.date === todayStr && 
    (
      a.scheduleId === sc.id || 
      (a.schoolId === sc.schoolId && a.classId === sc.classId) || 
      (!a.scheduleId && !a.classId && a.schoolId === sc.schoolId && getSessionCategory(a.session) === getSessionCategory(sc.session))
    )
  );
  const cancellation = schoolCancellations.find(c => 
    c.teacherId === currentTeacher.id && 
    c.date === todayStr && 
    (
      c.scheduleId === sc.id || 
      (c.schoolId === sc.schoolId && c.classId === sc.classId) || 
      (!c.scheduleId && !c.classId && c.schoolId === sc.schoolId && getSessionCategory(c.session) === getSessionCategory(sc.session))
    )
  );
  const isCanceled = !!cancellation;
  return (
    <div 
      key={sc.id} 
      className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm ${
        isCanceled 
          ? 'bg-sky-50/80 border-sky-200 shadow-xs' 
          : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-150'
      }`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-neutral-800">Thứ {sc.dayOfWeek}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
            sc.session === 'morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
          }`}>
            {getSessionShort(sc.session).toUpperCase()}
          </span>
          {isCanceled && (
            <span className="text-[9px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
              {cancellation.cancellationType === 'arrived' ? '🏫 Tới nơi mới báo (+1t)' : '🏫 Trường báo nghỉ (Rảnh ca)'}
            </span>
          )}
        </div>
        <p className="font-bold text-slate-900 text-sm">{getClassName(sc.classId)}</p>
        <p className="text-[11px] text-neutral-500 truncate max-w-44">{getSchoolName(sc.schoolId, sc)}</p>
        {isCanceled && (
          <div className="mt-1 p-2 bg-white/80 border border-sky-150 rounded-xl space-y-0.5">
            {cancellation.reason && (
              <p className="text-[10px] text-slate-700 font-medium">
                <span className="font-bold text-slate-500">Lý do:</span> {cancellation.reason}
              </p>
            )}
            <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <span>✨</span> Lịch ca này đang TRỐNG (RẢNH) - Sẵn sàng nhận điều phối dạy bù/thay.
            </p>
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <span className="text-[10px] font-mono text-neutral-400 block font-bold mb-1">Số tiết: {sc.periods}t</span>
        {isCheckedIn ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            ✓ Đã chấm
          </span>
        ) : isCanceled ? (
          <div className="flex flex-col gap-1.5 items-end">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border block ${
              cancellation.cancellationType === 'arrived' 
                ? 'text-orange-700 bg-orange-50 border-orange-200' 
                : 'text-sky-800 bg-sky-50 border-sky-200'
            }`}>
              {cancellation.cancellationType === 'arrived' ? '🏫 Trường nghỉ (+1t)' : '🏫 Rảnh Ca (Trường nghỉ)'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCancelSchoolClosed(cancellation.id, sc);
              }}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold py-1 px-2.5 rounded-xl text-[10px] transition cursor-pointer active:scale-95 flex items-center gap-1 shadow-xs"
              title="Khôi phục ca dạy nếu trường học lại bình thường hoặc bấm nhầm"
            >
              <RotateCcw className="w-3 h-3" /> Hủy báo nghỉ (Dạy lại)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 items-end">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedScheduleId(sc.id);
                setMobileTab('checkin');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-1.5 px-3 rounded-xl text-[10px] transition w-24 text-center block cursor-pointer active:scale-95 shadow-xs"
            >
              Điểm Danh
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenSchoolClosedModal(sc);
              }}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-1.5 px-3 rounded-xl text-[10px] transition w-24 text-center block cursor-pointer active:scale-95 shadow-xs"
            >
              Trường Nghỉ
            </button>
          </div>
        )}
      </div>
    </div>
  );
})}

                        
                {isTeacherJoined ? (
                  <div className="w-full bg-emerald-50 text-emerald-700 p-2.5 rounded-2xl border border-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1.5 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>BẠN ĐÃ BẬT CHUÔNG NHẮC LỊCH MESSENGER</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <a 
                      href="https://m.me/tuyendungmamnonTPHCM?ref=BAT_THONG_BAO" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (currentTeacher?.id) {
                          fetch(`/api/teachers/${currentTeacher.id}/joined-notification`, { method: 'POST' }).catch(() => {});
                          currentTeacher.notificationToken = 'ACTIVATED_20261026';
                        }
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-2.5 rounded-2xl text-[11px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all text-center animate-pulse"
                    >
                      <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" /> BẬT CHUÔNG NHẮC LỊCH MESSENGER (1 CHẠM)
                    </a>
                    <button onClick={handleEnableNotifications} className="w-full bg-amber-50 text-amber-700 p-2.5 rounded-2xl border border-amber-100 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1">
                      <Bell className="w-3 h-3" /> BẬT THÔNG BÁO APP
                    </button>
                  </div>
                )}

                        {todaySchedules.length === 0 && (
                          <div className="text-center py-6 text-neutral-450 border border-wrap border-neutral-100 rounded-3xl p-4">
                            <p className="text-xs text-neutral-400">Bạn chưa có lịch dạy nào trong hôm nay. Nghỉ ngơi nhé!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RECENT CHECKINS LOGGER */}
                    <div className="bg-slate-55 p-4 rounded-3xl border border-blue-100 space-y-2.5 bg-blue-50/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-extrabold text-blue-800 flex items-center gap-1">
                          NHẬT KÝ ĐIỂM DANH HÔM NAY
                        </span>
                      </div>
                      
                      {attendance.filter(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date === todayStr).length === 0 ? (
                         <div className="text-[10px] text-blue-600/60 font-medium">Chưa có lượt điểm danh nào được ghi nhận.</div>
                      ) : (
                         <div className="space-y-1.5">
                            {attendance.filter(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date === todayStr).map((att, i) => (
                              <div key={i} className="flex justify-between items-center text-[10px] bg-white p-2 rounded-xl border border-blue-50">
                                <div>
                                  <span className="font-bold text-slate-800">{getSchoolName(att.schoolId, att)}</span>
                                  <span className="text-slate-500 block">Lớp: {getClassName(att.classId)} ({att.periods} tiết)</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-600">{att.checkInTime}</span>
                              </div>
                            ))}
                         </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                       <h3 className="font-bold text-sm text-slate-800">Lịch sử điểm danh</h3>
                       <button 
                         onClick={() => setShowMakeupForm(!showMakeupForm)}
                         className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                       >
                         {showMakeupForm ? 'Hủy' : '+ Đơn Điểm Danh Bù'}
                       </button>
                    </div>

                    {showMakeupForm && (
                      <form onSubmit={handleMakeupSubmit} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Ngày dạy bù</label>
                          <input type="date" value={makeupDate} onChange={e => setMakeupDate(e.target.value)} required className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Chọn lịch</label>
                          <select value={makeupScheduleId} onChange={e => setMakeupScheduleId(e.target.value)} required className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white">
                             <option value="">-- Chọn lịch --</option>
                             {schedules.filter(s => {
                               if (s.isDeleted || s.teacherId !== currentTeacher.id) return false;
                               const cName = (classes.find(c => c.id === s.classId)?.name || s.classId).toLowerCase();
                               const sName = (schools.find(sc => sc.id === s.schoolId)?.name || s.schoolId).toLowerCase();
                               if (cName.includes('chuyên môn') || sName.includes('chuyên môn') || cName.includes('họp') || sName.includes('họp')) return false;
                               return true;
                             }).map(s => (
                               <option key={s.id} value={s.id}>{getSchoolName(s.schoolId, s)} - Lớp {getClassName(s.classId)}</option>
                             ))}
                             {changes.filter(c => c.targetTeacherId === currentTeacher?.id && c.status === 'approved').flatMap(c => {
                               const [y, m, d] = c.date.split('-');
                               const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                               const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                               let originalScheds = schedules.filter(s => !s.isDeleted && s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek && getSessionCategory(s.session) === c.session);
                               if (originalScheds.length === 0) {
                                 originalScheds = schedules.filter(s => !s.isDeleted && s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek);
                               }
                               const origTeacherName = teachers.find(t => t.id === c.originalTeacherId)?.name || c.originalTeacherId;
                               return originalScheds.map(originalSchedule => (
                                 <option key={`sub_${c.id}_${originalSchedule.id}`} value={originalSchedule.id}>
                                   [Dạy Dùm] {getSchoolName(originalSchedule.schoolId, originalSchedule)} - Lớp {getClassName(originalSchedule.classId)} ({c.date} - Thay cho {origTeacherName})
                                 </option>
                               ));
                             })}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Lý do</label>
                          <input type="text" value={makeupReason} onChange={e => setMakeupReason(e.target.value)} required placeholder="VD: Quên điện thoại, lỗi mạng..." className="w-full text-xs p-2 border border-blue-200 rounded-lg bg-white" />
                        </div>
                        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition shadow-sm">Gửi Đơn Xin Chấm Bù</button>
                      </form>
                    )}

                    <div className="flex gap-2">
                      <select value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs">
                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>Tháng {m}</option>)}
                      </select>
                      <select value={historyYear} onChange={e => setHistoryYear(e.target.value)} className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs">
                        {['2024','2025','2026'].map(y => <option key={y} value={y}>Năm {y}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      {(() => {
                        const filteredLogs = attendance.filter(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date.startsWith(`${historyYear}-${historyMonth}`));
                        if (filteredLogs.length === 0) {
                          return <p className="text-[11px] text-slate-400 text-center py-6">Chưa có dữ liệu điểm danh tháng {historyMonth}/{historyYear}</p>
                        }

                        // Group by date
                        const logsByDate = filteredLogs.reduce((acc, log) => {
                          acc[log.date] = acc[log.date] || [];
                          acc[log.date].push(log);
                          return acc;
                        }, {} as Record<string, AttendanceLog[]>);

                        return Object.entries(logsByDate)
                          .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                          .map(([date, logs], idx) => (
                          <div key={idx} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                            <div className="bg-slate-200/50 px-3 py-1.5 font-bold text-slate-700 text-[10px]">Ngày: {date}</div>
                            <div className="divide-y divide-slate-100">
                              {logs.map((L, i) => (
                                <div key={i} className="p-3 space-y-1">
                                  <div className="flex justify-between items-start">
                                    <div className="font-bold text-indigo-900 leading-tight">
                                      Ca {getSessionShort(L.session)} - {L.periods} tiết<br/>
                                      <span className="text-[10px] text-slate-500 font-normal">{getClassName(L.classId)}</span>
                                    </div>
                                    <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600">{L.checkInTime}</span>
                                  </div>
                                  <div className="flex gap-2 text-[9px] mt-1 pt-1 border-t border-slate-100/50 justify-between items-center">
                                    <span className={
                                      L.confirmedByAdmin ? 'text-emerald-600 font-bold'
                                      : L.flagReason?.toLowerCase().includes('bù') ? 'text-orange-600 font-bold'
                                      : L.isFlagged ? 'text-red-500 font-bold' 
                                      : L.isVerified ? 'text-emerald-600 font-bold' 
                                      : 'text-amber-500'
                                    }>
                                      {L.flagReason?.toLowerCase().includes('bù') 
                                        ? `Điểm danh bù ${L.confirmedByAdmin ? 'hợp lệ ✓' : '(Chờ duyệt)'}`
                                        : (L.isFlagged && !L.confirmedByAdmin) ? 'Trễ giờ / Vi phạm' 
                                        : (L.isVerified || L.confirmedByAdmin) ? 'Hợp lệ ✓' 
                                        : 'Chờ duyệt'
                                      }
                                    </span>
                                    <span className="text-slate-400">Trường: {getSchoolName(L.schoolId, L)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* TAB: SCHEDULE DETAILED LIST */}
            {mobileTab === 'schedule' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold border-b pb-2">Lịch dạy tuần chi tiết</h3>
                <p className="text-[11px] text-neutral-500">Danh sách các lớp mầm non phụ trách cố định hàng tuần của giáo viên {currentTeacher.name}</p>

                <div className="space-y-3">
                  {[2,3,4,5,6,7].map(dayNum => {
                    const lessons = activeSchedules
                      .filter(s => s.dayOfWeek === dayNum)
                          .sort((a, b) => {
      // Sáng first, then Chiều
      const getWeight = (session: string) => {
         const s = session?.toLowerCase() || '';
         const timeMatch = s.match(/(\d{1,2})[:h](\d{2})?/);
         if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            if (s.includes('chiều') && hour < 12) hour += 12;
            return hour * 60 + minute;
         }
         if (s === 'morning' || s.includes('sáng')) return 6 * 60;
         if (s === 'afternoon' || s.includes('chiều')) return 13 * 60;
         return 24 * 60;
      };
      return getWeight(a.session) - getWeight(b.session);
    });
                    return (
                      <div key={dayNum} className="border-l-2 border-slate-300 pl-3 py-1 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-slate-800">Thứ {dayNum}</h4>
                          {settings?.allowTeacherScheduleEdit && (
                            <button 
                              onClick={() => setEditingScheduleItem({ 
                                id: `sch-${Date.now()}`,
                                dayOfWeek: dayNum,
                                session: 'Sáng',
                                teacherId: currentTeacher.id,
                                schoolId: '',
                                classId: '',
                                periods: 1
                              })} 
                              className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100"
                            >
                              + Thêm Lịch Mới
                            </button>
                          )}
                        </div>
                        {lessons.map(l => {
                          const timeString = getSessionLabel(l.session);
                          return (
                          <div key={l.id} className="bg-slate-50 p-2.5 text-xs rounded-xl border border-slate-100 space-y-1.5 relative">
                            <div className="flex justify-between items-center font-bold">
                              <span className="flex items-center gap-1.5">
                                Lớp {getClassName(l.classId)}
                                {settings?.allowTeacherScheduleEdit && (
                                  <button onClick={() => setEditingScheduleItem({ ...l })} className="p-1 text-slate-400 hover:text-blue-600 rounded bg-slate-200/50">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between">
                              <span>{getSchoolName(l.schoolId, l)}</span>
                              <span className="font-semibold">Ca {getSessionLabel(l.session)}</span>
                            </div>
                            <div className="text-[9px] text-blue-600 font-semibold">{l.periods} tiết dạy tiêu chuẩn</div>
                          </div>
                        )})}
                        {lessons.length === 0 && <span className="text-[10px] text-slate-400 italic font-mono block">Nghỉ tự do</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: SMARTPHONE LIVE CHECK-IN (GPS / CAMERA / QR SCAN) */}
            {mobileTab === 'checkin' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Chấm Công Trực Tuyến</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isNetworkOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isNetworkOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {isNetworkOnline ? '4G/WiFi Trực Tuyến' : 'Ngoại Tuyến'}
                    </span>
                  </div>
                  <button onClick={() => setMobileTab('home')} className="text-neutral-500 font-bold">Quay Lại</button>
                </div>

                {/* BANNER THÔNG BÁO CHẾ ĐỘ NGOẠI TUYẾN KHI MẤT SÓNG HOẶC CÓ CA CHỜ GỬI (MỤC 7) */}
                {(!isNetworkOnline || offlinePendingCount > 0) && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    !isNetworkOnline
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-800'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{!isNetworkOnline ? '📶' : '⏳'}</span>
                      <div>
                        <div className="font-bold">
                          {!isNetworkOnline
                            ? 'Chế độ Chấm công Ngoại Tuyến (Offline)'
                            : `Có ${offlinePendingCount} ca chấm công đang chờ gửi`}
                        </div>
                        <div className="text-[11px] opacity-85">
                          {!isNetworkOnline
                            ? 'Mất sóng 4G/WiFi. Ảnh và toạ độ vẫn lưu an toàn trên máy, sẽ tự động gửi khi có mạng!'
                            : 'Hệ thống đã lưu an toàn trên máy và sẽ tự động đồng bộ lên máy chủ.'}
                        </div>
                      </div>
                    </div>
                    {offlinePendingCount > 0 && isNetworkOnline && (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('online'))}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] whitespace-nowrap shadow-sm"
                      >
                        Đồng bộ ngay
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handleCheckInNow} className="space-y-4">
                    
                    {/* Select Schedule subform */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-neutral-500 block">Chọn lớp muốn điểm danh:</label>
                      <div className="text-[10px] text-emerald-600 font-semibold mb-1 italic">
                        * Mẹo: Chấm công lớp này sẽ tự động ghi nhận cho các lớp khác CÙNG TRƯỜNG trong cùng ca. Nếu bạn dạy trường khác trong cùng ca, vui lòng điểm danh lại cho trường đó!
                      </div>
                      <select
                        value={selectedScheduleId}
                        onChange={e => setSelectedScheduleId(e.target.value)}
                        className="w-full p-2 border border-neutral-200 rounded-xl bg-white text-xs text-neutral-800"
                      >
                        <option value="">-- Chọn Ca Lịch Dạy Hôm Nay --</option>
                        {todaySchedules.filter(sc => {
                          const cName = getClassName(sc.classId).toLowerCase();
                          const sName = getSchoolName(sc.schoolId, sc).toLowerCase();
                          if (cName.includes('chuyên môn') || sName.includes('chuyên môn') || cName.includes('họp') || sName.includes('họp')) return false;
                          return true;
                        }).map(sc => (
                          <option key={sc.id} value={sc.id}>
                            [{getSchoolName(sc.schoolId, sc)}] {getSessionShort(sc.session)} - Lớp {getClassName(sc.classId)} ({sc.periods}t)
                            {(sc as any).isSubstitute && ' (DẠY THẾ)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSchedule && targetSchool && (
                      <div className="space-y-4">
                        
                        {/* CLASS SELECTION / CHECKLIST FOR SHIFT */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <span>📋</span> Danh sách lớp tại {targetSchool.name}:
                            </label>
                            <button 
                              type="button" 
                              onClick={() => handleOpenSchoolClosedModal(selectedSchedule)}
                              className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer flex items-center gap-1"
                              title="Báo ca dạy này trường nghỉ"
                            >
                              <span>🏫</span> Báo Trường Nghỉ
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {todaySchedules
                              .filter(s => getSessionShort(s.session) === getSessionShort(selectedSchedule.session) && (s.schoolId === selectedSchedule.schoolId || (getSchoolName(s.schoolId, s).trim().toLowerCase() === getSchoolName(selectedSchedule.schoolId, selectedSchedule).trim().toLowerCase())))
                              .filter(s => {
                                const cName = getClassName(s.classId).toLowerCase();
                                const sName = getSchoolName(s.schoolId, s).toLowerCase();
                                if (cName.includes('chuyên môn') || sName.includes('chuyên môn') || cName.includes('họp') || sName.includes('họp')) return false;
                                return true;
                              })
                              .map(scItem => {
                                const existingAtt = attendance.find(a => !(a as any).isDeleted && a.teacherId === currentTeacher?.id && a.date === todayStr && (a.scheduleId === scItem.id || (a.schoolId === scItem.schoolId && a.classId === scItem.classId)));
                                const isCheckedInWithPhoto = existingAtt && (existingAtt.hasSelfie || (existingAtt.selfieImage && existingAtt.selfieImage.length > 50));
                                const isManualCheckedIn = existingAtt && !isCheckedInWithPhoto;
                                const cancellation = schoolCancellations.find(c => c.teacherId === currentTeacher?.id && c.date === todayStr && (c.scheduleId === scItem.id || (c.schoolId === scItem.schoolId && c.classId === scItem.classId)));
                                const isCancelled = !!cancellation;
                                const isSelected = selectedCheckinScheduleIds.includes(scItem.id);

                                return (
                                  <label 
                                    key={scItem.id} 
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                                      isCheckedInWithPhoto ? 'bg-emerald-50/70 border-emerald-200 opacity-75' :
                                      isCancelled ? 'bg-rose-50/70 border-rose-200 opacity-75 cursor-not-allowed' :
                                      isManualCheckedIn ? 'bg-amber-50/90 border-amber-300 shadow-sm' :
                                      isSelected ? 'bg-indigo-50/90 border-indigo-300 shadow-sm' : 'bg-white border-slate-200 opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="checkbox"
                                        disabled={isCheckedInWithPhoto || isCancelled}
                                        checked={isCheckedInWithPhoto ? true : isCancelled ? false : isSelected}
                                        onChange={(e) => {
                                          if (isCheckedInWithPhoto || isCancelled) return;
                                          if (e.target.checked) {
                                            setSelectedCheckinScheduleIds(prev => [...prev, scItem.id]);
                                          } else {
                                            setSelectedCheckinScheduleIds(prev => prev.filter(id => id !== scItem.id));
                                          }
                                        }}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                      />
                                      <div>
                                        <span className="font-bold text-slate-800 text-xs block">{getClassName(scItem.classId)} ({scItem.session})</span>
                                        <span className="text-[10px] text-slate-500 font-mono">Thời lượng: {scItem.periods} tiết</span>
                                      </div>
                                    </div>

                                    <div>
                                      {isCheckedInWithPhoto && (
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Đã chụp ảnh</span>
                                      )}
                                      {isManualCheckedIn && !isCheckedInWithPhoto && (
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⚠️ Nhập tay (Bấm chụp bù)</span>
                                      )}
                                      {isCancelled && (
                                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                          {cancellation.cancellationType === 'arrived' ? 'Trường nghỉ (Tới trường)' : 'Trường nghỉ (Báo trước)'}
                                        </span>
                                      )}
                                      {!existingAtt && !isCancelled && (
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'text-indigo-700 bg-indigo-100' : 'text-slate-500 bg-slate-200'}`}>
                                          {isSelected ? 'Sẽ điểm danh' : 'Bỏ qua (Không dạy)'}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                          </div>
                        </div>

                        {/* GPS distance dynamic display (LOCKED ADMIN) */}
                        <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 opacity-80">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 block font-mono text-[9px] font-bold tracking-wider">XÁC THỰC GPS ĐỊNH VỊ</span>
                            <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold">KẾT NỐI TẠM KHOÁ</span>
                          </div>
                          
                          <div className="text-[11px] text-neutral-600 space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-800 font-semibold justify-between flex-wrap">
                              <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-500" /> Vị trí hiện tại: {targetSchool.name}</span>
                                                                                          {true && (
                                <button
                                    type="button"
                                    onClick={() => {
                                      if (navigator.geolocation) {
                                         customAlert('Thông báo', 'Đang lấy định vị thực tế của bạn. Vui lòng chờ...');
                                         getAccurateCurrentPosition(pos => {
                                            const isAccurate = pos.coords.accuracy <= 50;
                                            const accuracyMsg = isAccurate ? `Độ chính xác: ${Math.round(pos.coords.accuracy)} mét (Tốt)` : `CẢNH BÁO: Độ chính xác kém (${Math.round(pos.coords.accuracy)} mét). Vị trí có thể bị lệch.`;
                                            
                                            customConfirm('Xác nhận GPS', `Đã tìm thấy toạ độ GPS của bạn.\n\n${accuracyMsg}\n\nVĩ độ: ${pos.coords.latitude}\nKinh độ: ${pos.coords.longitude}\n\nXác nhận ghim toạ độ này cho trường ${targetSchool.name}?`, () => {
                                               const updatedSchools = schools.map(s => {
                                                 if (s.id === targetSchool.id) return { ...s, lat: pos.coords.latitude, lng: pos.coords.longitude };
                                                 return s;
                                               });
                                               if (!schools.find(s => s.id === targetSchool.id)) {
                                                 updatedSchools.push({...targetSchool, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                               }
                                               onUpdateSchools(updatedSchools);
                                               customAlert('Thành công', 'Đã cập nhật toạ độ trường thành công!');
                                            });
                                         }, err => customAlert('Lỗi', 'Lỗi lấy định vị: ' + err.message));
                                      } else {
                                        customAlert('Lỗi', 'Trình duyệt không hỗ trợ GPS');
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[9px] hover:bg-emerald-700 transition self-end whitespace-nowrap"
                                >
                                    CẬP NHẬT GPS HIỆN TẠI CHO TRƯỜNG
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 italic mt-1 bg-white p-2 border border-slate-100 rounded-lg">
                              * Thông báo từ Admin: Tính năng điểm danh bằng định vị GPS hiện đang được tạm khoá để thu thập đủ dữ liệu bản đồ. Điểm danh tạm thời được kiểm tra thông qua việc <strong>Chụp hình tại trường</strong>.
                            </p>
                          </div>
                        </div>

                      {/* WEBCAM SELFIE CAPTURING */}
                      {settings?.requireSelfieCheckIn !== false && (
                        <div className="space-y-2">
                          <label className="font-bold text-neutral-500 block">Xác thực ảnh khuôn mặt (Xác nhận an toàn):</label>
                          
                          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex flex-col items-center justify-center shadow-inner">
                            {isCameraActive ? (
                              <div className="relative w-full h-full">
                                <video 
                                  ref={videoRef} 
                                  autoPlay 
                                  playsInline 
                                  muted
                                  className="w-full h-full object-cover scale-x-[-1]"
                                />
                                <button
                                  type="button"
                                  onClick={captureSelfiePhoto}
                                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 border border-emerald-400 active:scale-95 transition animate-bounce"
                                >
                                  <Check className="h-4 w-4" /> Bấm Chụp Ảnh Này
                                </button>
                              </div>
                            ) : capturedImage ? (
                              <div className="relative w-full h-full">
                                <img src={capturedImage} alt="captured thumbnail" className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã Chụp Xong
                                </div>
                              </div>
                            ) : (
                              <div className="text-center space-y-1.5 text-neutral-400 p-4">
                                <Camera className="h-8 w-8 mx-auto opacity-40 text-blue-600" />
                                <p className="text-[10px] leading-normal font-medium">Bắt buộc tự chụp chân dung tại bục giảng để xác thực</p>
                              </div>
                            )}

                            {/* Hidden canvas and file input */}
                            <canvas ref={canvasRef} className="hidden" />
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              accept="image/*" 
                              capture="user" 
                              className="hidden" 
                              onChange={handleSelfieFileUpload} 
                            />
                          </div>

                          {/* Webcam buttons togglers */}
                          <div className="flex gap-2">
                            {isCameraActive ? (
                              <button 
                                type="button" 
                                onClick={captureSelfiePhoto}
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <Check className="h-4.5 w-4.5" /> Bấm Chụp Ảnh Này
                              </button>
                            ) : capturedImage ? (
                              <div className="flex w-full gap-2">
                                <button 
                                  type="button" 
                                  onClick={startCamera}
                                  className="flex-1 py-2 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1 text-xs shadow-sm"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Chụp Lại
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="py-2 px-3.5 bg-neutral-150 text-neutral-700 border border-neutral-200 rounded-xl font-bold hover:bg-neutral-200 transition flex items-center justify-center gap-1 text-xs"
                                >
                                  <Upload className="h-3.5 w-3.5" /> Chọn Tệp Ảnh
                                </button>
                              </div>
                            ) : (
                              <div className="flex w-full gap-2">
                                <button 
                                  type="button" 
                                  onClick={startCamera}
                                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <Camera className="h-4.5 w-4.5" /> Kích Hoạt Camera
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="py-2.5 px-3 bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition flex items-center justify-center gap-1.5 text-xs font-semibold"
                                  title="Chụp trực tiếp bằng camera điện thoại hoặc tải ảnh từ máy"
                                >
                                  <Upload className="h-4 w-4" /> Tải Ảnh
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* OPTIONAL SCAN SECURE QR CODE TO DOUBLE VALIDATE */}
                      <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-150 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="font-extrabold uppercase">QUÉT MÃ QR TRƯỜNG ĐỐI SOÁT CHÉO</span>
                          <span className="text-blue-600 font-bold font-mono">TĂNG ĐỘ CHÍNH XÁC</span>
                        </div>

                        {isScanningQR ? (
                          <div className="text-center p-3 space-y-2">
                            <QrCode className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
                            <p className="text-[10px] text-neutral-500">Đang nhận diện QR code treo tại trường...</p>
                            <button 
                              type="button"
                              onClick={() => {
                                setScannedQR(targetSchool.qrCodeData);
                                setIsScanningQR(false);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                            >
                              Bấm để nhận Diện QR (ETMS Scan)
                            </button>
                          </div>
                        ) : scannedQR ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 p-2 rounded">
                            <Check className="h-4 w-4" /> Đã khớp mã QR tại văn phòng: {scannedQR.substring(0, 15)}...
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsScanningQR(true)}
                            className="w-full py-1.5 border border-dashed border-blue-300 hover:bg-blue-50/20 rounded-xl text-blue-600 font-bold transition text-center text-[11px]"
                          >
                            ➕ Quét QR code dán tường (Tùy chọn)
                          </button>
                        )}
                      </div>

                      {/* Submit final checkin */}
                      <button 
                        type="submit"
                        className="w-full py-3 text-white bg-slate-900 rounded-2xl font-bold tracking-tight hover:bg-slate-800 transition shadow-md cursor-pointer"
                      >
                        Nộp Chấm Công Check-In
                      </button>

                      {/* Trường báo nghỉ quick button */}
                      <button 
                        type="button"
                        onClick={() => handleOpenSchoolClosedModal(selectedSchedule)}
                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs mt-2"
                      >
                        <span>🏫</span> TRƯỜNG NGHỈ HÔM NAY (HỦY CA & TÍNH TIẾT)
                      </button>

                    </div>
                  )}

                  {!selectedSchedule && (
                    <p className="text-center text-neutral-400 py-12">Vui lòng chọn bất kỳ một lớp học nào ở trên để nạp toạ độ định vị.</p>
                  )}

                </form>
              </div>
            )}

            {/* TAB: REQUESTS (ĐƠN TỪ) */}
            {mobileTab === 'swap' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <h3 className="font-bold text-sm border-b pb-2">Gửi đơn từ / Xin phép</h3>
                <p className="text-[11px] text-slate-500">Gửi yêu cầu xin nghỉ, dạy thay, đổi ca hoặc báo cáo coi diễn văn nghệ.</p>

                {reqStatusMessage && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold text-center border border-emerald-100">
                    {reqStatusMessage}
                  </div>
                )}

                <form onSubmit={handleRequestShiftChange} className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Loại Đơn *</label>
                    <select 
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 font-medium text-slate-800"
                      value={reqType}
                      onChange={(e) => {
                        setReqType(e.target.value as any);
                        setSubstituteMode('regular');
                        setSelectedPastLeaveIds([]);
                      }}
                    >
                      <option value="sick_leave">Nghỉ ốm / Việc bận cá nhân (Mất chuyên cần)</option>
                      <option value="emergency_swap">Đổi ca khẩn cấp (Đi dạy thay GV khác / Giữ chuyên cần)</option>
                      <option value="substitute_teacher">Nhờ người dạy thay (55.000 VNĐ/tiết)</option>
                      <option value="art_performance">Coi diễn văn nghệ (100k/trường, Giữ chuyên cần)</option>
                    </select>
                  </div>

                  {(reqType === 'emergency_swap' || reqType === 'swap_shift') && (
                    <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/80 space-y-3">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="text-amber-600 text-sm">⚡</span> Đổi ca khẩn cấp: Đi dạy thay cho Giáo viên khác (Giữ chuyên cần)
                      </div>

                      <div className="space-y-2 pt-2 border-t border-amber-200/60">
                        <label className="block text-[11px] font-bold text-slate-700">Xử lý ca gốc của bạn vào ngày/buổi này *</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                            <input 
                              type="radio" 
                              name="emergencySubMode" 
                              checked={emergencySubMode === 'has_substitute'} 
                              onChange={() => setEmergencySubMode('has_substitute')}
                            />
                            1. Xếp Giáo viên khác dạy thay ca gốc của tôi
                          </label>
                          {emergencySubMode === 'has_substitute' && (
                            <select
                              value={emergencyTargetTeacherId}
                              onChange={(e) => setEmergencyTargetTeacherId(e.target.value)}
                              className="w-full border-amber-200 rounded-xl p-2 text-xs bg-white text-slate-800 font-medium"
                            >
                              <option value="">-- Để Ban Giám Đốc tự chỉ định GV dạy ca gốc --</option>
                              {teachers.filter(t => t.id !== currentTeacher?.id).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          )}

                          <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 font-semibold pt-1">
                            <input 
                              type="radio" 
                              name="emergencySubMode" 
                              className="mt-0.5"
                              checked={emergencySubMode === 'no_substitute'} 
                              onChange={() => setEmergencySubMode('no_substitute')}
                            />
                            <span>2. Không có GV thay ca gốc (Tạm nghỉ ca gốc - <strong>Vẫn giữ chuyên cần</strong> vì đi dạy thay cho người khác)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {reqType === 'substitute_teacher' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2.5">
                      <label className="block text-[11px] font-bold text-slate-500">Lựa chọn kịch bản nhờ dạy thay *</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                          <input 
                            type="radio" 
                            name="substituteMode" 
                            checked={substituteMode === 'regular'} 
                            onChange={() => {
                              setSubstituteMode('regular');
                              setSelectedPastLeaveIds([]);
                              setReqReason('');
                            }}
                          />
                          Lịch bình thường hàng tuần
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                          <input 
                            type="radio" 
                            name="substituteMode" 
                            checked={substituteMode === 'past_leave'} 
                            onChange={() => {
                              setSubstituteMode('past_leave');
                              setSelectedPastLeaveIds([]);
                              setReqReason('');
                            }}
                          />
                          Dạy bù cho ca đã nghỉ
                        </label>
                      </div>

                      {substituteMode === 'regular' && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700">Giáo viên nhờ dạy thay (Nếu đã thỏa thuận trước)</label>
                          <select
                            value={substituteTargetTeacherId}
                            onChange={(e) => setSubstituteTargetTeacherId(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-800 font-medium"
                          >
                            <option value="">-- Để Ban Giám Đốc / Quản Lý chỉ định --</option>
                            {teachers.filter(t => !t.isDeleted && t.id !== currentTeacher?.id).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {substituteMode === 'past_leave' && (
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Chọn các ca/lớp đã nghỉ trong tháng qua (Có thể chọn nhiều lớp cùng buổi)
                          </label>
                          <div className="max-h-[220px] overflow-y-auto border border-slate-200 rounded-xl bg-white p-3 space-y-2">
                            {getPastMissedSessions().length === 0 ? (
                              <p className="text-slate-400 italic text-[11px] text-center py-4">Không có ca vắng hoặc ca chưa điểm danh nào trong 30 ngày qua.</p>
                            ) : (
                              getPastMissedSessions().map(item => {
                                const isChecked = selectedPastLeaveIds.includes(item.id);
                                return (
                                  <label key={item.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition cursor-pointer border border-slate-100/50">
                                    <input 
                                      type="checkbox" 
                                      className="mt-0.5 rounded text-blue-600 border-slate-350 focus:ring-blue-500 cursor-pointer"
                                      checked={isChecked}
                                      onChange={() => {
                                        let updated: string[];
                                        if (isChecked) {
                                          updated = selectedPastLeaveIds.filter(id => id !== item.id);
                                        } else {
                                          updated = [...selectedPastLeaveIds, item.id];
                                        }
                                        setSelectedPastLeaveIds(updated);
                                        
                                        if (updated.length > 0) {
                                          const selectedDetails = updated.map(id => {
                                            if (id.startsWith('leave_')) {
                                              const parts = id.split('_');
                                              const leaveId = parts[1];
                                              const schedId = parts.slice(2).join('_');
                                              const req = changes.find(c => c.id === leaveId);
                                              if (req) {
                                                const [y, m, d] = req.date.split('-');
                                                const sched = schedId ? schedules.find(s => s.id === schedId) : null;
                                                if (sched) {
                                                  const schoolName = getSchoolName(sched.schoolId, sched);
                                                  const classNameStr = getClassName(sched.classId);
                                                  return { date: `${d}/${m}/${y}`, session: req.session, schoolName, classNameStr, reason: req.reason };
                                                } else {
                                                  const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                                  const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                                                  const origSched = schedules.find(s => s.teacherId === currentTeacher.id && s.dayOfWeek === reqDayOfWeek && getSessionCategory(s.session) === req.session && !s.isDeleted);
                                                  const schoolName = origSched ? getSchoolName(origSched.schoolId, origSched) : '';
                                                  const classNameStr = origSched ? getClassName(origSched.classId) : '';
                                                  return { date: `${d}/${m}/${y}`, session: req.session, schoolName, classNameStr, reason: req.reason };
                                                }
                                              }
                                            } else if (id.startsWith('missed_')) {
                                              const parts = id.split('_');
                                              const schedId = parts.slice(1, parts.length - 1).join('_');
                                              const dateStr = parts[parts.length - 1];
                                              const sched = schedules.find(s => s.id === schedId);
                                              if (sched) {
                                                const [y, m, d] = dateStr.split('-');
                                                const schoolName = getSchoolName(sched.schoolId, sched);
                                                const classNameStr = getClassName(sched.classId);
                                                return { date: `${d}/${m}/${y}`, session: getSessionCategory(sched.session), schoolName, classNameStr, reason: 'Chưa điểm danh' };
                                              }
                                            }
                                            return null;
                                          }).filter(Boolean);
                                          
                                          if (selectedDetails.length > 0) {
                                            setReqSession(selectedDetails[0]!.session);
                                            
                                            const dates = Array.from(new Set(selectedDetails.map(d => d!.date)));
                                            const schoolClassesMap: Record<string, string[]> = {};
                                            selectedDetails.forEach(d => {
                                              const key = d!.schoolName || 'Lớp dạy';
                                              if (!schoolClassesMap[key]) schoolClassesMap[key] = [];
                                              if (d!.classNameStr && !schoolClassesMap[key].includes(d!.classNameStr)) {
                                                schoolClassesMap[key].push(d!.classNameStr);
                                              }
                                            });
                                            
                                            const detailsStr = Object.entries(schoolClassesMap).map(([school, classesList]) => {
                                              return `Trường ${school}${classesList.length > 0 ? ` (Lớp ${classesList.join(', ')})` : ''}`;
                                            }).join('; ');
                                            
                                            const datesStr = dates.join(', ');
                                            setReqReason(`[Dạy bù cho ca vắng ngày ${datesStr}] ${detailsStr}.`);
                                          }
                                        } else {
                                          setReqReason('');
                                        }
                                      }}
                                    />
                                    <div className="text-slate-800 text-[11px] leading-tight cursor-pointer">
                                      <p className="font-semibold">{item.label}</p>
                                      {item.reason && item.reason !== 'Không có dữ liệu điểm danh' && (
                                        <p className="text-[10px] text-slate-500 italic mt-0.5">Lý do nghỉ: {item.reason}</p>
                                      )}
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày Áp Dụng *</label>
                    <input 
                      type="date"
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      required
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Buổi / Ca *</label>
                    <select 
                      value={reqSession}
                      onChange={(e) => setReqSession(e.target.value)}
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50"
                    >
                      <option value="morning">Buổi Sáng</option>
                      <option value="afternoon">Buổi Chiều</option>
                    </select>
                  </div>
                  {reqType === 'art_performance' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Số lượng trường coi diễn *</label>
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={artCount}
                        onChange={(e) => setArtCount(Number(e.target.value))}
                        required
                        className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      {(reqType === 'emergency_swap' || reqType === 'swap_shift') 
                        ? 'Chi tiết trường/lớp bạn đi dạy thay & lý do đổi ca khẩn cấp *' 
                        : 'Lý do / Tên trường chi tiết *'}
                    </label>
                    <textarea 
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                      placeholder={(reqType === 'emergency_swap' || reqType === 'swap_shift') ? "VD: Đi dạy thay khẩn cấp cho GV Nguyễn Văn A tại Trường Mầm Non..." : "Trình bày lý do..."}
                      rows={3}
                      required
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 resize-none"
                    />
                  </div>

                  {/* Proof Image Upload / Capture */}
                  <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        Đính kèm ảnh minh chứng (Tùy chọn)
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Giấy khám, tin nhắn, hình ảnh...</span>
                    </label>

                    {proofImagePreview ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex items-center gap-3">
                        <img 
                          src={proofImagePreview} 
                          alt="Proof Preview" 
                          className="w-16 h-16 object-cover rounded-lg border border-slate-100 shadow-xs cursor-pointer"
                          onClick={() => setSelectedProofModal({ url: proofImagePreview, title: 'Ảnh minh chứng của bạn' })}
                        />
                        <div className="flex-1 space-y-1">
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã nén & sẵn sàng gửi
                          </span>
                          <p className="text-[9px] text-slate-500">Bấm vào ảnh để xem kích thước lớn</p>
                          <button
                            type="button"
                            onClick={() => setProofImagePreview('')}
                            className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5"
                          >
                            <X className="w-3 h-3" /> Gỡ ảnh này
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <label className="flex-1 py-2 px-3 bg-white border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-center cursor-pointer transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold text-[11px]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isCompressingProof ? 'Đang nén ảnh...' : 'Chọn từ thư viện'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleProofImageChange}
                            disabled={isCompressingProof}
                          />
                        </label>
                        <label className="py-2 px-3 bg-white border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-center cursor-pointer transition flex items-center justify-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold text-[11px]">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Chụp ảnh</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            onChange={handleProofImageChange}
                            disabled={isCompressingProof}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer shadow-sm"
                  >
                    Gửi Đơn Lên Quản Lý
                  </button>
                </form>

                <div className="mt-6 space-y-3">
                  <h4 className="font-bold text-xs text-slate-700 border-b pb-2">Lịch Sử Đơn Từ Của Bạn</h4>
                  {changes.filter(c => c.teacherId === currentTeacher.id).length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">Chưa có đơn nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...changes]
                        .filter(c => c.teacherId === currentTeacher.id)
                        .sort((a, b) => {
                          if (a.status === 'pending' && b.status !== 'pending') return -1;
                          if (a.status !== 'pending' && b.status === 'pending') return 1;
                          if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
                          if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
                          return (b.id || '').localeCompare(a.id || '');
                        })
                        .map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-blue-900 block">
                                {c.requestType === 'sick_leave' ? 'Nghỉ có phép' : 
                                 (c.requestType === 'swap_shift' || c.requestType === 'emergency_swap') ? 'Đổi ca khẩn cấp (Giữ chuyên cần)' : 
                                 c.requestType === 'art_performance' ? 'Coi diễn văn nghệ' : 'Nhờ người dạy thay'}
                              </span>
                              <span className="text-[10px] text-slate-500">{c.date} - {c.session === 'morning' ? 'Sáng' : 'Chiều'}</span>
                              {(c.requestType === 'substitute_teacher' || c.requestType === 'sick_leave' || c.requestType === 'emergency_swap' || c.requestType === 'swap_shift') && c.status === 'approved' && (
                                <span className="text-[10px] block font-medium mt-0.5 text-indigo-700">
                                  GV dạy thay ca gốc: {c.targetTeacherId === 'no_substitute' ? 'Không có người dạy thay (Giữ chuyên cần)' : teachers.find(t => t.id === c.targetTeacherId)?.name || 'Chờ Admin xếp GV'}
                                </span>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              c.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {c.status === 'approved' ? 'Đã duyệt' : c.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 mt-1">"{c.reason}"</p>
                          
                          {c.proofImage && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => setSelectedProofModal({ 
                                  url: c.proofImage!, 
                                  title: `Ảnh minh chứng - ${c.date} (${c.requestType === 'sick_leave' ? 'Nghỉ phép' : 'Đơn từ'})` 
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition border border-blue-100 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Xem ảnh minh chứng kèm theo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* TAB: DAY DUM (SUBSTITUTE SHIFTS) */}
            {mobileTab === 'substitute_tab' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <h3 className="font-bold text-sm border-b pb-2">Lịch Dạy Dùm Được Phân Công</h3>
                <p className="text-[11px] text-slate-500">Danh sách các ca bạn được phân công dạy thay. Nếu qua ngày, bạn cần làm đơn điểm danh bù.</p>
                
                <div className="space-y-4 mt-4">
                  {changes.filter(c => {
                    if (c.targetTeacherId !== currentTeacher.id || c.status !== 'approved') return false;
                    if (c.date < todayStr) {
                      const createdTime = new Date(c.createdAt).getTime();
                      if (!isNaN(createdTime) && (Date.now() - createdTime) >= 48 * 60 * 60 * 1000) {
                        return false;
                      }
                    }
                    return true;
                  }).length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">Chưa có lịch dạy dùm nào được phân công.</p>
                  ) : (
                    changes.filter(c => {
                      if (c.targetTeacherId !== currentTeacher.id || c.status !== 'approved') return false;
                      if (c.date < todayStr) {
                        const createdTime = new Date(c.createdAt).getTime();
                        if (!isNaN(createdTime) && (Date.now() - createdTime) >= 48 * 60 * 60 * 1000) {
                          return false;
                        }
                      }
                      return true;
                    }).map(c => {
                      const [y, m, d] = c.date.split('-');
                      const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                      const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                      let originalSchedules: Schedule[] = [];
                      let isFallback = false;
                      if (c.targetScheduleId && c.targetScheduleId.trim()) {
                        const itemIds = c.targetScheduleId.split(',').map(s => s.trim()).filter(Boolean);
                        itemIds.forEach(itemId => {
                          if (itemId.startsWith('missed_')) {
                            const parts = itemId.split('_');
                            const schedId = parts.slice(1, parts.length - 1).join('_');
                            const s = schedules.find(x => x.id === schedId && !x.isDeleted && x.teacherId === c.originalTeacherId);
                            if (s) originalSchedules.push(s);
                          } else if (itemId.startsWith('leave_')) {
                            const reqId = itemId.replace('leave_', '');
                            const parts = reqId.split('_');
                            if (parts.length > 1) {
                              const schedId = parts.slice(1).join('_');
                              const s = schedules.find(x => x.id === schedId && !x.isDeleted && x.teacherId === c.originalTeacherId);
                              if (s) originalSchedules.push(s);
                            } else {
                              const origReq = changes.find(ch => ch.id === reqId);
                              if (origReq) {
                                const [y, m, d] = origReq.date.split('-');
                                const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                                const dayScheds = schedules.filter(s => 
                                  !s.isDeleted && 
                                  s.teacherId === origReq.originalTeacherId && 
                                  s.dayOfWeek === reqDayOfWeek && 
                                  getSessionCategory(s.session) === origReq.session
                                );
                                originalSchedules.push(...dayScheds);
                              }
                            }
                          } else {
                            const s = schedules.find(x => x.id === itemId && !x.isDeleted && x.teacherId === c.originalTeacherId);
                            if (s) originalSchedules.push(s);
                          }
                        });
                        isFallback = true;
                      }
                      
                      if (originalSchedules.length === 0) {
                        originalSchedules = schedules.filter(s => !s.isDeleted && s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek && getSessionCategory(s.session) === getSessionCategory(c.session));
                        if (originalSchedules.length === 0) {
                           const reasonLower = (c.reason || '').toLowerCase();
                           originalSchedules = schedules.filter(s => {
                             if (s.isDeleted || s.teacherId !== c.originalTeacherId || s.dayOfWeek !== reqDayOfWeek) return false;
                             const schoolName = getSchoolName(s.schoolId, s).toLowerCase();
                             return reasonLower.includes(schoolName) || schoolName.includes(reasonLower);
                           });
                           if (originalSchedules.length === 0) {
                             originalSchedules = schedules.filter(s => !s.isDeleted && s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek);
                           }
                           isFallback = true;
                        }
                      }

                      if (originalSchedules.length === 0) {
                         return (
                           <div key={c.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                              <p className="text-red-500 font-bold mb-1">Lịch Không Tồn Tại</p>
                              <p className="text-[10px] text-slate-500">Ngày {c.date} ca {c.session === 'morning' ? 'Sáng' : 'Chiều'} không có lịch dạy nào của giáo viên gốc.</p>
                           </div>
                         );
                      }

                      const isToday = c.date === todayStr;

                      return (
                        <div key={c.id} className="space-y-3">
                          {originalSchedules.map(originalSchedule => {
                            const schSchool = schools.find(sch => sch.id === originalSchedule.schoolId);
                            const schClass = classes.find(cl => cl.id === originalSchedule.classId);
                            const origTeacher = teachers.find(t => t.id === c.originalTeacherId) || { name: 'Giáo viên gốc' };
                            
                            return (
                              <div key={originalSchedule.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                                  {c.date} - Ca {c.session === 'morning' ? 'Sáng' : 'Chiều'}
                                </div>
                                
                                <h4 className="font-bold text-blue-900 mt-2 mb-1">
                                  Dạy thay cho: {origTeacher.name} 
                                  {isFallback && <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal italic ml-1">Lịch dạy bù/khác ngày</span>}
                                </h4>
                                <div className="space-y-1 mb-3 text-slate-700">
                                  <p><span className="font-semibold text-slate-500">Trường:</span> {schSchool?.name}</p>
                                  <p><span className="font-semibold text-slate-500">Lớp:</span> {schClass?.name}</p>
                                  <p><span className="font-semibold text-slate-500">Giờ dạy:</span> {originalSchedule.session}</p>
                                  <p><span className="font-semibold text-slate-500">Địa chỉ:</span> {schSchool?.address}</p>
                                </div>

                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      if (schSchool?.address) {
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schSchool.address)}`, '_blank');
                                      }
                                    }}
                                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1 hover:bg-slate-50 transition">
                                    <MapPin className="w-3.5 h-3.5" /> Chỉ Đường
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      if (isToday) {
                                        setSelectedScheduleId(originalSchedule.id);
                                        setMobileTab('checkin');
                                      } else {
                                        setMakeupDate(c.date);
                                        setMakeupScheduleId(originalSchedule.id);
                                        const origTeacher = teachers.find(t => t.id === c.originalTeacherId)?.name || 'Đồng nghiệp';
                                        setMakeupReason(`Dạy thay cho ${origTeacher} ngày ${c.date}`);
                                        setShowMakeupForm(true);
                                        setHomeSubTab('history');
                                        setMobileTab('home');
                                      }
                                    }}
                                    className={`flex-1 font-bold py-2 rounded-xl text-center transition flex items-center justify-center gap-1 shadow-sm ${isToday ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                                  >
                                    {isToday ? <Camera className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                    {isToday ? 'Chấm công ngay' : 'Xin chấm công bù'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            
            {/* TAB: SALARY SLIP (BẢNG LƯƠNG CHI TIẾT TẠM TÍNH & XUẤT ẢNH ZALO) */}
            {mobileTab === 'salary' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Bảng Lương & Thù Lao Của Bạn
                    </h3>
                    <p className="text-[11px] text-slate-500">Kỳ quyết toán tháng {reportMonthDisplay} - Dữ liệu đồng bộ tự động</p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Highlight Hero Card */}
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl space-y-2 border border-slate-800 shadow-md relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-[9px] uppercase font-mono text-indigo-300 font-bold block">TỔNG TIẾT DUYỆT CÔNG THÁNG NÀY</span>
                        <strong className="text-3xl text-white font-mono font-extrabold">{totalVerifiedSchedules} <span className="text-xs font-normal text-indigo-200">tiết dạy</span></strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-mono text-emerald-400 font-bold block">TỔNG THỰC LĨNH DỰ KIẾN</span>
                        <strong className="text-xl text-emerald-400 font-mono font-extrabold">{netEarnings.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-white/70 font-mono relative z-10">
                      <span>Đơn giá chuẩn: <b>{currentTeacher.hourlyRate.toLocaleString('vi-VN')} đ/tiết</b></span>
                      <span>Chuyên cần: <b className={hasApprovedLeave ? "text-rose-400" : "text-emerald-400"}>{!hasApprovedLeave ? "+300.000 đ" : "0 đ (Nghỉ phép)"}</b></span>
                    </div>
                  </div>

                  {/* Math breakdowns list */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-150 shadow-xs divide-y divide-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between pb-1">
                      <span className="text-slate-500 font-medium">Họ và tên giáo viên:</span>
                      <strong className="text-slate-900 font-semibold">{currentTeacher.name} ({currentTeacher.id})</strong>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-600">1. Tiết dạy chính ngạch ({regularPeriods} tiết):</span>
                      <span className="font-mono font-bold text-slate-800">{((regularPeriods || 0) * (currentTeacher?.hourlyRate || 0)).toLocaleString('vi-VN')} đ</span>
                    </div>

                    {currentBonusPeriods > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">2. Tiết bổ sung điều chỉnh ({currentBonusPeriods} tiết):</span>
                        <div className="text-right">
                          <span className="font-mono text-purple-600 font-bold">+{((currentBonusPeriods || 0) * (currentTeacher?.hourlyRate || 0)).toLocaleString('vi-VN')} đ</span>
                          <span className="block text-[9px] text-purple-500 italic">Hỗ trợ lớp đặc biệt</span>
                        </div>
                      </div>
                    )}

                    {substitutePeriods > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">3. Dạy thay / Dạy thế ca ({substitutePeriods} tiết):</span>
                        <div className="text-right">
                          <span className="font-mono text-blue-600 font-bold">+{substituteWagesEarned.toLocaleString('vi-VN')} đ</span>
                          <span className="block text-[9px] text-blue-500 italic">55.000 đ/tiết dạy thế</span>
                        </div>
                      </div>
                    )}

                    {schoolClosedArrivedPeriods > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">4. Hỗ trợ trường nghỉ (Tới nơi mới báo - {schoolClosedArrivedPeriods} ca):</span>
                        <div className="text-right">
                          <span className="font-mono text-emerald-600 font-bold">+{((schoolClosedArrivedPeriods || 0) * (currentTeacher?.hourlyRate || 0)).toLocaleString('vi-VN')} đ</span>
                          <span className="block text-[9px] text-emerald-500 italic">Hỗ trợ +1 tiết /ca</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-600">5. Phụ cấp xăng xe & đi lại:</span>
                      <span className="font-mono text-emerald-600 font-bold">+{currentAllowance.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-600">6. Thưởng chuyên cần tháng:</span>
                      <div className="text-right flex flex-col items-end">
                        {hasApprovedLeave ? (
                          <>
                            <span className="font-mono text-red-500 line-through text-[10px]">{potentialBonus.toLocaleString('vi-VN')} đ</span>
                            <span className="text-[9px] text-red-500 italic">Mất C.Cần do có đơn nghỉ phép</span>
                          </>
                        ) : (
                          <span className="font-mono text-emerald-600 font-bold">+{potentialBonus.toLocaleString('vi-VN')} đ</span>
                        )}
                      </div>
                    </div>

                    {artPerformanceBonus > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">7. Thưởng coi diễn văn nghệ ({artEvents.length} sự kiện):</span>
                        <span className="font-mono text-purple-600 font-bold">+{artPerformanceBonus.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}

                    {currentTeacher.deduction > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">8. Khấu trừ phạt vi phạm / Đi trễ:</span>
                        <span className="font-mono text-red-500 font-bold">-{currentTeacher.deduction.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}

                    {(currentTeacher.advanceSalary || 0) > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">9. Tạm ứng lương trong tháng:</span>
                        <span className="font-mono text-amber-600 font-bold">-{(currentTeacher.advanceSalary || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}

                    {(currentTeacher.socialInsurance || 0) > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-600">10. Đóng Bảo hiểm xã hội:</span>
                        <span className="font-mono text-red-500 font-bold">-{(currentTeacher.socialInsurance || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 text-sm font-extrabold border-t border-slate-200">
                      <span className="text-slate-900">TỔNG THỰC LĨNH TẠM TÍNH:</span>
                      <span className="text-blue-700 font-mono text-base">{netEarnings.toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400 italic bg-neutral-50 p-2.5 rounded-xl leading-normal">
                    ⚠️ <b>Lưu ý:</b> Bảng lương này tự động đồng chỉnh từ lịch chấm công hằng ngày. Khi Admin phê duyệt chốt công, số liệu này là căn cứ chi trả chính thức vào ngày thanh toán lương.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: SCHOOL AND MAP LOCATIONS */}
            {mobileTab === 'school' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold">Quản lý Định vị Trường</h3>
                  <button onClick={() => { setEditingSchool(null); setEditSchoolData({ name: '', address: '', lat: 0, lng: 0, radius: 100 }); }} className="text-emerald-600 text-xs font-bold">+ THÊM TRƯỜNG</button>
                </div>
                
                <p className="text-[11px] text-neutral-500 mb-4">
                  Cập nhật định vị chính xác theo thời gian thực để hỗ trợ chấm công bằng GPS. Các thay đổi sẽ được đồng bộ lên Admin.
                </p>

                {gpsMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex justify-between items-center ${gpsMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {gpsMessage.text}
                    <button onClick={() => setGpsMessage(null)} className="ml-2 underline opacity-80">Đóng</button>
                  </div>
                )}

                {editingSchool !== undefined ? (
                  <form onSubmit={handleSaveSchoolEdit} className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <h4 className="font-bold text-slate-800 text-sm mb-3">
                      {editingSchool ? 'Chỉnh sửa trường học' : 'Thêm trường mới'}
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Tên Trường / Điểm Trường</label>
                      <input 
                        type="text" 
                        value={editSchoolData.name || ''} 
                        onChange={e => setEditSchoolData({...editSchoolData, name: e.target.value})}
                        required
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-800"
                        placeholder="VD: THPT Lê Hồng Phong"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Địa chỉ</label>
                      <input 
                        type="text" 
                        value={editSchoolData.address || ''} 
                        onChange={e => setEditSchoolData({...editSchoolData, address: e.target.value})}
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-800"
                        placeholder="Số nhà, Tên đường..."
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                       <label className="text-xs font-bold text-slate-700 block">Định vị GPS</label>
                       <div className="flex gap-2 items-center">
                          <input type="number" step="any" value={editSchoolData.lat || ''} onChange={e => setEditSchoolData({...editSchoolData, lat: parseFloat(e.target.value) || 0})} className="w-1/2 p-2 text-xs border border-slate-200 rounded-lg text-slate-800" placeholder="Vĩ độ (Lat)" />
                          <input type="number" step="any" value={editSchoolData.lng || ''} onChange={e => setEditSchoolData({...editSchoolData, lng: parseFloat(e.target.value) || 0})} className="w-1/2 p-2 text-xs border border-slate-200 rounded-lg text-slate-800" placeholder="Kinh độ (Lng)" />
                       </div>
                       <p className="text-[10px] text-slate-500 italic mt-1 leading-tight">
                         *Bạn có thể nhập thủ công (Copy từ Google Maps) hoặc nhấn nút Lấy Vị Trí bên dưới.
                       </p>
                       <button 
                         type="button"
                         disabled={updatingGpsSchoolId === 'edit'}
                         onClick={() => {
                                                      if (navigator.geolocation) {
                              setUpdatingGpsSchoolId('edit');
                              setGpsMessage(null);
                              getAccurateCurrentPosition((pos) => {
                                 setEditSchoolData({...editSchoolData, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                 setUpdatingGpsSchoolId(null);
                                 const acc = Math.round(pos.coords.accuracy);
                                 if (acc > 50) {
                                   setGpsMessage({type: 'error', text: `Lấy được toạ độ nhưng độ chính xác kém (${acc}m). Vị trí có thể bị lệch, hãy bật GPS/Vị trí chính xác trên điện thoại.`});
                                 } else {
                                   setGpsMessage({type: 'success', text: `Lấy toạ độ thành công! (Chính xác ${acc}m)`});
                                 }
                              }, (err) => {
                                 setUpdatingGpsSchoolId(null);
                                 setGpsMessage({type: 'error', text: 'Lỗi lấy GPS: ' + err.message + '. Vui lòng kiểm tra quyền vị trí trên máy!'});
                              });
                           } else {
                              setGpsMessage({type: 'error', text: 'Trình duyệt không hỗ trợ GPS'});
                           }
                         }}
                         className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold mt-2 flex justify-center items-center gap-1.5 disabled:opacity-50"
                       >
                         <MapPin className="w-3.5 h-3.5" /> 
                         {updatingGpsSchoolId === 'edit' ? 'ĐANG LẤY TOẠ ĐỘ...' : 'GẮN VỊ TRÍ HIỆN TẠI'}
                       </button>
                       <p className="text-[9px] text-slate-400 italic text-center mt-1">
                         *Lưu ý: Nếu thao tác trên máy tính, vị trí có thể bị lệch (thường về Quận 1) do dùng IP mạng. Hãy dùng điện thoại để có GPS chính xác nhất.
                       </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setEditingSchool(undefined)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs">Huỷ</button>
                      <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">Lưu Thay Đổi</button>
                    </div>
                  </form>
                ) : (
                                                <div className="space-y-4">
                  {schools.filter(s => {
                    if (s.isDeleted) return false;
                    const hasRegular = activeSchedules.some(sched => sched.schoolId === s.id);
                    const isCreator = currentTeacher?.id ? s.id.includes(currentTeacher.id) : false;
                    return hasRegular || isCreator;
                  }).map(sch => {
                    return (
                      <div key={sch.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 leading-tight">
                             <Building className="w-4 h-4 text-emerald-600 shrink-0"/> 
                             <span>{sch.name}</span>
                           </h4>
                           <div className="flex gap-1.5 shrink-0 ml-2">
                               <>
                                 <button 
                                   onClick={() => {
                                     setEditingSchool(sch.id);
                                     setEditSchoolData(sch);
                                   }}
                                   className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold hover:bg-slate-200"
                                 >Sửa</button>
                                 <button 
                                   onClick={() => {
                                     customConfirm('Xác nhận xoá', 'Bạn có chắc muốn xoá trường này khỏi danh sách định vị? (Các lịch dạy liên quan sẽ KHÔNG bị xoá)', () => {
                                       onUpdateSchools(schools.map(s => s.id === sch.id ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() } : s));
                                     });
                                   }}
                                   className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100"
                                 >Xoá</button>
                               </>
                           </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5 leading-relaxed">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0"/> {sch.address || 'Chưa cập nhật địa chỉ'}
                        </p>
                        
                        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100 flex items-center justify-between">
                          <div className="text-[10px] text-slate-500">
                            <strong>Toạ độ GPS hiện tại:</strong><br/>
                            {sch.lat !== 0 && sch.lng !== 0 ? (
                              <span className="text-emerald-600 font-mono">{sch.lat.toFixed(5)}, {sch.lng.toFixed(5)}</span>
                            ) : (
                              <span className="text-rose-500">Chưa được thiết lập</span>
                            )}
                          </div>
                          {sch.lat !== 0 && (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <a 
                            href={sch.lat && sch.lng && sch.lat !== 0 && sch.lng !== 0 
                                  ? `https://www.google.com/maps/search/?api=1&query=${sch.lat},${sch.lng}`
                                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sch.address || sch.name)}`} 
                            target="_blank" rel="noreferrer"
                            className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold rounded-xl text-center transition inline-block"
                          >
                            TÌM ĐƯỜNG MÁP
                          </a>
                          {settings?.allowTeacherUpdateSchoolLocation && (
                            <button 
                              disabled={updatingGpsSchoolId === sch.id}
                              onClick={() => {
                                if (navigator.geolocation) {
                                  setUpdatingGpsSchoolId(sch.id);
                                  setGpsMessage(null);
                                  getAccurateCurrentPosition((pos) => {
                                    const updatedSchools = schools.map(s => s.id === sch.id ? { ...s, lat: pos.coords.latitude, lng: pos.coords.longitude } : s);
                                    if (!schools.find(s => s.id === sch.id)) {
                                      updatedSchools.push({...sch, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                    }
                                    onUpdateSchools(updatedSchools);
                                    
                                    setUpdatingGpsSchoolId(null);
                                    const acc = Math.round(pos.coords.accuracy);
                                    if (acc > 50) {
                                      setGpsMessage({type: 'error', text: `Cảnh báo: Đã ghim nhưng sai số cao (${acc}m). Hãy bật GPS chính xác trên điện thoại.`});
                                    } else {
                                      setGpsMessage({type: 'success', text: `Đã ghim GPS thành công (${acc}m)`});
                                    }
                                  }, (err) => {
                                    setUpdatingGpsSchoolId(null);
                                    setGpsMessage({type: 'error', text: 'Lỗi GPS: ' + err.message});
                                  });
                                } else {
                                  setGpsMessage({type: 'error', text: 'Trình duyệt không hỗ trợ GPS'});
                                }
                              }}
                              className={`flex-1 py-2 text-white text-[10px] font-bold rounded-xl text-center transition shadow ${updatingGpsSchoolId === sch.id ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}
                            >
                              {updatingGpsSchoolId === sch.id ? 'ĐANG LẤY...' : 'LƯU ĐỊA ĐIỂM GPS'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}
            {/* TAB: ACCOUNT (Mật Khẩu) */}
            {mobileTab === 'account' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold flex items-center gap-2"><User className="w-5 h-5 text-blue-600"/> Tài Khoản & Bảo Mật</h3>
                </div>
                
                <form onSubmit={handleChangePassword} className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-xs text-slate-800">Đổi Mật Khẩu Đăng Nhập</h4>
                  
                  {passwordMessage && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${passwordMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500">Mật khẩu hiện tại</label>
                    <input 
                      type="password" 
                      value={oldPassword} 
                      onChange={e => setOldPassword(e.target.value)} 
                      required 
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500" 
                      placeholder="Nhập mật khẩu hiện tại..." 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500">Mật khẩu mới</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      required 
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500" 
                      placeholder="Ít nhất 6 ký tự..." 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500">Xác nhận mật khẩu mới</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      required 
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500" 
                      placeholder="Nhập lại mật khẩu mới..." 
                    />
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-sm mt-2">
                    Cập Nhật Mật Khẩu
                  </button>
                </form>
              </div>
            )}

              </>
            )}
          </div>
        </div>

          {/* BOTTOM APP NAVIGATION BAR */}
            <div className="bg-white border-t border-slate-200 p-2 flex justify-around items-center rounded-b-[2rem] relative z-20">
              {[
                { id: 'home', label: 'Trang Chủ', icon: Sparkles },
                { id: 'schedule', label: 'Lịch Dạy', icon: Calendar },
                { id: 'salary', label: 'Lương', icon: DollarSign },
                { id: 'swap', label: 'Đơn Từ', icon: ArrowLeftRight },
                { id: 'substitute_tab', label: 'Dạy Dùm', icon: CalendarPlus },
                { id: 'school', label: 'Định Vị', icon: MapPin },
                { id: 'account', label: 'Tài Khoản', icon: User }
              ].filter(tab => {
                const isViewingSelf = currentTeacher?.id === currentUser?.teacherId;
                if (!isViewingSelf && !canViewAllTeachers) {
                  return tab.id === 'home' || tab.id === 'schedule'; // only allow home and schedule when viewing others without full permissions
                }
                return true;
              }).map(tab => {
                const Icon = tab.icon;
                const isSelected = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMobileTab(tab.id as any)}
                    className={`flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-xl transition cursor-pointer ${
                      isSelected ? 'text-blue-600 font-bold bg-blue-50/70 scale-105' : 'hover:text-slate-900 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-[9px] font-bold tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>


          {/* EDIT SCHEDULE MODAL */}
          {editingScheduleItem && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 overflow-hidden animate-spring">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4 text-blue-600"/> Sửa / Thêm Lịch Giảng Dạy</h3>
                  <button onClick={() => setEditingScheduleItem(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  
                  if (!editingScheduleItem.schoolId || editingScheduleItem.schoolId.trim() === '') {
                    onAddNotification("Thiếu thông tin", "Vui lòng nhập tên Trường Mầm Non!", "alert");
                    return;
                  }
                  if (!editingScheduleItem.classId || editingScheduleItem.classId.trim() === '') {
                    onAddNotification("Thiếu thông tin", "Vui lòng nhập tên Lớp Mầm Non!", "alert");
                    return;
                  }

                  try {
                    // Auto-create school and class if they were custom typed
                    let finalSchoolId = editingScheduleItem.schoolId;
                    let newSchoolsToSave = schools;
                    if (!schools.find(s => s.id === finalSchoolId)) {
                      finalSchoolId = `sch-${Date.now()}`;
                      newSchoolsToSave = [...schools, {
                        id: finalSchoolId,
                        name: (editingScheduleItem as any)._rawSchoolName || editingScheduleItem.schoolId, // original raw string
                        address: '', contactPerson: '', phone: '', lat: 0, lng: 0, qrCodeData: '', isDeleted: false
                      }];
                      await onUpdateSchools(newSchoolsToSave);
                    }

                    let finalClassId = editingScheduleItem.classId;
                    let newClassesToSave = classes;
                    if (!classes.find(c => c.id === finalClassId)) {
                      finalClassId = `cls-${Date.now()}`;
                      newClassesToSave = [...classes, {
                        id: finalClassId,
                        name: (editingScheduleItem as any)._rawClassName || editingScheduleItem.classId, // original raw string
                        schoolId: finalSchoolId,
                        studentCount: 0,
                        standardPeriods: 1,
                        isDeleted: false
                      }];
                      await onUpdateClasses(newClassesToSave);
                    }

                    // Save changes
                    const finalItem = { ...editingScheduleItem, schoolId: finalSchoolId, classId: finalClassId, isDeleted: false };

                    // Save changes
                    const exists = schedules.some(s => s.id === finalItem.id);
                    const newSchedules = exists 
                      ? schedules.map(s => s.id === finalItem.id ? finalItem : s)
                      : [...schedules, finalItem];
                    
                    await onUpdateSchedules(newSchedules);
                    
                    // Also synchronize existing attendance records with the updated schedule
                    const updatedAttendance = attendance.map(a => a.scheduleId === finalItem.id ? {
                      ...a,
                      periods: finalItem.periods,
                      schoolId: finalItem.schoolId,
                      classId: finalItem.classId
                    } : a);
                    await onUpdateAttendance(updatedAttendance);

                    if (currentTeacher) {
                      onAddAuditLog(
                        'Sửa lịch dạy cá nhân',
                        currentUser?.username || 'Teacher',
                        `Giáo viên ${currentTeacher.name} đã chủ động sửa lịch môn học của mình (${finalItem.periods} tiết)`
                      );
                    }
                    setEditingScheduleItem(null);
                  } catch (err: any) {
                    console.error("Lỗi khi lưu lịch", err);
                    onAddNotification("Lỗi hệ thống", "Có lỗi xảy ra khi lưu: " + err.message, "alert");
                  }
                }}>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Trường Mầm Non <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="Chọn hoặc nhập tên trường..."
                      value={(editingScheduleItem as any)._rawSchoolName !== undefined ? (editingScheduleItem as any)._rawSchoolName : (schools.find(s => s.id === editingScheduleItem.schoolId)?.name || editingScheduleItem.schoolId)} 
                      onChange={e => {
                        const val = e.target.value;
                        const matchedSchool = schools.find(s => s.name === val || s.id === val);
                        const newSchoolId = matchedSchool ? matchedSchool.id : val;
                        // If they select an existing school, auto-pick its first class IF they haven't typed a custom class name yet, 
                        // otherwise keep their custom class name.
                        let nextClassId = editingScheduleItem.classId;
                        if (matchedSchool) {
                           // Try to auto-select a class for convenience only if it's currently empty
                           if (!nextClassId) {
                             nextClassId = classes.find(c => c.schoolId === newSchoolId)?.id || '';
                           }
                        }
                        setEditingScheduleItem({ 
                          ...editingScheduleItem, 
                          schoolId: newSchoolId,
                          classId: nextClassId,
                          _rawSchoolName: val
                        } as any);
                      }}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Lớp Mầm Non <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      placeholder="Chọn hoặc nhập tên lớp..."
                      value={(editingScheduleItem as any)._rawClassName !== undefined ? (editingScheduleItem as any)._rawClassName : (classes.find(c => c.id === editingScheduleItem.classId)?.name || editingScheduleItem.classId)} 
                      onChange={e => {
                        const val = e.target.value;
                        const matchedClass = classes.find(c => c.name === val && c.schoolId === editingScheduleItem.schoolId);
                        setEditingScheduleItem({ 
                          ...editingScheduleItem, 
                          classId: matchedClass ? matchedClass.id : val,
                          _rawClassName: val
                        } as any);
                      }}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="flex flex-col justify-end h-full">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 truncate">Ngày Giảng Dạy</label>
                      <select 
                        value={editingScheduleItem.dayOfWeek}
                        onChange={e => setEditingScheduleItem({ ...editingScheduleItem, dayOfWeek: parseInt(e.target.value) })}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        {[2,3,4,5,6,7].map(d => <option key={d} value={d}>Thứ {d}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 leading-tight line-clamp-2">Thời Gian Kíp Dạy</label>
                      <input
                        type="text"
                        placeholder="VD: 8h30, 8h10..."
                        value={editingScheduleItem.session}
                        onChange={e => setEditingScheduleItem({ ...editingScheduleItem, session: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tổng Số Tiết</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0.1" max="10" 
                      placeholder="VD: 1, 0.5, 0.3..."
                      value={editingScheduleItem.periods !== undefined && editingScheduleItem.periods !== null ? editingScheduleItem.periods : ''}
                      onChange={e => setEditingScheduleItem({ ...editingScheduleItem, periods: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-800 font-mono"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0.3, 0.5, 0.6, 0.7, 1, 1.5, 2, 3].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditingScheduleItem({ ...editingScheduleItem, periods: val })}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition cursor-pointer ${
                            editingScheduleItem.periods === val 
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          {val}t
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        customConfirm('Xác nhận xoá', 'Bạn có chắc chắn muốn xoá lịch dạy này?', () => {
                          onUpdateSchedules(schedules.map(s => s.id === editingScheduleItem.id ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() } : s));
                          setEditingScheduleItem(null);
                        });
                      }}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs transition"
                    >
                      XOÁ LỊCH
                    </button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1">
                      <Save className="w-4 h-4"/> LƯU LẠI
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirm Modal */}
          {confirmModal && (
            <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-scaleIn">
                <div className="p-5">
                  <h3 className="font-bold text-slate-800 text-lg mb-2">{confirmModal.title}</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{confirmModal.message}</p>
                </div>
                <div className="flex border-t border-slate-100">
                  <button 
                    className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
                    onClick={() => setConfirmModal(null)}
                  >
                    Hủy
                  </button>
                  <div className="w-px bg-slate-100"></div>
                  <button 
                    className="flex-1 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alert Modal */}
          {alertModal && (
            <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-scaleIn">
                <div className="p-5">
                  <h3 className="font-bold text-slate-800 text-lg mb-2">{alertModal.title}</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{alertModal.message}</p>
                </div>
                <div className="flex border-t border-slate-100">
                  <button 
                    className="w-full py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition"
                    onClick={() => setAlertModal(null)}
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* School Closed Modal Overlay */}
          {schoolClosedModalSchedule && (() => {
            const sameSchoolSchedules = todaySchedules.filter(s => s.schoolId === schoolClosedModalSchedule.schoolId);
            const totalSelectedPeriods = sameSchoolSchedules
              .filter(s => selectedCancelScheduleIds.includes(s.id))
              .reduce((sum, s) => sum + (s.periods || 1), 0);

            return (
              <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-scaleIn">
                  <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center gap-3 border-b pb-3">
                      <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                          Báo Trường Nghỉ
                        </h3>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          {getSchoolName(schoolClosedModalSchedule.schoolId, schoolClosedModalSchedule)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Phần 1: Chọn tiết/lớp báo nghỉ */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          1. Chọn tiết / lớp trường báo nghỉ hôm nay:
                        </label>
                        {sameSchoolSchedules.length > 1 && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCancelScheduleIds([schoolClosedModalSchedule.id])}
                              className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold px-2 py-0.5 rounded-md cursor-pointer transition"
                            >
                              Chỉ tiết này
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCancelScheduleIds(sameSchoolSchedules.map(s => s.id))}
                              className="text-[10px] text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold px-2 py-0.5 rounded-md cursor-pointer transition"
                            >
                              Chọn tất cả ({sameSchoolSchedules.length} tiết)
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 max-h-48 overflow-y-auto">
                        {sameSchoolSchedules.map(scItem => {
                          const isSelected = selectedCancelScheduleIds.includes(scItem.id);
                          const isAlreadyCanceled = (schoolCancellations || []).some(c => 
                            c.teacherId === currentTeacher?.id && 
                            c.date === todayStr && 
                            c.id !== schoolClosedModalSchedule.id &&
                            (c.scheduleId === scItem.id || (c.schoolId === scItem.schoolId && c.classId === scItem.classId))
                          );

                          return (
                            <label
                              key={scItem.id}
                              className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                                isSelected 
                                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCancelScheduleIds(prev => Array.from(new Set([...prev, scItem.id])));
                                    } else {
                                      if (selectedCancelScheduleIds.length <= 1) {
                                        customAlert('Lưu ý', 'Phải chọn ít nhất 1 tiết/lớp để báo nghỉ!');
                                        return;
                                      }
                                      setSelectedCancelScheduleIds(prev => prev.filter(id => id !== scItem.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                                />
                                <div className="truncate">
                                  <span className="font-bold text-xs block truncate text-slate-800">
                                    Lớp {getClassName(scItem.classId)}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    Ca {getSessionShort(scItem.session)} • {scItem.periods} tiết
                                    {isAlreadyCanceled && <span className="text-amber-600 ml-1.5 font-bold">(Đang báo nghỉ)</span>}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                isSelected ? 'bg-rose-200/80 text-rose-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {scItem.periods}t
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        💡 Các tiết không được chọn vẫn giữ nguyên để thầy/cô tiếp tục dạy và điểm danh bình thường.
                      </p>
                    </div>
                    
                    {/* Phần 2: Chọn phương án báo nghỉ */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <p className="text-xs text-slate-800 font-bold">2. Chọn phương án báo nghỉ của trường:</p>
                      
                      <button 
                        type="button"
                        onClick={() => setClosedType('arrived')}
                        className={`w-full text-left p-3 rounded-2xl border transition flex flex-col gap-1 cursor-pointer ${
                          closedType === 'arrived' 
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            closedType === 'arrived' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {closedType === 'arrived' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                          </span>
                          <span className="text-xs font-bold">Đã tới trường mới báo nghỉ</span>
                        </div>
                        <span className="text-[10px] text-slate-500 pl-6">Giáo viên được tính <strong className="text-blue-600 font-extrabold">+1 tiết dạy</strong> hỗ trợ, không ảnh hưởng chuyên cần.</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setClosedType('notified')}
                        className={`w-full text-left p-3 rounded-2xl border transition flex flex-col gap-1 cursor-pointer ${
                          closedType === 'notified' 
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            closedType === 'notified' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {closedType === 'notified' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                          </span>
                          <span className="text-xs font-bold">Được báo trước khi tới trường</span>
                        </div>
                        <span className="text-[10px] text-slate-500 pl-6">Giáo viên không tính tiết, chuyển ca thành <strong>LỊCH RẢNH</strong> để nhận ca thay.</span>
                      </button>
                    </div>

                    {/* Phần 3: Lý do báo nghỉ */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-800 block">3. Lý do trường nghỉ:</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {['Trường tổ chức sự kiện', 'Sửa chữa cơ sở', 'Cúp điện / nước', 'Nghỉ đột xuất', 'Học sinh đi ngoại khóa'].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setClosedReason(r)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border transition font-medium cursor-pointer ${
                              closedReason === r 
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold' 
                                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={closedReason}
                        onChange={(e) => setClosedReason(e.target.value)}
                        placeholder="Nhập lý do cụ thể..."
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-rose-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setSchoolClosedModalSchedule(null)}
                      disabled={submittingClosed}
                      className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs border border-slate-200 transition cursor-pointer"
                    >
                      HỦY BỎ
                    </button>
                    <button 
                      type="button"
                      onClick={handleSubmitSchoolClosed}
                      disabled={submittingClosed || selectedCancelScheduleIds.length === 0}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-2xl text-xs shadow-md shadow-rose-500/15 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {submittingClosed ? 'ĐANG GỬI...' : `BÁO NGHỈ (${selectedCancelScheduleIds.length} TIẾT)`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Broadcast Announcement Modal Overlay */}
          {quickAnnouncement && !isTeacherJoined && !isQaDismissedTemp && 
           (!quickAnnouncement.targetUserId || 
            quickAnnouncement.targetUserId === currentTeacher?.id || 
            quickAnnouncement.targetUserId === currentUser?.id || 
            quickAnnouncement.targetUserId === currentUser?.teacherId) && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-blue-50/50 animate-scaleIn relative">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-500"></div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                      <Bell className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {quickAnnouncement.title}
                      </h3>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(quickAnnouncement.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap font-medium">
                    {quickAnnouncement.message}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                  <a
                    href="https://m.me/tuyendungmamnonTPHCM?ref=BAT_THONG_BAO"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20 transition active:scale-98 flex items-center justify-center gap-1.5 text-center"
                    onClick={() => {
                      if (currentTeacher?.id) {
                        fetch(`/api/teachers/${currentTeacher.id}/joined-notification`, { method: 'POST' }).catch(() => {});
                        currentTeacher.notificationToken = 'ACTIVATED_20261026';
                      }
                      localStorage.setItem('read_qa_id', quickAnnouncement.id);
                      setLastReadQaId(quickAnnouncement.id);
                      setIsQaDismissedTemp(true);
                    }}
                  >
                    <MessageCircle className="w-4 h-4 flex-shrink-0" /> BẬT THÔNG BÁO MESSENGER NGAY (1 CHẠM)
                  </a>
                  <button 
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded-2xl text-[11px] transition active:scale-98"
                    onClick={() => {
                      // Đóng tạm trong phiên này, lần sau vào app lại nhắc tiếp đến khi tham gia
                      setIsQaDismissedTemp(true);
                    }}
                  >
                    ĐỂ SAU (SẼ NHẮC LẠI ĐẾN KHI THAM GIA)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Proof Image Fullscreen Modal */}
          {selectedProofModal && (
            <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl space-y-3 p-4 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-xs text-slate-800 truncate">{selectedProofModal.title}</h4>
                  <button 
                    onClick={() => setSelectedProofModal(null)}
                    className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950/5 rounded-2xl p-2 min-h-[260px]">
                  <img 
                    src={selectedProofModal.url} 
                    alt="Minh chứng chi tiết" 
                    className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
                  />
                </div>
                <button
                  onClick={() => setSelectedProofModal(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Đóng xem ảnh
                </button>
              </div>
            </div>
          )}

          {/* Special Event 20/11 Voting Poll Modal */}

        </div>
      </div>
  );
}
