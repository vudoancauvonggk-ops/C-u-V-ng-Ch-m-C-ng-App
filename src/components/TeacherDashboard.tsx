import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Calendar, Clock, DollarSign, ArrowLeftRight, Check, AlertCircle, Bell, 
  MapPin, Camera, QrCode, Sparkles, Send, ShieldAlert, Smartphone, CheckCircle, RefreshCw, Edit2, X, Save, Image as ImageIcon, Building, CalendarPlus
} from 'lucide-react';
import { Teacher, School, ClassInfo, Schedule, AttendanceLog, ChangeRequest, SystemNotification, AppUser, AppSettings } from '../types';
import { calculateDistance } from '../utils/localStorage';
import { getAccurateCurrentPosition } from '../utils/gps';

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
}

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
  onAddNotification
}: TeacherDashboardProps) {
  // Current active teacher simulator state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  
  const rawPerms = typeof currentUser?.permissions === 'string' 
    ? (() => { try { return JSON.parse(currentUser.permissions || '[]'); } catch { return []; } })() 
    : (currentUser?.permissions || []);
  const userPermsArray = Array.isArray(rawPerms) ? rawPerms : (typeof rawPerms === 'string' ? [rawPerms] : []);

  const canViewAllTeachers = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_teachers');
  const canViewAllSchedules = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_schedules') || userPermsArray.includes('can_edit_schedule');
  const isRestrictedView = !canViewAllSchedules;
  const allowedTeachers = teachers.filter(t => !t.isDeleted && (!isRestrictedView || t.id === currentUser?.teacherId));
  const currentTeacher = allowedTeachers.find(t => t.id === selectedTeacherId) || allowedTeachers[0] || null;

  // Auto-select first teacher if state is empty and a new teacher is added
  useEffect(() => {
    if (!selectedTeacherId) {
      if (currentUser?.teacherId && allowedTeachers.some(t => t.id === currentUser.teacherId)) {
        setSelectedTeacherId(currentUser.teacherId);
      } else if (allowedTeachers.length > 0) {
        setSelectedTeacherId(allowedTeachers[0].id);
      }
    } else if (allowedTeachers.length > 0 && !allowedTeachers.some(t => t.id === selectedTeacherId)) {
      setSelectedTeacherId(allowedTeachers[0].id);
    }
  }, [allowedTeachers, selectedTeacherId, currentUser]);

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
  const [historyYear, setHistoryYear] = useState<string>('2026');
  const [historyMonth, setHistoryMonth] = useState<string>('06');
  
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

  // Selfie camera state
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // QR confirmation
  const [scannedQR, setScannedQR] = useState<string>('');
  const [isScanningQR, setIsScanningQR] = useState<boolean>(false);

  // Shift substitution form states
  const [reqType, setReqType] = useState<'sick_leave' | 'swap_shift' | 'substitute_teacher'>('substitute_teacher');
  const [reqDate, setReqDate] = useState<string>('');
  const [reqSession, setReqSession] = useState<string>('morning');
  const [reqReason, setReqReason] = useState<string>('');
  const [artCount, setArtCount] = useState<number>(1);
  const [reqStatusMessage, setReqStatusMessage] = useState<string>('');

  // Alarms
  const [activeAlarms, setActiveAlarms] = useState<Record<string, number>>({});
  const [editingAlarm, setEditingAlarm] = useState<{ id: string, timeString: string } | null>(null);
  const [editingMinutes, setEditingMinutes] = useState<number>(30);
  
  // Schedule Edit
  const [editingScheduleItem, setEditingScheduleItem] = useState<Schedule | null>(null);

  // Custom Background Image
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

  const saveAlarm = () => {
    if (!editingAlarm) return;
    setActiveAlarms(prev => ({ ...prev, [editingAlarm.id]: editingMinutes }));
    onAddNotification('Báo thức đã bật', `Hệ thống sẽ báo trước ${editingMinutes} phút khi đến ca dạy lúc ${editingAlarm.timeString}`, 'success');
    setEditingAlarm(null);
  };

  const removeAlarm = (scheduleId: string, time: string) => {
    setActiveAlarms(prev => {
      const next = { ...prev };
      delete next[scheduleId];
      return next;
    });
    onAddNotification('Báo thức đã tắt', `Đã tắt báo thức ca dạy lúc ${time}`, 'warning');
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

  // Find substitute assignments for today
  if (currentTeacher) {
    const todaySubRequests = changes.filter(c => 
      c.status === 'approved' && 
      c.date === todayStr && 
      c.targetTeacherId === currentTeacher.id
    );
    
    todaySubRequests.forEach(req => {
      const originalSchedules = schedules.filter(s => 
        !s.isDeleted &&
        s.teacherId === req.originalTeacherId && 
        s.dayOfWeek === currentDayOfWeek && 
        getSessionCategory(s.session) === req.session
      );
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

  // Handle webcam selfie activation
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedImage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera streaming not supported or dismissed in sandbox. Using premium animated avatar instead.", err);
    }
  };

  const captureSelfiePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        stopCamera();
      }
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
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      customAlert('Thông báo', 'Đã bật thông báo! Hệ thống sẽ nhắc nhở bạn khi ứng dụng đang mở.');
      new Notification('Đã bật thông báo', {
        body: 'Bạn sẽ nhận được nhắc nhở điểm danh trước mỗi ca dạy.',
        icon: '/favicon.ico'
      });
    } else {
      customAlert('Thông báo', 'Bạn đã từ chối quyền gửi thông báo.');
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

    if (settings?.requireSelfieCheckIn !== false && !capturedImage) {
      customAlert('Thông báo', "❌ YÊU CẦU BẮT BUỘC: Bạn buộc phải chụp một tấm ảnh Selfie thực tế tại cơ quan trước khi hệ thống ghi nhận thời lượng dạy do tính năng định vị vị trí tạm thời bị ADMIN khoá!");
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
    
    // Parse actual start time if session contains it (e.g. "09:00" or "Sáng (09:00)")
    const timeMatch = String(selectedSchedule.session).match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      limitHour = parseInt(timeMatch[1], 10);
      limitMinute = parseInt(timeMatch[2], 10);
    }
    
    const realNow = new Date();
    const isLateFlagged = realNow.getHours() > limitHour || (realNow.getHours() === limitHour && realNow.getMinutes() > limitMinute);
    let lateReason = '';
    if (isLateFlagged) lateReason = `Chấm công TRỄ. Giờ vào lớp quy định là ${limitHour.toString().padStart(2, '0')}:${limitMinute.toString().padStart(2, '0')} nhưng chấm lúc ${timeStr}. Tiết học này bị đánh dấu cần duyệt.`;

    const sessionSchedules = todaySchedules
      .filter(s => getSessionShort(s.session) === getSessionShort(selectedSchedule.session) && s.schoolId === selectedSchedule.schoolId)
      .filter(s => {
        const cName = getClassName(s.classId).toLowerCase();
        const sName = getSchoolName(s.schoolId, s).toLowerCase();
        if (cName.includes('chuyên môn') || sName.includes('chuyên môn') || cName.includes('họp') || sName.includes('họp')) return false;
        return true;
      });
    const uncheckedSchedules = sessionSchedules.filter(s => 
      !attendance.some(a => a.teacherId === currentTeacher.id && a.date === todayStr && a.scheduleId === s.id)
    );

    if (uncheckedSchedules.length === 0) {
      customAlert('Thông báo', "Bạn đã chấm công tất cả các lớp trong ca này rồi!");
      setIsCameraActive(false);
      return;
    }

    
    const targetFlagged = isCheatFlagged || isLateFlagged;
    const targetReason = isCheatFlagged ? cheatReason : lateReason;

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
         selfieImage: capturedImage,
         verificationMethod: scannedQR ? 'BOTH' : 'GPS',
         isVerified: !targetFlagged,
         isFlagged: targetFlagged,
         flagReason: targetReason,
         confirmedByAdmin: !targetFlagged
       };
    });

    onUpdateAttendance([...attendance, ...newLogs]);

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

  // Submit Shift Proposal
  const handleRequestShiftChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDate || !reqReason) {
      customAlert('Thông báo', "Vui lòng nhập đầy đủ thông tin biểu mẫu phép.");
      return;
    }

    const newReqId = `REQ00${changes.length + 1}`;
    const finalReason = reqType === 'art_performance' ? `[Số lượng: ${artCount}] - ${reqReason}` : reqReason;
    const newRequest: ChangeRequest = {
      id: newReqId,
      teacherId: currentTeacher.id,
      requestType: reqType,
      date: reqDate,
      session: reqSession,
      originalTeacherId: currentTeacher.id,
      targetTeacherId: undefined, // Admin will assign this later
      reason: finalReason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    onUpdateChanges([...changes, newRequest]);
    onAddAuditLog('Xin nghỉ/đổi ca/dạy thay', currentTeacher.name, `Gửi yêu cầu ${reqType === 'sick_leave' ? 'nghỉ ốm' : reqType === 'substitute_teacher' ? 'nhờ người dạy thay' : 'đổi ca'} ngày ${reqDate}.`);
    
    onAddNotification(
      'Yêu cầu duyệt phép mới 📣',
      `${currentTeacher.name} gửi đơn yêu cầu ${reqType === 'sick_leave' ? 'xin nghỉ' : reqType === 'substitute_teacher' ? 'nhờ dạy thay' : 'đổi ca'} ngày ${reqDate}. Đợi Admin duyệt và xếp giáo viên thế.`,
      'info'
    );

    setReqStatusMessage('Gửi đơn xin đổi ca thành công! Vui lòng chờ Giám đốc duyệt chốt.');
    setReqReason('');
    
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
  const thisMonthLogs = currentTeacher ? attendance.filter(a => !(a as any).isDeleted && a.teacherId === currentTeacher.id && a.date.startsWith(reportMonth) && (a.confirmedByAdmin || a.isVerified)) : [];
  
  // Find substitute logs
  const approvedSubRequests = currentTeacher ? changes.filter(c => c.status === 'approved' && c.targetTeacherId === currentTeacher.id && c.date.startsWith(reportMonth)) : [];
    const substituteLogs = thisMonthLogs.filter(log => {
    const sched = schedules.find(s => !s.isDeleted && s.id === log.scheduleId);
    return sched && sched.teacherId !== currentTeacher?.id;
  });
  const regularLogs = thisMonthLogs.filter(log => {
    const sched = schedules.find(s => !s.isDeleted && s.id === log.scheduleId);
    return !sched || sched.teacherId === currentTeacher?.id;
  });

  // Áp dụng Phụ cấp xăng xe (500k) và Phụ cấp chuyên cần (300k - mất nếu đã nghỉ/xin phép)
  const getSessionCategory = (sess: string) => {
    const s = (sess || '').toLowerCase();
    const timeMatch = s.match(/(\d{1,2})[:h](\d{2})?/);
    let minutes = 0;
    if (timeMatch) {
       let hour = parseInt(timeMatch[1], 10);
       const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
       if (s.includes('chiều') && hour < 12) hour += 12;
       minutes = hour * 60 + min;
    } else if (s === 'morning' || s.includes('sáng')) {
       minutes = 6 * 60;
    } else if (s === 'afternoon' || s.includes('chiều')) {
       minutes = 13 * 60;
    }
    return minutes < 12 * 60 ? 'morning' : 'afternoon';
  };

  const adjustPeriods = (logs: AttendanceLog[]) => {
    const groups: Record<string, AttendanceLog[]> = {};
    logs.forEach(l => {
      const key = l.date + '_' + getSessionCategory(l.session);
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    let total = 0;
    Object.values(groups).forEach(group => {
      let sum = group.reduce((acc, curr) => acc + curr.periods, 0);
      if (sum === 1) sum = 2;
      else if (sum === 2) sum = 2.5;
      total += sum;
    });
    return total;
  };

  const regularPeriods = adjustPeriods(regularLogs);
  const substitutePeriods = adjustPeriods(substituteLogs);
  
  let bonusPeriodsDict: Record<string, number> = {};
  try { if (currentTeacher?.bonusPeriodsJSON) bonusPeriodsDict = JSON.parse(currentTeacher.bonusPeriodsJSON); } catch(e) {}
  const currentBonusPeriods = bonusPeriodsDict[reportMonth] || 0;

  const totalVerifiedSchedules = regularPeriods + substitutePeriods + currentBonusPeriods;
  
  const SUB_HOURLY_RATE = 55000;
  const regularWagesEarned = currentTeacher ? (regularPeriods + currentBonusPeriods) * currentTeacher.hourlyRate : 0;
  const substituteWagesEarned = getSubstituteWages(substitutePeriods, SUB_HOURLY_RATE); // simple calc
  const totalWagesEarned = regularWagesEarned + substituteWagesEarned;
  
  // Helper to allow referencing avoiding TS errors
  function getSubstituteWages(periods: number, rate: number) { return periods * rate; }
  
  // Áp dụng Phụ cấp xăng xe (500k) và Phụ cấp chuyên cần (300k - mất nếu đã nghỉ/xin phép)
  const hasApprovedLeave = currentTeacher ? changes.some(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher')) : false;
  const artEvents = currentTeacher ? changes.filter(c => c.teacherId === currentTeacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance') : [];
  let artPerformanceBonus = 0;
  artEvents.forEach(c => {
    const match = c.reason.match(/\[Số lượng: (\d+)\]/);
    if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
    else artPerformanceBonus += 100000;
  });

  const currentAllowance = currentTeacher ? (currentTeacher.monthlyAllowance || 500000) : 0;
  const potentialBonus = currentTeacher ? (currentTeacher.bonus || 300000) : 0;
  const currentBonus = currentTeacher ? (hasApprovedLeave ? 0 : potentialBonus) + artPerformanceBonus : 0;

  const netEarnings = currentTeacher ? totalWagesEarned + currentAllowance + currentBonus - currentTeacher.deduction : 0;

  if (!currentTeacher) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Smartphone className="w-12 h-12 mb-4 text-slate-300" />
        <h3 className="text-lg font-bold text-slate-700">Không có quyền truy cập</h3>
        <p className="text-sm mt-2 max-w-xs text-center">Tài khoản của bạn không được cấp quyền xem hoặc chưa được gắn dữ liệu giáo viên.</p>
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

                    {/* TODAY LESSONS FEED HIGHLIGHT */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-neutral-400 tracking-wider font-mono">LỊCH DẠY CỦA BẠN HÔM NAY (THỨ {currentDayOfWeek})</h4>
                      
                      <div className="space-y-2.5">
                        {todaySchedules.map(sc => {
  const isCheckedIn = attendance.some(a => a.teacherId === currentTeacher.id && a.date === todayStr && a.scheduleId === sc.id);
  return (
    <div key={sc.id} className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl border border-neutral-150 transition flex items-center justify-between gap-3 text-xs shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-neutral-800">Thứ {sc.dayOfWeek}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
            sc.session === 'morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
          }`}>
            {getSessionShort(sc.session).toUpperCase()}
          </span>
        </div>
        <p className="font-bold text-slate-900 text-sm">{getClassName(sc.classId)}</p>
        <p className="text-[11px] text-neutral-500 truncate max-w-44">{getSchoolName(sc.schoolId, sc)}</p>
      </div>

      <div className="text-right shrink-0">
        <span className="text-[10px] font-mono text-neutral-400 block font-bold mb-1">Số tiết: {sc.periods}t</span>
        {isCheckedIn ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            ✓ Đã chấm
          </span>
        ) : (
          <button 
            onClick={() => {
              setSelectedScheduleId(sc.id);
              setMobileTab('checkin');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-1 px-3 rounded-full text-[10px] transition"
          >
            Điểm Danh
          </button>
        )}
      </div>
    </div>
  );
})}

                        
                <div className="flex gap-2">
                  <button onClick={handleEnableNotifications} className="w-full bg-amber-50 text-amber-700 p-2.5 rounded-2xl border border-amber-100 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1">
                    <Bell className="w-3 h-3" /> BẬT THÔNG BÁO APP
                  </button>
                </div>

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
                             {changes.filter(c => c.targetTeacherId === currentTeacher?.id && c.status === 'approved').map(c => {
                               const [y, m, d] = c.date.split('-');
                               const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                               const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                               const originalSchedule = schedules.find(s => s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek && getSessionCategory(s.session) === c.session);
                               if (!originalSchedule) return null;
                               return <option key={`sub_${originalSchedule.id}`} value={originalSchedule.id}>[Dạy Dùm] {getSchoolName(originalSchedule.schoolId, originalSchedule)} - Lớp {getClassName(originalSchedule.classId)} ({c.date})</option>;
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
                              <div 
                                className="flex items-center gap-1.5 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer" 
                                onClick={() => {
                                  if (activeAlarms[l.id]) {
                                    removeAlarm(l.id, timeString);
                                  } else {
                                    setEditingAlarm({ id: l.id, timeString });
                                    setEditingMinutes(30);
                                  }
                                }}
                              >
                                <Clock className={`w-3 h-3 ${activeAlarms[l.id] ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className={`text-[9px] ${activeAlarms[l.id] ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                                  {activeAlarms[l.id] ? `Hẹn trước ${activeAlarms[l.id]}p` : 'Báo Thức'}
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 flex justify-between">
                              <span>{getSchoolName(l.schoolId, l)}</span>
                              <span className="font-semibold">Ca {getSessionLabel(l.session)}</span>
                            </div>
                            <div className="text-[9px] text-blue-600 font-semibold">{l.periods} tiết dạy tiêu chuẩn</div>
                            
                            {/* Inline Alarm Editor */}
                            {editingAlarm?.id === l.id && (
                              <div className="absolute right-0 top-8 bg-white border border-slate-200 shadow-xl rounded-xl p-3 z-10 w-48 text-left animate-fadeIn">
                                <h5 className="text-[10px] font-bold text-slate-700 mb-2">Hẹn giờ báo thức</h5>
                                <p className="text-[9px] text-slate-500 mb-2">Báo trước khi ca dạy bắt đầu ({timeString}):</p>
                                <div className="flex gap-1 mb-3 flex-wrap">
                                  {[15, 30, 45, 60, 90].map(mins => (
                                    <button 
                                      key={mins}
                                      onClick={() => setEditingMinutes(mins)}
                                      className={`text-[9px] px-2 py-1 rounded-md transition ${editingMinutes === mins ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                      {mins}p
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingAlarm(null)} className="flex-1 text-[9px] py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold">Huỷ</button>
                                  <button onClick={saveAlarm} className="flex-1 text-[9px] py-1.5 rounded-lg bg-emerald-600 text-white font-bold">Lưu</button>
                                </div>
                              </div>
                            )}
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
                  <h3 className="font-bold text-sm">Chấm Công Trực Tuyến</h3>
                  <button onClick={() => setMobileTab('home')} className="text-neutral-500 font-bold">Quay Lại</button>
                </div>

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
                            {getSessionShort(sc.session)} - Lớp {getClassName(sc.classId)} 
                            {(sc as any).isSubstitute && ' (DẠY THẾ)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSchedule && targetSchool && (
                      <div className="space-y-4">
                        
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
                          
                          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex flex-col items-center justify-center">
                            {isCameraActive ? (
                              <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover scale-x-[-1]"
                              />
                            ) : capturedImage ? (
                              <img src={capturedImage} alt="captured thumbnail" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center space-y-1.5 text-neutral-400 p-4">
                                <Camera className="h-8 w-8 mx-auto opacity-40 text-blue-600" />
                                <p className="text-[10px] leading-normal">Bắt buộc tự chụp chân dung tại bục giảng để kiểm tra gian lận</p>
                              </div>
                            )}

                            {/* Hidden canvas for static draw capture */}
                            <canvas ref={canvasRef} className="hidden" />
                          </div>

                          {/* Webcam buttons togglers */}
                          <div className="flex gap-2">
                            {isCameraActive ? (
                              <button 
                                type="button" 
                                onClick={captureSelfiePhoto}
                                className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                              >
                                <Check className="h-4.5 w-4.5" /> Bấm Chụp Ảnh
                              </button>
                            ) : (
                              <button 
                                type="button" 
                                onClick={startCamera}
                                className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1"
                              >
                                <Camera className="h-4.5 w-4.5" /> Kích Hoạt Camera
                              </button>
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
                        className="w-full py-3 text-white bg-slate-900 rounded-2xl font-bold tracking-tight hover:bg-slate-800 transition shadow-md"
                      >
                        Nộp Chấm Công Check-In
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
                      onChange={(e) => setReqType(e.target.value as any)}
                    >
                      <option value="sick_leave">Nghỉ ốm / Việc bận cá nhân (Mất chuyên cần)</option>
                      <option value="swap_shift">Đổi ca dạy với Giáo viên khác</option>
                      <option value="substitute_teacher">Nhờ người dạy thay (55.000 VNĐ/tiết)</option>
                      <option value="art_performance">Coi diễn văn nghệ (100k/trường, Giữ chuyên cần)</option>
                    </select>
                  </div>
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
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Lý do / Tên trường chi tiết *</label>
                    <textarea 
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                      placeholder="Trình bày lý do..."
                      rows={3}
                      required
                      className="w-full border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition"
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
                      {changes.filter(c => c.teacherId === currentTeacher.id).map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-blue-900 block">
                                {c.requestType === 'sick_leave' ? 'Nghỉ có phép' : 
                                 c.requestType === 'swap_shift' ? 'Đổi ca dạy' : 
                                 c.requestType === 'art_performance' ? 'Coi diễn văn nghệ' : 'Nhờ người dạy thay'}
                              </span>
                              <span className="text-[10px] text-slate-500">{c.date} - {c.session === 'morning' ? 'Sáng' : 'Chiều'}</span>
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
                  {changes.filter(c => c.targetTeacherId === currentTeacher.id && c.status === 'approved').length === 0 ? (
                    <p className="text-center text-slate-400 py-4 italic text-[11px]">Chưa có lịch dạy dùm nào được phân công.</p>
                  ) : (
                    changes.filter(c => c.targetTeacherId === currentTeacher.id && c.status === 'approved').map(c => {
                      const [y, m, d] = c.date.split('-');
                      const reqDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                      const reqDayOfWeek = reqDateObj.getDay() === 0 ? 8 : reqDateObj.getDay() + 1;
                      const originalSchedules = schedules.filter(s => !s.isDeleted && s.teacherId === c.originalTeacherId && s.dayOfWeek === reqDayOfWeek && getSessionCategory(s.session) === c.session);
                      
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
                            const origTeacher = allowedTeachers.find(t => t.id === c.originalTeacherId) || { name: 'Giáo viên gốc' };
                            
                            return (
                              <div key={originalSchedule.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                                  {c.date} - Ca {c.session === 'morning' ? 'Sáng' : 'Chiều'}
                                </div>
                                
                                <h4 className="font-bold text-blue-900 mt-2 mb-1">Dạy thay cho: {origTeacher.name}</h4>
                                <div className="space-y-1 mb-3 text-slate-700">
                                  <p><span className="font-semibold text-slate-500">Trường:</span> {schSchool?.name}</p>
                                  <p><span className="font-semibold text-slate-500">Lớp:</span> {schClass?.name}</p>
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
                                        setShowMakeupForm(true);
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
            
            {/* TAB: SALARY SLIP (BẢNG LƯƠNG CHI TIẾT TẠM TÍNH) */}
            {mobileTab === 'salary' && (
              <div className="space-y-4 animate-fadeIn text-xs">
                <h3 className="font-bold text-sm border-b pb-2">Bảng lương tạm tính của bạn</h3>
                <p className="text-[11px] text-slate-500">Giải trình thù lao tháng {reportMonthDisplay} dựa trên số tiết dạy thực tế ghi nhận thành công từ GPS/Webcam</p>

                <div className="space-y-3 pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                    <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">TIẾT DẠY ĐƯỢC DUYỆT CÔNG THÁNG NÀY</span>
                    <strong className="text-2xl text-blue-900 font-mono">{totalVerifiedSchedules} <span className="text-xs font-normal text-slate-500">tiết</span></strong>
                  </div>

                  {/* Math breakdowns list */}
                  <div className="divide-y divide-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Họ và tên:</span>
                      <strong className="text-slate-800">{currentTeacher.name}</strong>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Đơn giá (chính):</span>
                      <span className="font-mono">{currentTeacher.hourlyRate.toLocaleString('vi-VN')} đ /tiết</span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Dạy chính ({regularPeriods} tiết):</span>
                      <span className="font-mono font-semibold">{((regularPeriods || 0) * (currentTeacher?.hourlyRate || 0)).toLocaleString('vi-VN')} đ</span>
                    </div>

                    {currentBonusPeriods > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Tiết bổ sung hệ thống ({currentBonusPeriods} tiết):</span>
                        <div className="text-right">
                          <span className="font-mono text-purple-600 font-semibold">+{((currentBonusPeriods || 0) * (currentTeacher?.hourlyRate || 0)).toLocaleString('vi-VN')} đ</span>
                          <span className="block text-[9px] text-purple-500 italic">Hỗ trợ dạy 1, 2 tiết</span>
                        </div>
                      </div>
                    )}

                    {substitutePeriods > 0 && (
                      <div className="flex justify-between pt-2">
                        <span className="text-slate-500">Dạy thay ({substitutePeriods} tiết):</span>
                        <div className="text-right">
                          <span className="font-mono text-blue-600 font-semibold">+{substituteWagesEarned.toLocaleString('vi-VN')} đ</span>
                          <span className="block text-[9px] text-blue-500 italic">55.000 đ/tiết dạy thế</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Phụ cấp xăng xe:</span>
                      <span className="font-mono text-emerald-600">+{currentAllowance.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Thưởng chuyên cần / Văn nghệ:</span>
                      <div className="text-right flex flex-col items-end">
                        {hasApprovedLeave ? (
                          <span className="font-mono text-red-500 line-through text-[10px]">{potentialBonus.toLocaleString('vi-VN')} đ</span>
                        ) : (
                          <span className="font-mono text-emerald-600 text-xs">+{potentialBonus.toLocaleString('vi-VN')} đ</span>
                        )}
                        {artPerformanceBonus > 0 && (
                          <span className="font-mono text-blue-600 text-xs mt-0.5">+{artPerformanceBonus.toLocaleString('vi-VN')} đ (Văn nghệ)</span>
                        )}
                        {hasApprovedLeave && (
                          <span className="text-[9px] text-red-500 italic mt-0.5">Mất C.Cần do xin phép/nghỉ</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500">Khấu trừ phạt đi trễ:</span>
                      <span className="font-mono text-red-500">-{currentTeacher.deduction.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between pt-3 text-sm font-extrabold border-t border-slate-200">
                      <span className="text-slate-900">TỔNG THỰC LĨNH TẠM TÍNH:</span>
                      <span className="text-blue-700 font-mono text-base">{netEarnings.toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-neutral-400 italic bg-neutral-50 p-2.5 rounded-xl leading-normal">
                    ⚠️ <b>Lưu ý:</b> Bảng lương này tự động đồng chỉnh từ lịch chấm công hằng ngày. Chỉ khi Admin phê duyệt, số liệu mới chính thức được ghi nhận để thanh toán vào cuối tháng.
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
                    const hasSub = changes.some(c => c.status === 'approved' && c.targetTeacherId === currentTeacher?.id && schedules.some(sched => sched.teacherId === c.originalTeacherId && sched.schoolId === s.id));
                    const isCreator = currentTeacher?.id ? s.id.includes(currentTeacher.id) : false;
                    return hasRegular || hasSub || isCreator;
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
                    
                    if (currentTeacher) {
                      onAddAuditLog(
                        'Sửa lịch dạy cá nhân',
                        currentUser?.username || 'Teacher',
                        `Giáo viên ${currentTeacher.name} đã chủ động sửa lịch môn học của mình`
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
                      min="1" max="10" 
                      value={editingScheduleItem.periods}
                      onChange={e => setEditingScheduleItem({ ...editingScheduleItem, periods: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="pt-2 flex justify-between items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        customConfirm('Xác nhận xoá', 'Bạn có chắc chắn muốn xoá lịch dạy này?', () => {
                          onUpdateSchedules(schedules.filter(s => s.id !== editingScheduleItem.id));
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

        </div>
      </div>
  );
}
