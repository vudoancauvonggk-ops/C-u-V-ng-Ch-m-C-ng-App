import React, { useState, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Users, Building, Calendar, DollarSign, FileSpreadsheet, FileText, 
  Plus, Edit2, Trash2, GripVertical, Check, X, ShieldAlert, MapPin, QrCode, 
  Clock, ArrowLeftRight, Search, Printer, RefreshCw, AlertTriangle, Eye, CheckCircle2,
  ShieldCheck, Download, Upload, Activity, Camera, Megaphone, Send, GitMerge
} from 'lucide-react';
import { Teacher, School, ClassInfo, Schedule, AttendanceLog, ChangeRequest, AuditLog, SystemNotification, AppUser, AppSettings, MeetingAttendance } from '../types';
import SheetsSyncModal from './SheetsSyncModal';
import SystemHealth from './SystemHealth';
import SchoolPayrollTab from './SchoolPayrollTab';

const AVAILABLE_PERMISSIONS = [
  { value: 'can_view_all_teachers', label: 'Xem hồ sơ & thù lao tất cả giáo viên' },
  { value: 'can_view_all_schedules', label: 'Xem lịch dạy chi tiết từng giáo viên' },
  { value: 'can_view_reports', label: 'Xem báo cáo chi phí & bảng lương' },
  { value: 'can_approve_attendance', label: 'Phê duyệt chấm công lớp học' },
  { value: 'can_approve_changes', label: 'Duyệt thay ca, đổi lịch & phép' },
  { value: 'can_view_audit_logs', label: 'Truy cập nhật ký vết bảo mật' },
  { value: 'can_edit_schedule', label: 'Sửa đổi lịch dạy hàng tuần' },
  { value: 'can_edit_school_address', label: 'Được quyền chỉnh sửa địa chỉ trường học' },
  { value: 'can_manage_meeting_attendance', label: 'Điểm danh họp & chuyên môn' }
];

const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
};

interface AdminDashboardProps {
  teachers: Teacher[];
  schools: School[];
  classes: ClassInfo[];
  schedules: Schedule[];
  attendance: AttendanceLog[];
  changes: ChangeRequest[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
  users: AppUser[];
  meetingAttendance?: MeetingAttendance[];
  settings?: AppSettings;
  currentUser: AppUser | null;
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateSchools: (schools: School[]) => void;
  onUpdateClasses: (classes: ClassInfo[]) => void;
  onUpdateSchedules: (schedules: Schedule[]) => void;
  onUpdateAttendance: (attendance: AttendanceLog[]) => void;
  onUpdateChanges: (changes: ChangeRequest[]) => void;
  onUpdateUsers: (users: AppUser[]) => void;
  onUpdateMeetingAttendance?: (meetingAttendance: MeetingAttendance[]) => void;
  onUpdateSettings?: (settings: AppSettings) => void;
  onAddAuditLog: (action: string, actor: string, details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'warning' | 'alert' | 'success', targetTeacherId?: string) => void;
  onBulkSync?: (teachers: Teacher[], schools: School[], classes: ClassInfo[], schedules: Schedule[], mode: 'overwrite' | 'update') => Promise<void>;
  onSyncState?: (state: any) => void;
  schoolCancellations: any[];
  onUpdateSchoolCancellations: (updated: any[]) => void;
}


const SortableTeacherRow = ({ teacher, formatVND, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: teacher.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition relative">
      <td className="p-3 font-mono font-bold text-slate-700 flex items-center gap-2">
        <button {...attributes} {...listeners} className="text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {teacher.id}
      </td>
      <td className="p-3">
        <div className="font-semibold text-slate-950 font-sans">{teacher.name}</div>
        <div className="text-[11px] text-slate-400">Sinh: {teacher.dob}</div>
      </td>
      <td className="p-3">
        <div className="text-slate-700 text-xs font-medium">{teacher.phone}</div>
        <div className="text-[11px] text-slate-400 font-mono">{teacher.email}</div>
      </td>
      <td className="p-3 text-right font-mono text-blue-700 font-bold">{formatVND(teacher.hourlyRate)}</td>
      <td className="p-3 text-right font-mono text-slate-700 font-semibold">{formatVND(teacher.monthlyAllowance)}</td>
      <td className="p-3 text-right font-mono text-emerald-600 font-semibold">+{formatVND(teacher.bonus)}</td>
      <td className="p-3 text-right font-mono text-red-600 font-semibold">-{formatVND(teacher.socialInsurance || 0)}</td>
      <td className="p-3 text-right font-mono text-amber-600 font-semibold">-{formatVND(teacher.advanceSalary || 0)}</td>
      <td className="p-3 text-right font-mono text-red-600 font-semibold">-{formatVND(teacher.deduction)}</td>
      <td className="p-3 text-center">
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
          teacher.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
        }`}>
          {teacher.status === 'active' ? 'ĐANG DẠY' : 'ĐÃ NGHỈ'}
        </span>
      </td>
      <td className="p-3 text-center">
        <div className="flex justify-center gap-2">
          <button onClick={() => onEdit(teacher)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Sửa hồ sơ">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(teacher.id, teacher.name)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Cho nghỉ việc">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};


const SortableSchoolRow = ({ sch, schClasses, onEdit, onDelete, setSelectedQR }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sch.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <div ref={setNodeRef} style={style} className="pt-3 flex items-start justify-between gap-4 relative group">
      <button {...attributes} {...listeners} className="absolute -left-6 top-4 opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-sm">{sch.name}</h4>
        <p className="text-xs text-slate-500 font-sans">{sch.address}</p>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
          <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-mono">Quản lý: <b>{sch.contactPerson} ({sch.phone})</b></span>
          <span className="bg-blue-50 text-blue-700 border border-blue-50 px-1.5 py-0.2 rounded font-mono">GPS: <b>{sch.lat.toFixed(4)}, {sch.lng.toFixed(4)}</b></span>
          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold max-w-sm truncate inline-block align-bottom" title={schClasses.map((c: any) => c.name).join(', ')}>
            Lớp học: {schClasses.length > 0 ? (schClasses.length > 5 ? schClasses.slice(0, 5).map((c: any) => c.name).join(', ') + '... (+' + (schClasses.length - 5) + ' lớp)' : schClasses.map((c: any) => c.name).join(', ')) : 'Chưa phân lớp'}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button onClick={() => { const mapLink = `https://www.google.com/maps/search/?api=1&query=${sch.lat},${sch.lng}`; navigator.clipboard.writeText(`Định vị trường ${sch.name}:\n${mapLink}`); alert('Đã copy link bản đồ vào bộ nhớ đệm!'); }} className="flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-100 font-bold" title="Chia sẻ link Google Maps">
          <MapPin className="h-3 w-3" /> Bản Đồ
        </button>
        <button 
          onClick={() => setSelectedQR({ schoolName: sch.name, code: sch.qrCodeData })}
          className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded mt-1"
          title="Hiển thị camera QR đối soát tại chỗ"
        >
          <QrCode className="h-3 w-3" /> QR Trường
        </button>
        <div className="flex items-center gap-1 mt-1">
          <button onClick={() => onEdit(sch)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="Sửa thông tin">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(sch.id, sch.name)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition" title="Xóa trường học">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};


const SortableReportRow = ({ teacher, totalPeriods, formatVND, baseLessonsSalary, allowance, hasApprovedLeave, attendanceBonus, potentialBonus, artPerformanceBonus, socialInsurance, advanceSalary, deduction, finalWage, currentBonusPeriods, onUpdateBonus, isAdmin }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: teacher.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition relative group">
      <td className="p-3 font-mono font-bold text-slate-700 flex items-center gap-2">
        <button {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {teacher.id}
      </td>
      <td className="p-3 font-semibold text-slate-900">{teacher.name}</td>
      <td className="p-3 text-center font-mono font-bold text-blue-600">{totalPeriods} tiết</td>
      <td className="p-3 text-right font-mono">{formatVND(teacher.hourlyRate)}</td>
      <td className="p-3 text-center">
        <input 
          type="number" 
          step="0.5"
          className="w-16 px-2 py-1 text-xs border border-indigo-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-455"
          value={currentBonusPeriods || ''}
          placeholder="0"
          disabled={!isAdmin}
          title={isAdmin ? "Nhập số tiết điều chỉnh (+ để tăng, - để giảm, ví dụ: -1.5)" : "Chỉ Admin mới có quyền điều chỉnh số tiết"}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onUpdateBonus(val);
          }}
        />
      </td>
      <td className="p-3 text-right font-mono text-slate-600 font-medium">{formatVND(baseLessonsSalary)}</td>
      <td className="p-3 text-right font-mono text-slate-600">
        {formatVND(allowance)} {hasApprovedLeave && <span className="block text-[9px] text-orange-500 italic">Xăng xe</span>}
      </td>
      <td className="p-3 text-right font-mono text-emerald-600">
        {attendanceBonus > 0 ? `+${formatVND(attendanceBonus)}` : <span className="text-red-500 text-[10px] block line-through">{formatVND(potentialBonus)}</span>}
        {attendanceBonus === 0 && <span className="block text-[9px] text-red-500 italic">Mất chuyên cần do xin phép</span>}
      </td>
      <td className="p-3 text-right font-mono text-red-500">{socialInsurance > 0 ? `-${formatVND(socialInsurance)}` : '-'}</td>
      <td className="p-3 text-right font-mono text-amber-600">{advanceSalary > 0 ? `-${formatVND(advanceSalary)}` : '-'}</td>
      <td className="p-3 text-right font-mono text-red-500">{deduction > 0 ? `-${formatVND(deduction)}` : '-'}</td>
      <td className="p-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50 text-base">{formatVND(finalWage)}</td>
    </tr>
  );
};


const SortableUserRow = ({ u, linkedTeacher, AVAILABLE_PERMISSIONS, setEditingUser, setShowUserModal, handleDeleteUser }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: u.id });
  const style = { transform: CSS.Transform.toString(transform), transition, backgroundColor: transform ? 'rgba(255,255,255,0.9)' : undefined, zIndex: transform ? 999 : 'auto' };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/50 transition relative group">
      <td className="p-4 font-bold text-slate-900 font-mono flex items-center gap-2">
        <button {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {u.username}
        {u.isDeleted && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-500 uppercase tracking-widest border border-rose-200" title="Tài khoản này đang bị vô hiệu hoá">Vô hiệu hoá</span>}
      </td>
      <td className="p-4 font-mono text-slate-400">{u.password}</td>
      <td className="p-4">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          u.role === 'admin' 
            ? 'bg-red-50 text-red-600 border border-red-100' 
            : u.role === 'manager'
            ? 'bg-amber-50 text-amber-600 border border-amber-100'
            : u.role === 'hr'
            ? 'bg-purple-50 text-purple-600 border border-purple-100'
            : u.role === 'training'
            ? 'bg-cyan-50 text-cyan-600 border border-cyan-100'
            : u.role === 'accounting'
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            : 'bg-blue-50 text-blue-600 border border-blue-100'
        }`}>
          {u.role === 'admin' ? '🔥 Admin' : u.role === 'manager' ? '⚡ Quản lý' : u.role === 'hr' ? '👥 Nhân sự' : u.role === 'training' ? '🎓 Đào tạo' : u.role === 'accounting' ? '💰 Kế toán' : '🍀 Giáo viên'}
        </span>
      </td>
      <td className="p-4">
        {linkedTeacher ? (
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800">{linkedTeacher.name}</span>
            <span className="block text-[9px] font-mono text-slate-400">Mã: {linkedTeacher.id}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px] italic">Không liên kết</span>
        )}
      </td>
      <td className="p-4 max-w-xs">
        {u.role === 'admin' ? (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">Tất cả đặc quyền hệ thống</span>
        ) : ensureArray(u.permissions).length === 0 ? (
          <span className="text-slate-400 italic text-[11px]">Chưa cấp quyền riêng lẻ</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {ensureArray(u.permissions).map((p: string) => {
              const friendly = AVAILABLE_PERMISSIONS.find((ap: any) => ap.value === p)?.label || p;
              return (
                <span key={p} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md" title={friendly}>
                  {p.replace('can_', '')}
                </span>
              );
            })}
          </div>
        )}
      </td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => {
              setEditingUser({ 
                ...u, 
                permissions: ensureArray(u.permissions)
              });
              setShowUserModal(true);
            }}
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
            title="Chỉnh sửa tài khoản & phân quyền"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteUser(u.id, u.username)}
            className={`p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer ${
              u.username === 'admin' ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            disabled={u.username === 'admin'}
            title="Xóa tài khoản vĩnh viễn"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function AdminDashboard({
  teachers: rawTeachers,
  schools: rawSchools,
  classes: rawClasses,
  schedules: rawSchedules,
  attendance: rawAttendance,
  changes: rawChanges,
  auditLogs,
  notifications,
  users = [],
  meetingAttendance: rawMeetingAttendance = [],
  settings,
  currentUser,
  onSyncState,
  onUpdateTeachers,
  onUpdateSchools,
  onUpdateClasses,
  onUpdateSchedules,
  onUpdateAttendance,
  onUpdateChanges,
  onUpdateUsers,
  onUpdateMeetingAttendance,
  onUpdateSettings,
  onAddAuditLog,
  onAddNotification,
  onBulkSync,
  schoolCancellations,
  onUpdateSchoolCancellations
}: AdminDashboardProps) {
  const hasPermission = (perm: string) => {
    if (currentUser?.role === 'admin') return true;
    if (!currentUser) return false;
    
    // Defensive parsing in case the user model stored permissions as a string in cache
    const perms = typeof currentUser.permissions === 'string' 
      ? (() => { try { return JSON.parse(currentUser.permissions || '[]'); } catch { return []; } })() 
      : (currentUser.permissions || []);
      
    return Array.isArray(perms) ? perms.includes(perm) : false;
  };

  const canViewAllTeachers = hasPermission('can_view_all_teachers');
  const canViewAllSchedules = hasPermission('can_view_all_schedules') || hasPermission('can_edit_schedule');
  const canApproveAttendance = hasPermission('can_approve_attendance');
  const canApproveChanges = hasPermission('can_approve_changes');
  const canManageMeetingAttendance = hasPermission('can_manage_meeting_attendance');
  const canViewReports = hasPermission('can_view_reports');

  const baseTeachers = rawTeachers.filter(t => !t.isDeleted);
  const teachers = baseTeachers.filter(t => canViewAllTeachers || t.id === currentUser?.teacherId);
  const reportTeachers = baseTeachers.filter(t => canViewReports || t.id === currentUser?.teacherId);
  const attendanceTeachers = baseTeachers.filter(t => canApproveAttendance || canViewAllSchedules || t.id === currentUser?.teacherId);
  const meetingTeachers = baseTeachers.filter(t => canManageMeetingAttendance || t.id === currentUser?.teacherId);

  const schools = rawSchools.filter(s => !s.isDeleted);
  const classes = rawClasses.filter(c => !c.isDeleted);
  const schedules = rawSchedules.filter(s => !s.isDeleted).filter(s => canViewAllSchedules || s.teacherId === currentUser?.teacherId);
  const attendance = rawAttendance.filter(a => canApproveAttendance || canViewAllSchedules || a.teacherId === currentUser?.teacherId);
  const changes = rawChanges.filter(c => canApproveChanges || canViewAllSchedules || c.teacherId === currentUser?.teacherId);
  const meetingAttendance = rawMeetingAttendance.filter(ma => canManageMeetingAttendance || ma.teacherId === currentUser?.teacherId);

  
  
  const [schoolOrder, setSchoolOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('etms_school_order_v1') || '[]'); } catch { return []; }
  });
  const [userOrder, setUserOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('etms_user_order_v1') || '[]'); } catch { return []; }
  });

  const getWeight = (session: string) => {
    const s = (session || '').toLowerCase();
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

  const getSessionType = (session: string) => {
    return getWeight(session) < 12 * 60 ? 'morning' : 'afternoon';
  };

  const handleSchoolDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeSchool = schools.find((s: any) => s.id === active.id);
      if (!activeSchool) return;
      const ordered = [...schools].sort((a: any, b: any) => {
        const iA = schoolOrder.indexOf(a.id);
        const iB = schoolOrder.indexOf(b.id);
        if (iA === -1 && iB === -1) return 0;
        if (iA === -1) return 1;
        if (iB === -1) return -1;
        return iA - iB;
      });
      const oldIndex = ordered.findIndex((s: any) => s.id === active.id);
      const newIndex = ordered.findIndex((s: any) => s.id === over.id);
      const newOrdered = arrayMove(ordered, oldIndex, newIndex);
      const newIds = newOrdered.map((s: any) => s.id);
      setSchoolOrder(newIds);
      localStorage.setItem('etms_school_order_v1', JSON.stringify(newIds));
    }
  };

  const handleUserDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeUser = users.find((u: any) => u.id === active.id);
      if (!activeUser) return;
      const ordered = [...users].sort((a: any, b: any) => {
        const iA = userOrder.indexOf(a.id);
        const iB = userOrder.indexOf(b.id);
        if (iA === -1 && iB === -1) return 0;
        if (iA === -1) return 1;
        if (iB === -1) return -1;
        return iA - iB;
      });
      const oldIndex = ordered.findIndex((u: any) => u.id === active.id);
      const newIndex = ordered.findIndex((u: any) => u.id === over.id);
      const newOrdered = arrayMove(ordered, oldIndex, newIndex);
      const newIds = newOrdered.map((u: any) => u.id);
      setUserOrder(newIds);
      localStorage.setItem('etms_user_order_v1', JSON.stringify(newIds));
    }
  };

  const [teacherOrder, setTeacherOrder] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('etms_teacher_order_v1') || '[]'); } catch(e) { return []; }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTeacherDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeTeacher = teachers.find((t: any) => t.id === active.id);
      if (!activeTeacher) return;
      
      const orderedTeachers = [...teachers].sort((a: any, b: any) => {
        const indexA = teacherOrder.indexOf(a.id);
        const indexB = teacherOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      const oldIndex = orderedTeachers.findIndex((t: any) => t.id === active.id);
      const newIndex = orderedTeachers.findIndex((t: any) => t.id === over.id);
      
      const newOrdered = arrayMove(orderedTeachers, oldIndex, newIndex);
      const newIds = newOrdered.map((t: any) => t.id);
      setTeacherOrder(newIds);
      localStorage.setItem('etms_teacher_order_v1', JSON.stringify(newIds));
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'teachers' | 'schools' | 'attendance' | 'changes' | 'reports' | 'logs' | 'trash' | 'accounts' | 'meeting_attendance' | 'system_health' | 'school_cancellations' | 'school_payroll'>('dashboard');
  const [dashboardHistoryYear, setDashboardHistoryYear] = useState<string>('2026');
  const [dashboardHistoryMonth, setDashboardHistoryMonth] = useState<string>('06');
  const [trashCategory, setTrashCategory] = useState<'schedules' | 'teachers' | 'schools' | 'classes'>('schedules');
  const [selectedCancellationSchool, setSelectedCancellationSchool] = useState<{ school: School, cancellations: any[] } | null>(null);
  const [quickEditClassData, setQuickEditClassData] = useState<{
    name: string;
    schoolId: string;
    classesToUpdate: ClassInfo[];
  } | null>(null);
  const [newSchoolNameInline, setNewSchoolNameInline] = useState('');
  const [showCreateSchoolInline, setShowCreateSchoolInline] = useState(false);
  const [targetMergeClassId, setTargetMergeClassId] = useState('');
  const [schoolFilterText, setSchoolFilterText] = useState('');

  // Fine-grained permission helper
  const getAvailableTeachersForDateSession = (dateStr: string, session: string, excludeTeacherId: string) => {
    if (!dateStr || !session) return baseTeachers.filter(t => t.id !== excludeTeacherId && t.status === 'active');
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay() === 0 ? 8 : dateObj.getDay() + 1; // 2-8
    
    return baseTeachers.filter(t => {
      if (t.id === excludeTeacherId) return false;
      if (t.status !== 'active') return false;
      const hasConflict = schedules.some(s => s.teacherId === t.id && s.dayOfWeek === dayOfWeek && getSessionType(s.session) === getSessionType(session));
      return !hasConflict;
    });
  };

  const randomKeyMap = useRef<Record<string, number>>({});
  const hasDroppedRef = useRef(false);
  const getRandomKey = (scheduleId: string) => {
    if (!randomKeyMap.current[scheduleId]) {
      randomKeyMap.current[scheduleId] = Math.random();
    }
    return randomKeyMap.current[scheduleId];
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduleTeacherFilter, setScheduleTeacherFilter] = useState<string>('all');

  // Form states
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher> | null>(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [editingSchool, setEditingSchool] = useState<Partial<School> | null>(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);

  const [editingClass, setEditingClass] = useState<Partial<ClassInfo> | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);

  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // User management states
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Change request states
  const [editingChange, setEditingChange] = useState<Partial<ChangeRequest> | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);

  // Drag and Drop States
  const [draggedSchedule, setDraggedSchedule] = useState<Schedule | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dayOfWeek: number; session: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [showDragActionModal, setShowDragActionModal] = useState(false);
  const [dragDropTarget, setDragDropTarget] = useState<{ dayOfWeek: number; session: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [dragTransferTeacherId, setDragTransferTeacherId] = useState<string>('');

  const [quickBroadcastTitle, setQuickBroadcastTitle] = useState('');
  const [quickBroadcastMessage, setQuickBroadcastMessage] = useState('');
  const [quickBroadcastTargetUserId, setQuickBroadcastTargetUserId] = useState('');

  const handleSendQuickBroadcast = async () => {
    if (!quickBroadcastMessage.trim()) {
      customAlert('Thiếu thông tin', 'Vui lòng nhập nội dung thông báo!');
      return;
    }
    
    const targetText = quickBroadcastTargetUserId 
      ? `tài khoản được chọn (${quickBroadcastTargetUserId})` 
      : 'toàn bộ giáo viên';

    customConfirm(
      'Gửi thông báo nhanh',
      `Bạn có chắc chắn muốn phát đi thông báo này tới ${targetText}? Thông báo sẽ nổi ngay trên màn hình app của họ và tự động biến mất khi họ xem xong.`,
      async () => {
        try {
          const res = await fetch('/api/notifications/quick-broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: quickBroadcastTitle.trim() || 'Thông báo từ Ban Giám Đốc',
              message: quickBroadcastMessage.trim(),
              targetUserId: quickBroadcastTargetUserId || null
            })
          });
          
          if (res.ok) {
            customAlert('Thành công', `Đã phát thông báo nhanh tới ${targetText}!`);
            setQuickBroadcastTitle('');
            setQuickBroadcastMessage('');
            setQuickBroadcastTargetUserId('');
            
            onAddAuditLog(
              'Phát thông báo nhanh',
              currentUser?.username || 'Admin',
              `Phát thông báo nhanh đến ${targetText}: "${quickBroadcastMessage.trim()}"`
            );
          } else {
            const txt = await res.text();
            customAlert('Thất bại', `Lỗi khi phát thông báo: ${txt}`);
          }
        } catch (e: any) {
          customAlert('Lỗi kết nối', e.message);
        }
      }
    );
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, schedule: Schedule) => {
    try {
      hasDroppedRef.current = false;
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', schedule.id);
        e.dataTransfer.effectAllowed = 'copyMove';
      }
      setDraggedSchedule(schedule);
      
      const element = e.currentTarget as HTMLElement;
      if (element && element.classList) {
        // Using setTimeout prevents Chrome from aborting the drag due to immediate styling modifications during the layout capture
        setTimeout(() => {
          try {
            element.classList.add('opacity-40');
          } catch (err) {
            console.error('Error adding opacity class:', err);
          }
        }, 0);
      }
    } catch (err) {
      console.error('Error in handleDragStart:', err);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    try {
      const element = e.currentTarget as HTMLElement;
      if (element && element.classList) {
        element.classList.remove('opacity-40');
      }
    } catch (err) {
      console.error('Error in handleDragEnd:', err);
    } finally {
      setDragOverCell(null);
      // Wait slightly to check if a valid drop occurred. If not, clear draggedSchedule.
      setTimeout(() => {
        if (!hasDroppedRef.current) {
          setDraggedSchedule(null);
        }
      }, 50);
    }
  };

  const handleDragOver = (e: React.DragEvent, dayOfWeek: number, session: 'morning' | 'afternoon' | 'evening') => {
    try {
      e.preventDefault(); // Required to allow drop
      if (dragOverCell?.dayOfWeek !== dayOfWeek || dragOverCell?.session !== session) {
        setDragOverCell({ dayOfWeek, session });
      }
    } catch (err) {
      console.error('Error in handleDragOver:', err);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    try {
      e.preventDefault();
    } catch (err) {
      console.error('Error in handleDragLeave:', err);
    }
  };

  const handleDrop = (e: React.DragEvent, dayOfWeek: number, session: 'morning' | 'afternoon' | 'evening') => {
    try {
      e.preventDefault();
      hasDroppedRef.current = true;
      setDragOverCell(null);
      if (!draggedSchedule) return;

      setDragDropTarget({ dayOfWeek, session });
      setDragTransferTeacherId(draggedSchedule.teacherId); // Default to current teacher
      setShowDragActionModal(true);
    } catch (err) {
      console.error('Error in handleDrop:', err);
    }
  };

  const confirmDragAction = (actionType: 'move' | 'copy' | 'transfer', options?: { newTeacherId?: string; isCopy?: boolean }) => {
    if (!draggedSchedule || !dragDropTarget) return;

    let newSchedules = [...schedules];

    if (actionType === 'move') {
      // 1. Check for schedule conflicts on the same teacher at target day/session
      const hasConflict = newSchedules.some(s => 
        s.id !== draggedSchedule.id &&
        s.teacherId === draggedSchedule.teacherId &&
        s.dayOfWeek === dragDropTarget.dayOfWeek &&
        s.session === dragDropTarget.session &&
        !s.isDeleted
      );

      if (hasConflict) {
        customConfirm(
          'Trùng lịch giảng dạy',
          `Giáo viên "${getTeacherName(draggedSchedule.teacherId)}" đã có lịch bận vào Thứ ${dragDropTarget.dayOfWeek} ca ${dragDropTarget.session === 'morning' ? 'sáng' : 'chiều'}. Bạn vẫn muốn chuyển chứ?`,
          () => {
            executeMove();
          }
        );
        return;
      }

      executeMove();

      function executeMove() {
        newSchedules = newSchedules.map(s => {
          if (s.id === draggedSchedule.id) {
            return {
              ...s,
              dayOfWeek: dragDropTarget.dayOfWeek,
              session: dragDropTarget.session
            };
          }
          return s;
        });
        onUpdateSchedules(newSchedules);
        onAddNotification('Di chuyển thành công 📅', `Đã chuyển tiết dạy sang thứ ${dragDropTarget.dayOfWeek} - Ca ${dragDropTarget.session === 'morning' ? 'Sáng' : 'Chiều'}`, 'success');
        closeDragModal();
      }

    } else if (actionType === 'copy') {
      // Create copy of the schedule with new ID
      const newSchedule: Schedule = {
        ...draggedSchedule,
        id: `SKD_DYN_${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
        dayOfWeek: dragDropTarget.dayOfWeek,
        session: dragDropTarget.session,
        isDeleted: false
      };

      const hasConflict = newSchedules.some(s => 
        s.teacherId === draggedSchedule.teacherId &&
        s.dayOfWeek === dragDropTarget.dayOfWeek &&
        s.session === dragDropTarget.session &&
        !s.isDeleted
      );

      if (hasConflict) {
        customConfirm(
          'Trùng lịch giảng dạy',
          `Giáo viên "${getTeacherName(draggedSchedule.teacherId)}" đã có lịch bận vào ngày giờ này. Bạn vẫn muốn sao chép chứ?`,
          () => {
            executeCopy();
          }
        );
        return;
      }

      executeCopy();

      function executeCopy() {
        newSchedules.push(newSchedule);
        onUpdateSchedules(newSchedules);
        onAddNotification('Sao chép thành công 📋', `Đã nhân bản tiết học sang thứ ${dragDropTarget.dayOfWeek} - Ca ${dragDropTarget.session === 'morning' ? 'Sáng' : 'Chiều'}`, 'success');
        closeDragModal();
      }

    } else if (actionType === 'transfer') {
      const targetTeacherId = options?.newTeacherId || dragTransferTeacherId;
      const isCopyMode = options?.isCopy || false;

      if (!targetTeacherId) return;

      const hasConflict = newSchedules.some(s => 
        s.teacherId === targetTeacherId &&
        s.dayOfWeek === dragDropTarget.dayOfWeek &&
        s.session === dragDropTarget.session &&
        !s.isDeleted
      );

      if (hasConflict) {
        customConfirm(
          'Trùng lịch giảng dạy',
          `Giáo viên đích "${getTeacherName(targetTeacherId)}" đã có lịch bận vào ngày giờ này. Bạn vẫn muốn tiếp tục chứ?`,
          () => {
            executeTransfer();
          }
        );
        return;
      }

      executeTransfer();

      function executeTransfer() {
        if (isCopyMode) {
          const newSchedule: Schedule = {
            ...draggedSchedule,
            id: `SKD_DYN_${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
            dayOfWeek: dragDropTarget.dayOfWeek,
            session: dragDropTarget.session,
            teacherId: targetTeacherId,
            isDeleted: false
          };
          newSchedules.push(newSchedule);
          onAddNotification('Sao chép sang giáo viên khác 👤', `Đã nhân bản tiết học cho giáo viên "${getTeacherName(targetTeacherId)}"`, 'success');
        } else {
          newSchedules = newSchedules.map(s => {
            if (s.id === draggedSchedule.id) {
              return {
                ...s,
                dayOfWeek: dragDropTarget.dayOfWeek,
                session: dragDropTarget.session,
                teacherId: targetTeacherId
              };
            }
            return s;
          });
          onAddNotification('Chuyển giáo viên thành công 👤', `Đã chuyển hẳn tiết học cho giáo viên "${getTeacherName(targetTeacherId)}"`, 'success');
        }
        onUpdateSchedules(newSchedules);
        closeDragModal();
      }
    }
  };

  const closeDragModal = () => {
    setShowDragActionModal(false);
    setDraggedSchedule(null);
    setDragDropTarget(null);
    hasDroppedRef.current = false;
  };

  // Attendance View states
  const [attendanceDate, setAttendanceDate] = useState<string>((`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`));
  const [meetingDate, setMeetingDate] = useState<string>((`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`));
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<'all' | 'training' | 'meeting'>('all');
  const [expandedAttendanceTeacher, setExpandedAttendanceTeacher] = useState<string | null>(null);

  // Custom Confirm/Alert Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isAlertOnly?: boolean;
    isLargeWarning?: boolean;
  } | null>(null);

  // Manual attendance entry modal state
  const [manualAttModal, setManualAttModal] = useState<{
    teacherId: string;
    scheduleIds: string[];
    date: string;
    session: string;
    schoolId: string;
    classIds: string[];
  } | null>(null);
  const [manualAttNote, setManualAttNote] = useState('');

  const handleAddManualAttendance = () => {
    if (!manualAttModal) return;
    const newLogs = manualAttModal.scheduleIds.map((schedId, i) => {
      const sched = schedules.find(s => s.id === schedId);
      return {
        id: `MANUAL_ADM_${Date.now()}_${i}`,
        date: manualAttModal.date,
        scheduleId: schedId,
        teacherId: manualAttModal.teacherId,
        schoolId: manualAttModal.schoolId,
        classId: sched?.classId || manualAttModal.classIds[i] || '',
        session: manualAttModal.session,
        checkInTime: '08:00',
        periods: sched?.periods || 1,
        lat: 0,
        lng: 0,
        distanceMeter: 0,
        selfieImage: '',
        verificationMethod: 'ADMIN_MANUAL' as any,
        isVerified: true,
        isFlagged: false,
        flagReason: manualAttNote ? `Nhập thủ công bởi Admin: ${manualAttNote}` : 'Nhập thủ công bởi Admin',
        confirmedByAdmin: true,
      };
    });
    onUpdateAttendance([...attendance, ...newLogs]);
    const teacherName = rawTeachers.find(t => t.id === manualAttModal.teacherId)?.name || manualAttModal.teacherId;
    const schoolName = getSchoolName(manualAttModal.schoolId);
    onAddAuditLog('Nhập điểm danh thủ công', 'Admin', `Đã nhập ${newLogs.length} tiết cho ${teacherName} tại ${schoolName} ngày ${manualAttModal.date}`);
    setManualAttModal(null);
    setManualAttNote('');
  };

  const handleFixSchoolLinks = () => {
    let count = 0;
    const updated = attendance.map(a => {
      if (!a.classId) return a;
      const cls = classes.find(c => c.id === a.classId && !c.isDeleted);
      if (cls && cls.schoolId && a.schoolId !== cls.schoolId) {
        count++;
        return { ...a, schoolId: cls.schoolId };
      }
      return a;
    });

    if (count > 0) {
      onUpdateAttendance(updated);
      onAddAuditLog('Sửa liên kết trường tự động', 'Admin', `Đã tự động vá ${count} bản ghi điểm danh bị lệch schoolId`);
      customAlert('Thành công', `Đã tự động sửa thành công ${count} bản ghi điểm danh bị lệch mã trường! Bảng đối soát thu học phí trường đã được cập nhật chuẩn xác.`);
    } else {
      customAlert('Thông báo', 'Tất cả bản ghi điểm danh hiện tại đều đã khớp mã trường chuẩn với mã lớp!');
    }
  };

  const customConfirm = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText = 'Xác nhận', 
    cancelText = 'Hủy',
    isLargeWarning = false
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      },
      confirmText,
      cancelText,
      isAlertOnly: false,
      isLargeWarning
    });
  };

  const handleExportData = () => {
    const backupData = {
      teachers,
      schools,
      classes,
      schedules,
      attendance,
      changes,
      auditLogs,
      notifications,
      users,
      settings
    };
    
    // Create a Blob and a download link
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etms_backup_${(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onAddAuditLog('Trích xuất dữ liệu', currentUser?.username || 'Admin', 'Đã tải xuống bản sao lưu toàn bộ cơ sở dữ liệu hiện tại');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        if (onSyncState) {
          customConfirm(
            'Xác Nhận Nhập Dữ Liệu Đồng Bộ',
            'Cảnh báo: Hành động này sẽ thay thế TOÀN BỘ dữ liệu hiện tại bằng dữ liệu trong file bạn cung cấp. Không thể hoàn tác. Bạn đã chắc chắn?',
            async () => {
              // 1. Sync over frontend state using the provided global hook callback
              onSyncState({
                teachers: jsonData.teachers || rawTeachers,
                schools: jsonData.schools || rawSchools,
                classes: jsonData.classes || rawClasses,
                schedules: jsonData.schedules || rawSchedules,
                attendance: jsonData.attendance || rawAttendance,
                changes: jsonData.changes || rawChanges,
                notifications: jsonData.notifications || notifications,
                auditLogs: jsonData.auditLogs || auditLogs,
                users: jsonData.users && jsonData.users.length > 0 ? jsonData.users : users,
                settings: jsonData.settings || settings || { id: 'global', allowTeacherScheduleEdit: false }
              });

              // 2. Perform background bulk push to restore PostgreSQL instance atomically
              try {
                const restoreResponse = await fetch('/api/db-restore', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(jsonData)
                });
                if (!restoreResponse.ok) {
                  throw new Error('Database restore request failed');
                }
              } catch(e) {
                console.error('Failed to sync backend PostgreSQL over import:', e);
              }

              onAddAuditLog('Phục hồi dữ liệu', currentUser?.username || 'Admin', 'Đã phục hồi đồng bộ toàn bộ CSDL từ file JSON tải lên.');
              customAlert('Phục hồi dữ liệu thành công', 'Cơ sở dữ liệu đã đồng bộ hoàn tất với tập tin được cung cấp!');
            },
            'Tiến hành phục hồi',
            'Hủy bỏ',
            true
          );
        } else {
          customAlert('Lỗi hệ thống', 'Tính năng này hiện không được kích hoạt đúng do thiếu hook cung cấp bởi root.');
        }
      } catch (err) {
        customAlert('Lỗi đọc tập tin', 'Không thể đọc được file JSON. Vui lòng đảm bảo file còn nguyên vẹn.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const customAlert = (title: string, message: string, onConfirm?: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmState(null);
      },
      confirmText: 'Đóng',
      isAlertOnly: true
    });
  };



  // Selected details modal
  const [selectedQR, setSelectedQR] = useState<{ schoolName: string; code: string } | null>(null);
  const [selectedSelfie, setSelectedSelfie] = useState<{ teacherName: string; imgUrl: string; time: string; distance: number; method: string } | null>(null);

  // Filter reporting month
  const reportDateInit = new Date();
  const reportMonthInit = `${reportDateInit.getFullYear()}-${String(reportDateInit.getMonth() + 1).padStart(2, '0')}`;
  const [reportMonth, setReportMonth] = useState(reportMonthInit);

  // Interactive schedule cell selection helper
  const daysOfWeekText = [
    { num: 2, label: 'Thứ 2' },
    { num: 3, label: 'Thứ 3' },
    { num: 4, label: 'Thứ 4' },
    { num: 5, label: 'Thứ 5' },
    { num: 6, label: 'Thứ 6' },
    { num: 7, label: 'Thứ 7' },
    { num: 8, label: 'Chủ Nhật' }
  ];

  // Helper translations and colors
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const getTeacherName = (id: string) => {
    if (id === 'no_substitute') return 'Không có người dạy thay';
    return rawTeachers.find(t => t.id === id)?.name || id;
  };
  const getSchoolName = (id: string, s?: any) => {
    if (s && s.schoolName) return s.schoolName; // Prefer frozen custom name
    return rawSchools.find(sch => sch.id === id)?.name || id;
  };
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
  const getClassName = (id: string) => rawClasses.find(c => c.id === id)?.name || id;

  // -------------------------
  // 1. DASHBOARD MATHS
  // -------------------------
  const totalPeriodsToday = schedules.length * 2.5; // Estimated regular load
  const todayDateStr = new Date().toLocaleDateString('sv-SE'); const checkedInToday = attendance.filter(a => a.date === todayDateStr).length;
  const flaggedCount = attendance.filter(a => a.isFlagged).length;
  const pendingChanges = changes.filter(c => c.status === 'pending').length;

  const activeTeachersCount = teachers.filter(t => t.status === 'active').length;
  const schoolCount = schools.length;
  const classesCount = classes.length;

  // -------------------------
  // 2. TEACHER SAVE / EDIT
  // -------------------------
  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!editingTeacher.name?.trim()) {
      customAlert('Thiếu thông tin ⚠️', 'Vui lòng nhập Họ và Tên giáo viên!');
      return;
    }

    // Determine target ID
    let finalId = editingTeacher.id?.trim() || '';
    if (!finalId) {
      const maxNum = teachers.reduce((max, t) => {
        const num = parseInt(t.id.replace(/\D/g, ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      finalId = `GV${String(maxNum + 1).padStart(3, '0')}`;
    }

    const tData: Teacher = {
      id: finalId,
      name: editingTeacher.name || '',
      dob: editingTeacher.dob || '1995-01-01',
      phone: editingTeacher.phone || '',
      email: editingTeacher.email || `${finalId.toLowerCase()}@etms.edu.vn`,
      address: editingTeacher.address || '',
      status: (editingTeacher.status as 'active' | 'inactive') || 'active',
      hourlyRate: Number(editingTeacher.hourlyRate) || 50000,
      monthlyAllowance: Number(editingTeacher.monthlyAllowance) || 0,
      bonus: Number(editingTeacher.bonus) || 0,
      deduction: Number(editingTeacher.deduction) || 0,
      socialInsurance: Number(editingTeacher.socialInsurance) || 0,
      advanceSalary: Number(editingTeacher.advanceSalary) || 0,
      notes: editingTeacher.notes || ''
    };

    if (editingTeacher.originalId) {
      // Edit
      const oldId = editingTeacher.originalId;
      const newId = finalId;

      const updated = rawTeachers.map(t => t.id === oldId ? tData : t);
      onUpdateTeachers(updated);

      if (oldId !== newId) {
        const updatedSchedules = rawSchedules.map(s => s.teacherId === oldId ? { ...s, teacherId: newId } : s);
        onUpdateSchedules(updatedSchedules);

        const updatedAttendance = attendance.map(a => a.teacherId === oldId ? { ...a, teacherId: newId } : a);
        onUpdateAttendance(updatedAttendance);

        const updatedChanges = changes.map(c => c.targetTeacherId === oldId ? { ...c, targetTeacherId: newId } : c);
        onUpdateChanges(updatedChanges);
      }

      onAddAuditLog('Sửa thông tin giáo viên', 'Admin', `Đã cập nhật hồ sơ & lương của Giáo viên ${tData.name} (${newId})${oldId !== newId ? ` (Đổi mã số từ ${oldId})` : ''}`);
    } else {
      // New
      if (rawTeachers.some(t => t.id === finalId)) {
        customAlert('Trùng Mã Giáo Viên ⚠️', `Mã số giáo viên "${finalId}" đã bị trùng! Vui lòng chọn mã số khác.`);
        return;
      }
      onUpdateTeachers([...rawTeachers, tData]);
      onAddAuditLog('Tạo giáo viên mới', 'Admin', `Đã tuyển dụng Giáo viên ${tData.name} với mức lương ${formatVND(tData.hourlyRate)}/tiết.`);
    }
    setShowTeacherModal(false);
    setEditingTeacher(null);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    customConfirm(
      'Xóa giáo viên 🗑️',
      `Bạn có chắc chắn muốn xóa giáo viên ${name} không?\nHành động này tự động chuyển giáo viên vào Thùng rác ẩn 30 ngày để đảm bảo an toàn.`,
      () => {
        onUpdateTeachers(rawTeachers.map(t => t.id === id ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t));
        onAddAuditLog('Xóa giáo viên (Soft Delete)', 'Admin', `Đã chuyển Giáo viên ${name} (${id}) vào Thùng rác lưu trữ 30 ngày.`);
      }
    );
  };

  const handleSyncCompleted = async (
    importedTeachers: Teacher[], 
    mode: 'overwrite' | 'update',
    importedSchedules?: Schedule[],
    importedSchools?: School[],
    importedClasses?: ClassInfo[]
  ) => {
    if (onBulkSync) {
      await onBulkSync(importedTeachers, importedSchools || [], importedClasses || [], importedSchedules || [], mode);
      onAddAuditLog(
        mode === 'overwrite' ? 'Đồng bộ ghi đè từ Google Sheets' : 'Đồng bộ cập nhật từ Google Sheets', 
        'Admin', 
        mode === 'overwrite' 
          ? `Đã thay thế toàn bộ nguồn dữ liệu giáo viên bằng ${importedTeachers.length} hồ sơ mới tải trực tiếp từ Google Sheets.`
          : `Đã hòa nhập danh sách: cập nhật và bổ sung giáo viên/lịch dạy mới từ Google Sheets.`
      );
      onAddNotification(
        'Đồng bộ hoàn tất 📊',
        mode === 'overwrite'
          ? `Danh sách giáo viên đã được ghi đè hoàn toàn (${importedTeachers.length} tài khoản mới).`
          : `Hoàn tất đồng bộ cập nhật chéo giáo viên & lịch dạy thành công.`,
        'success'
      );
      return;
    }

    // If it's a schedule sheet and schools/classes/schedules are provided:
    if (importedSchedules && importedSchedules.length > 0) {
      // Merge schools
      if (importedSchools && importedSchools.length > 0) {
        const mergedSchools = [...schools];
        importedSchools.forEach(sch => {
          const idx = mergedSchools.findIndex(s => s.id === sch.id || s.name.toLowerCase() === sch.name.toLowerCase());
          if (idx !== -1) {
            mergedSchools[idx] = { ...mergedSchools[idx], ...sch };
          } else {
            mergedSchools.push(sch);
          }
        });
        onUpdateSchools(mergedSchools);
      }

      // Merge classes
      if (importedClasses && importedClasses.length > 0) {
        const mergedClasses = [...classes];
        importedClasses.forEach(cls => {
          const idx = mergedClasses.findIndex(c => c.id === cls.id || (c.schoolId === cls.schoolId && c.name.toLowerCase() === cls.name.toLowerCase()));
          if (idx !== -1) {
            mergedClasses[idx] = { ...mergedClasses[idx], ...cls };
          } else {
            mergedClasses.push(cls);
          }
        });
        onUpdateClasses(mergedClasses);
      }

    }

    if (mode === 'overwrite') {
      onUpdateTeachers(importedTeachers);
      if (importedSchedules && importedSchedules.length > 0) {
        onUpdateSchedules(importedSchedules);
      } else {
        onUpdateSchedules([]);
      }
      onAddAuditLog(
        'Đồng bộ ghi đè từ Google Sheets', 
        'Admin', 
        `Đã thay thế toàn bộ nguồn dữ liệu giáo viên bằng ${importedTeachers.length} hồ sơ mới tải trực tiếp từ Google Sheets.`
      );
      onAddNotification(
        'Đồng bộ hoàn tất 📊',
        `Danh sách giáo viên đã được ghi đè hoàn toàn (${importedTeachers.length} tài khoản mới).`,
        'success'
      );
    } else {
      // Merge: update existing, add new (using robust slug matching to prevent duplicates of existing mock teachers)
      const mergedList = [...teachers];
      let updatedCount = 0;
      let insertedCount = 0;

      // Keep track of mapped/reassigned teacher IDs so schedules map correctly
      const teacherIdMap = new Map<string, string>();

      importedTeachers.forEach(imported => {
        const importSlug = imported.name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, '');

        const idx = mergedList.findIndex(t => {
          const currentSlug = t.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');
          return t.id === imported.id || (t.email && t.email === imported.email) || currentSlug === importSlug;
        });

        if (idx !== -1) {
          const existingId = mergedList[idx].id;
          teacherIdMap.set(imported.id, existingId);
          mergedList[idx] = { ...mergedList[idx], ...imported, id: existingId };
          updatedCount++;
        } else {
          mergedList.push(imported);
          insertedCount++;
        }
      });

      onUpdateTeachers(mergedList);

      // Now merge schedules, replacing / updating mapped teacherIds to their actual persistent existing IDs in DB!
      if (importedSchedules && importedSchedules.length > 0) {
        const mappedSchedules = importedSchedules.map(s => {
          const remappedId = teacherIdMap.get(s.teacherId);
          if (remappedId) {
            return { ...s, teacherId: remappedId };
          }
          return s;
        });

        const importedTeacherIds = new Set(importedTeachers.map(t => {
          return teacherIdMap.get(t.id) || t.id;
        }));
        const otherSchedules = schedules.filter(s => !importedTeacherIds.has(s.teacherId));
        onUpdateSchedules([...otherSchedules, ...mappedSchedules]);
      }

      onAddAuditLog(
        'Đồng bộ cập nhật từ Google Sheets', 
        'Admin', 
        `Đã hòa nhập danh sách: cập nhật ${updatedCount} hồ sơ cũ và bổ sung ${insertedCount} giáo viên mới vào hệ thống.`
      );
      onAddNotification(
        'Đồng bộ cập nhật thành công 📊',
        `Hoàn tất đồng bộ cập nhật chéo: cập nhật ${updatedCount} giáo viên & thêm mới ${insertedCount} giáo viên.`,
        'success'
      );
    }
  };

  // -------------------------
  // 3. SCHOOL SAVE / EDIT
  // -------------------------
  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    if (!editingSchool.name?.trim() || !editingSchool.address?.trim()) {
      customAlert('Thiếu thông tin ⚠️', 'Vui lòng điền đầy đủ Tên Trường và Địa chỉ!');
      return;
    }

    let finalId = editingSchool.id?.trim() || '';
    if (!finalId) {
      const maxNum = rawSchools.reduce((max, s) => {
        const num = parseInt(s.id.replace(/\D/g, ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      finalId = `SCH${String(maxNum + 1).padStart(3, '0')}`;
    }

    const sData: School = {
      id: finalId,
      name: editingSchool.name || '',
      address: editingSchool.address || '',
      contactPerson: editingSchool.contactPerson || '',
      phone: editingSchool.phone || '',
      lat: Number(editingSchool.lat) || 10.774,
      lng: Number(editingSchool.lng) || 106.702,
      qrCodeData: editingSchool.qrCodeData || `ETMS_QR_VERIFY_${finalId}_${(editingSchool.name || '').toUpperCase().replace(/\s+/g, '_')}`
    };

    if (editingSchool.originalId) {
      const oldId = editingSchool.originalId;
      const newId = finalId;

      const originalSchool = rawSchools.find(s => s.id === oldId);

      const updated = rawSchools.map(s => s.id === oldId ? sData : s);
      onUpdateSchools(updated);

      const schedulesToUpdate = rawSchedules.map(s => {
         if (s.schoolId === oldId && !s.schoolName) {
            return { ...s, schoolName: originalSchool?.name || s.schoolId };
         }
         return s;
      });

      if (oldId !== newId) {
        const updatedClasses = rawClasses.map(c => c.schoolId === oldId ? { ...c, schoolId: newId } : c);
        onUpdateClasses(updatedClasses);

        const finalSchedulesToUpdate = schedulesToUpdate.map(s => s.schoolId === oldId ? { ...s, schoolId: newId } : s);
        onUpdateSchedules(finalSchedulesToUpdate);

        const updatedAttendance = attendance.map(a => a.schoolId === oldId ? { ...a, schoolId: newId } : a);
        onUpdateAttendance(updatedAttendance);
      } else if (JSON.stringify(schedulesToUpdate) !== JSON.stringify(rawSchedules)) {
        onUpdateSchedules(schedulesToUpdate);
      }

      onAddAuditLog('Sửa thông tin trường', 'Admin', `Đã cập nhật tọa độ/địa chỉ Trường ${sData.name}${oldId !== newId ? ` (Đổi mã trường từ ${oldId} thành ${newId})` : ''}`);
    } else {
      if (rawSchools.some(s => s.id === finalId)) {
        customAlert('Trùng Mã Trường ⚠️', `Mã trường "${finalId}" đã bị trùng! Vui lòng chọn mã khác.`);
        return;
      }
      onUpdateSchools([...rawSchools, sData]);
      onAddAuditLog('Thêm trường học', 'Admin', `Đã tạo trường đối tác ${sData.name} với định vị GPS bán kính chấm công 500m.`);
    }
    setShowSchoolModal(false);
    setEditingSchool(null);
  };

  const handleDeleteSchool = (id: string, name: string) => {
    customConfirm(
      'Xóa trường đối tác 🏫',
      `Bạn có chắc chắn muốn xóa trường ${name} không?\nHành động này tự động ẩn trường học khỏi danh sách. Các lớp học trực thuộc có lịch dạy sẽ được giữ lại và chuyển vào mục "Lớp chưa gán trường" để bạn dễ dàng hiệu chỉnh lại.`,
      () => {
        onUpdateSchools(rawSchools.map(s => s.id === id ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() } : s));
        onAddAuditLog('Xóa trường học (Soft Delete)', 'Admin', `Đã gỡ bỏ trường ${name}. Các lớp học trực thuộc được giữ lại để gán lại trường.`);
      }
    );
  };

  // -------------------------
  // 4. CLASS SAVE / EDIT
  // -------------------------
  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    if (!editingClass.name?.trim() || !editingClass.schoolId) {
      customAlert('Thiếu thông tin ⚠️', 'Vui lòng nhập Tên Lớp và chọn Trường học trực thuộc!');
      return;
    }

    let finalId = editingClass.id?.trim() || '';
    if (!finalId) {
      const maxNum = rawClasses.reduce((max, c) => {
        const num = parseInt(c.id.replace(/\D/g, ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      finalId = `CLS${String(maxNum + 1).padStart(3, '0')}`;
    }

    const cData: ClassInfo = {
      id: finalId,
      name: editingClass.name || '',
      schoolId: editingClass.schoolId || '',
      studentCount: Number(editingClass.studentCount) || 20,
      standardPeriods: Number(editingClass.standardPeriods) || 3
    };

    if (editingClass.originalId) {
      const oldId = editingClass.originalId;
      const newId = finalId;

      const updated = rawClasses.map(c => c.id === oldId ? cData : c);
      onUpdateClasses(updated);

      if (oldId !== newId) {
        const updatedSchedules = rawSchedules.map(s => s.classId === oldId ? { ...s, classId: newId } : s);
        onUpdateSchedules(updatedSchedules);

        const updatedAttendance = attendance.map(a => a.classId === oldId ? { ...a, classId: newId } : a);
        onUpdateAttendance(updatedAttendance);
      }

      onAddAuditLog('Sửa lớp học', 'Admin', `Cập nhật thông tin sĩ số lớp ${cData.name}${oldId !== newId ? ` (Đổi mã lớp từ ${oldId} thành ${newId})` : ''}`);
    } else {
      if (rawClasses.some(c => c.id === finalId)) {
        customAlert('Trùng Mã Lớp ⚠️', `Mã lớp "${finalId}" đã bị trùng! Vui lòng chọn mã khác.`);
        return;
      }
      onUpdateClasses([...rawClasses, cData]);
      onAddAuditLog('Tạo lớp học mới', 'Admin', `Thêm lớp ${cData.name} trực thuộc trường ${getSchoolName(cData.schoolId)}`);
    }
    setShowClassModal(false);
    setEditingClass(null);
  };

  const handleDeleteClass = (id: string, name: string) => {
    customConfirm(
      'Xóa lớp học 🏛️',
      `Bạn có chắc chắn muốn xóa lớp ${name} không?\nHành động này tự động đưa lớp vào Thùng rác ẩn 30 ngày để đảm bảo an toàn.`,
      () => {
        onUpdateClasses(rawClasses.map(c => c.id === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c));
        onAddAuditLog('Xóa lớp (Soft Delete)', 'Admin', `Đã chuyển lớp ${name} vào Thùng rác ẩn 30 ngày.`);
      }
    );
  };

  // -------------------------
  // 5. SCHEDULE SAVE / EDIT
  // -------------------------
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const sc = editingSchedule;
    if (!sc) return;

    // Convert raw inputted values to clean names/IDs
    // Wait, since we are using display helpers, the value in editingSchedule state of
    // schoolId might be an ID or the direct string the user inputted.
    // Let's first map back to the actual names, resolving them to the name if they are IDs.
    const resolveToName = (val: string | undefined, list: { id: string, name: string }[], unclass: string) => {
      const trimmed = (val || '').trim();
      if (!trimmed || trimmed === unclass) return '';
      const found = list.find(item => item.id === trimmed);
      return found ? found.name : trimmed;
    };

    const rawSchoolName = resolveToName(sc.schoolId, rawSchools, 'SCH_UNCLASSIFIED');
    const rawClassName = resolveToName(sc.classId, rawClasses, 'CLS_UNCLASSIFIED');
    const rawTeacherName = resolveToName(sc.teacherId, rawTeachers, 'GV_UNCLASSIFIED');

    if (!sc.dayOfWeek || !sc.session || !rawSchoolName || !rawClassName || !rawTeacherName) {
      customAlert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin lịch dạy!');
      return;
    }

    // 1. Resolve or Create School (if it doesn't exist by name or id)
    let finalSchoolId = '';
    let updatedSchools = [...rawSchools];
    const existingSchool = rawSchools.find(s => 
      s.name.toLowerCase() === rawSchoolName.toLowerCase() || 
      s.id.toLowerCase() === rawSchoolName.toLowerCase()
    );

    if (existingSchool) {
      finalSchoolId = existingSchool.id;
    } else {
      finalSchoolId = 'SCH_' + String(Date.now());
      const newSchool: School = {
        id: finalSchoolId,
        name: rawSchoolName,
        address: '',
        contactPerson: '',
        phone: '',
        lat: 10.7769,
        lng: 106.7009,
        qrCodeData: rawSchoolName
      };
      updatedSchools.push(newSchool);
    }

    // 2. Resolve or Create Teacher (if it doesn't exist by name or id)
    let finalTeacherId = '';
    let updatedTeachers = [...rawTeachers];
    const existingTeacher = rawTeachers.find(t => 
      t.name.toLowerCase() === rawTeacherName.toLowerCase() || 
      t.id.toLowerCase() === rawTeacherName.toLowerCase()
    );

    if (existingTeacher) {
      finalTeacherId = existingTeacher.id;
    } else {
      finalTeacherId = 'GV_' + String(Date.now()) + '_' + Math.floor(Math.random() * 1000);
      const newTeacher: Teacher = {
        id: finalTeacherId,
        name: rawTeacherName,
        dob: '',
        phone: '',
        email: '',
        address: '',
        status: 'active',
        hourlyRate: 50000,
        monthlyAllowance: 0,
        bonus: 300000,
        deduction: 0,
        notes: ''
      };
      updatedTeachers.push(newTeacher);
    }

    // 3. Resolve or Create Class (if it doesn't exist by name or id under the resolved School ID)
    let finalClassId = '';
    let updatedClasses = [...rawClasses];
    const existingClass = rawClasses.find(c => 
      c.schoolId === finalSchoolId && 
      (c.name.toLowerCase() === rawClassName.toLowerCase() || 
       c.id.toLowerCase() === rawClassName.toLowerCase())
    );

    if (existingClass) {
      finalClassId = existingClass.id;
    } else {
      finalClassId = 'CLS_' + String(Date.now()) + '_' + Math.floor(Math.random() * 1000);
      const newClass: ClassInfo = {
        id: finalClassId,
        name: rawClassName,
        schoolId: finalSchoolId,
        studentCount: 20,
        standardPeriods: 3
      };
      updatedClasses.push(newClass);
    }

    // Capture old ids to remove/substitute if replaced and no longer used in any other schedule
    let oldSchoolId = '';
    let oldClassId = '';
    let oldTeacherId = '';
    const oldSchedule = sc.originalId ? rawSchedules.find(s => s.id === sc.originalId) : null;
    if (oldSchedule) {
      oldSchoolId = oldSchedule.schoolId;
      oldClassId = oldSchedule.classId;
      oldTeacherId = oldSchedule.teacherId;
    }

    let finalId = sc.id?.trim() || '';
    if (!finalId) {
      const generatedUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : 'uid-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      finalId = `SKD_${generatedUUID}`;
    }

    const sData: Schedule = {
      id: finalId,
      dayOfWeek: Number(sc.dayOfWeek),
      session: sc.session,
      teacherId: finalTeacherId,
      schoolId: finalSchoolId,
      classId: finalClassId,
      periods: Number(sc.periods) || 3
    };

    // Garbage collect/remove old replaced info if NO other schedules reference them
    if (oldSchedule) {
      // Check school
      if (oldSchoolId && oldSchoolId !== finalSchoolId) {
        const isSchoolUsed = rawSchedules.some(s => s.id !== oldSchedule.id && s.schoolId === oldSchoolId);
        if (!isSchoolUsed) {
          updatedSchools = updatedSchools.filter(s => s.id !== oldSchoolId);
        }
      }
      // Check class
      if (oldClassId && oldClassId !== finalClassId) {
        const isClassUsed = rawSchedules.some(s => s.id !== oldSchedule.id && s.classId === oldClassId);
        if (!isClassUsed) {
          updatedClasses = updatedClasses.filter(c => c.id !== oldClassId);
        }
      }
      // Check teacher
      if (oldTeacherId && oldTeacherId !== finalTeacherId) {
        const isTeacherUsed = rawSchedules.some(s => s.id !== oldSchedule.id && s.teacherId === oldTeacherId);
        if (!isTeacherUsed) {
          updatedTeachers = updatedTeachers.filter(t => t.id !== oldTeacherId);
        }
      }
    }

    // Persist all lists
    onUpdateSchools(updatedSchools);
    onUpdateTeachers(updatedTeachers);
    onUpdateClasses(updatedClasses);

    // Save schedule
    if (sc.originalId) {
      const oldId = sc.originalId;
      const updated = rawSchedules.map(s => s.id === oldId ? sData : s);
      onUpdateSchedules(updated);
      onAddAuditLog('Điều chỉnh lịch dạy', 'Admin', `Sửa buổi dạy lớp ${rawClassName} sang Giáo viên ${rawTeacherName}`);
      onAddNotification(
        'Đã điều chỉnh lịch dạy 📅',
        `Lịch dạy vào ${sData.dayOfWeek === 8 ? 'Chủ Nhật' : 'Thứ ' + sData.dayOfWeek} (${getSessionShort(sData.session)}) đã thay đổi thành ${rawSchoolName} - ${rawClassName}.`,
        'info',
        sData.teacherId
      );
    } else {
      if (rawSchedules.some(s => s.id === finalId)) {
        customAlert('Trùng Mã Lịch Học ⚠️', `Mã lịch học "${finalId}" đã bị trùng! Vui lòng chọn mã khác.`);
        return;
      }
      onUpdateSchedules([...rawSchedules, sData]);
      onAddAuditLog('Tạo lịch giảng dạy', 'Admin', `Phân bổ Giáo viên ${rawTeacherName} dạy lớp ${rawClassName} (${sData.periods} tiết)`);
      onAddNotification(
        'Có lịch dạy mới phân công 📥',
        `Admin vừa thêm bạn vào lịch dạy lớp ${rawClassName} tại ${rawSchoolName}.`,
        'success',
        sData.teacherId
      );
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = (id: string) => {
    const sc = rawSchedules.find(s => s.id === id);
    if (!sc) return;
    customConfirm(
      'Gỡ bỏ lịch dạy 🗓️',
      `Bạn có chắc chắn muốn xóa buổi lịch này không?\nHành động này tự động đưa lịch dạy vào Thùng rác ẩn 30 ngày để bảo an dữ liệu.`,
      () => {
        onUpdateSchedules(rawSchedules.map(s => s.id === id ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() } : s));
        onAddAuditLog('Gỡ lịch dạy (Soft Delete)', 'Admin', `Đã chuyển lịch dạy lớp ${getClassName(sc.classId)} của giáo viên ${getTeacherName(sc.teacherId)} vào Thùng rác ẩn 30 ngày.`);
      }
    );
  };

  // -------------------------
  // 5.4a. CHANGE REQUEST SAVE
  // -------------------------
  const handleSaveChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChange) return;

    if (!editingChange.teacherId || !editingChange.requestType || !editingChange.date || !editingChange.session || !editingChange.reason) {
      customAlert('Thiếu thông tin', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    const newChange: ChangeRequest = {
      ...(editingChange as ChangeRequest),
      id: editingChange.id || Date.now().toString(),
      status: editingChange.status || 'pending',
      originalTeacherId: editingChange.teacherId, // Default to same teacher
    };

    if (editingChange.id) {
       onUpdateChanges(changes.map(c => c.id === newChange.id ? newChange : c));
       onAddAuditLog('Cập nhật Yêu cầu', 'Admin', `Cập nhật đề xuất ${newChange.requestType} của GV ${getTeacherName(newChange.teacherId)}`);
    } else {
       onUpdateChanges([...changes, newChange]);
       onAddAuditLog('Tạo Yêu cầu mới', 'Admin', `Tạo đề xuất ${newChange.requestType} cho GV ${getTeacherName(newChange.teacherId)}`);
    }

    setShowChangeModal(false);
  };

  // -------------------------
  // 5.5. USER ACCOUNTS SAVE / EDIT
  // -------------------------
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editingUser.username?.trim()) {
      customAlert('Thiếu thông tin ⚠️', 'Vui lòng điền tên tài khoản!');
      return;
    }
    if (!editingUser.password?.trim()) {
      customAlert('Thiếu thông tin ⚠️', 'Vui lòng điền mật khẩu!');
      return;
    }

    const finalId = editingUser.id || `USR_${Date.now()}`;
    const permissionList = editingUser.permissions || [];

    const uData: AppUser = {
      id: finalId,
      username: editingUser.username.trim(),
      password: editingUser.password.trim(),
      role: editingUser.role || 'member',
      teacherId: editingUser.teacherId || null,
      permissions: permissionList,
      isDeleted: false // Always reactive on save
    };

    if (editingUser.id) {
      // Edit
      const updated = users.map(u => u.id === editingUser.id ? uData : u);
      onUpdateUsers(updated);
      onAddAuditLog('Cập nhật tài khoản', currentUser?.username || 'Admin', `Đã cập nhật tài khoản ${uData.username}`);
    } else {
      // Add
      const existing = users.find(u => u.username.toLowerCase() === uData.username.toLowerCase());
      if (existing) {
        if (existing.isDeleted) {
          // Restore
          const updated = users.map(u => u.id === existing.id ? { ...uData, id: existing.id, isDeleted: false } : u);
          onUpdateUsers(updated);
          onAddAuditLog('Khôi phục tài khoản', currentUser?.username || 'Admin', `Đã khôi phục tài khoản bị vô hiệu hoá ${uData.username}`);
          setEditingUser(null);
          setShowUserModal(false);
          return;
        }
        customAlert('Trùng tài khoản ⚠️', `Tên đăng nhập "${uData.username}" đã tồn tại!`);
        return;
      }
      onUpdateUsers([...users, uData]);
      onAddAuditLog('Tạo tài khoản mới', currentUser?.username || 'Admin', `Đã tạo tài khoản ${uData.username} với vai trò ${uData.role}`);
    }

    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string, username: string) => {
    if (username === 'admin') {
      customAlert('Hạn chế bảo mật ⚠️', 'Không thể xóa tài khoản Admin tối cao!');
      return;
    }
    customConfirm(
      'Xóa tài khoản người dùng 👤',
      `Bạn có chắc muốn xóa vĩnh viễn tài khoản "${username}" không?\nThao tác này sẽ gỡ tài khoản khỏi cơ sở dữ liệu vĩnh viễn.`,
      () => {
        onUpdateUsers(users.filter(u => u.id !== id));
        onAddAuditLog('Xóa tài khoản', currentUser?.username || 'Admin', `Đã gỡ bỏ tài khoản ${username} khỏi hệ thống.`);
      }
    );
  };





  // -------------------------
  // 6. APPROVALS FOR ATTENDANCE & SHIFT SWAP
  // -------------------------
  const handleUpdateMeetingAttendanceRecord = (teacherId: string, type: 'training' | 'meeting', status: 'present' | 'absent_excused' | 'absent_unexcused', note: string = '') => {
    if (!onUpdateMeetingAttendance) return;
    
    // Find if already exists
    const existing = meetingAttendance?.find(ma => ma.teacherId === teacherId && ma.date === meetingDate && ma.type === type);
    
    let updated;
    if (existing) {
      updated = meetingAttendance?.map(ma => 
        ma.id === existing.id ? { ...ma, status, note } : ma
      ) || [];
    } else {
      updated = [...(meetingAttendance || []), {
        id: Math.random().toString(36).substr(2, 9),
        date: meetingDate,
        teacherId,
        type,
        status,
        note
      }];
    }
    
    onUpdateMeetingAttendance(updated);
  };

  const handleApproveAttendance = (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    
    const updated = attendance.map(a => {
      if (ids.includes(a.id)) {
        return { ...a, confirmedByAdmin: true, isFlagged: false };
      }
      return a;
    });
    
    onUpdateAttendance(updated);
    
    // Create audit log for the first item to represent the batch
    const firstItem = attendance.find(a => ids.includes(a.id));
    if (firstItem) {
      onAddAuditLog('Duyệt chấm công', 'Admin', `Admin đã duyệt thủ công ${ids.length} tiết dạy cho Giáo viên ${getTeacherName(firstItem.teacherId)} tại ${getSchoolName(firstItem.schoolId)}`);
      onAddNotification(
        'Tiết dạy đã được duyệt ✓',
        `Lịch chấm công ngày ${firstItem.date} (${getSessionShort(firstItem.session)}) đã được Quản lý duyệt tính công.`,
        'success',
        firstItem.teacherId
      );
    }
  };

  const handleApproveShiftChange = (reqId: string, approve: boolean) => {
    const req = changes.find(c => c.id === reqId);
    if (!req) return;

    if (approve && !req.targetTeacherId) {
      customAlert('Lỗi', 'Vui lòng xếp giáo viên dạy thay trước khi phê duyệt.');
      return;
    }

    const newStatus: 'approved' | 'rejected' = approve ? 'approved' : 'rejected';
    const updatedChanges = changes.map(c => c.id === reqId ? { ...c, status: newStatus } : c);
    onUpdateChanges(updatedChanges);

    // Apply change to schedules if approved!
    if (approve) {
      // We no longer permanently modify the recurring weekly schedule for temporary shift changes.
      // The TeacherDashboard dynamically resolves substitute assignments using the `changes` array.
      
      if (req.targetTeacherId && req.targetTeacherId !== 'no_substitute') {
         onAddNotification(
           'Phân công dạy dùm mới 📣', 
           `Bạn được Admin phân công dạy thay vào ngày ${req.date}, ca ${req.session === 'morning' ? 'Sáng' : 'Chiều'}. Vui lòng kiểm tra tab Dạy Dùm để xem chi tiết trường, lớp và đường đi.`, 
           'info',
           req.targetTeacherId
         );
      }

      onAddAuditLog('Duyệt thay đổi ca', 'Admin', `Phê ĐỒNG Ý yêu cầu hoán đổi ca mã ${reqId} của Giáo viên ${getTeacherName(req.teacherId)}`);
      onAddNotification(
        'Yêu cầu thay đổi lịch đã ĐƯỢC DUYỆT 👍',
        `Đơn xin ${req.requestType === 'sick_leave' ? 'nghỉ phép' : 'đổi ca'} ngày ${req.date} đã được duyệt thành công.`,
        'success',
        req.teacherId
      );
      if (req.targetTeacherId && req.targetTeacherId !== 'no_substitute') {
        onAddNotification(
          'Đã duyệt việc thay ca của bạn',
          `Admin đã duyệt cho bạn thay ca dạy lớp thay cho giáo viên ${getTeacherName(req.originalTeacherId)} ngày ${req.date}.`,
          'info',
          req.targetTeacherId
        );
      }
    } else {
      onAddAuditLog('Từ chối thay đổi ca', 'Admin', `Bác bỏ/Từ chối yêu cầu hoán đổi ca mã ${reqId} của Giáo viên ${getTeacherName(req.teacherId)}`);
      onAddNotification(
        'Đơn xin thay đổi lịch đã bị TỪ CHỐI ❌',
        `Admin không phê duyệt đề xuất thay đổi lịch ngày ${req.date} của bạn do phân bổ nhân sự chưa hợp lý.`,
        'alert',
        req.teacherId
      );
    }
  };

  // -------------------------
  // 7. EXPORT DATA FUNCTIONAL SIMULATION
  // -------------------------
  const handleExportCSV = (reportType: string) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Ensure UTF-8 with BOM for Excel Vietnamese accents
    
    if (reportType === 'payroll') {
      csvContent += "Mã GV,Tên Giáo Viên,Số Tiết Dạy,Đơn Giá,Phụ Cấp Xăng Xe,Thưởng Chuyên Cần,BHXH,Ứng Lương,Phạt,Lương Thực Nhận (VND)\n";
      reportTeachers.forEach(t => {
        const tLogs = rawAttendance.filter(a => a.teacherId === t.id && a.date.startsWith(reportMonth) && (a.confirmedByAdmin || a.isVerified));
                const substituteLogs = tLogs.filter(log => {
          const sched = rawSchedules.find(s => !s.isDeleted && s.id === log.scheduleId);
          return sched && sched.teacherId !== t.id;
        });
        const regularLogs = tLogs.filter(log => {
          const sched = rawSchedules.find(s => !s.isDeleted && s.id === log.scheduleId);
          return !sched || sched.teacherId === t.id;
        });
        
        const adjustPeriods = (logs: any[]) => {
          const groups: Record<string, any[]> = {};
          logs.forEach((l: any) => {
            const key = l.date + '_' + getSessionType(l.session);
            if (!groups[key]) groups[key] = [];
            groups[key].push(l);
          });
          let total = 0;
          Object.values(groups).forEach(group => {
            let sum = group.reduce((acc: number, curr: any) => acc + curr.periods, 0);
            if (sum === 1) sum = 2;
            else if (sum === 2) sum = 2.5;
            total += sum;
          });
          return total;
        };
        const regularPeriods = adjustPeriods(regularLogs);
        const substitutePeriods = adjustPeriods(substituteLogs);
        
        let bonusPeriodsDict: Record<string, number> = {};
        try { if (t.bonusPeriodsJSON) bonusPeriodsDict = JSON.parse(t.bonusPeriodsJSON); } catch(e) {}
        const currentBonusPeriods = bonusPeriodsDict[reportMonth] || 0;
        
        const schoolClosedArrivedPeriods = schoolCancellations.filter(c => c.teacherId === t.id && c.date.startsWith(reportMonth) && c.cancellationType === 'arrived').length;
        const totalPeriods = regularPeriods + substitutePeriods + currentBonusPeriods + schoolClosedArrivedPeriods;
        const baseLessonsSalary = (regularPeriods + currentBonusPeriods + schoolClosedArrivedPeriods) * t.hourlyRate + substitutePeriods * 55000;
        const hasApprovedLeave = changes.some(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth) && (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher'));
        const artEvents = changes.filter(c => c.teacherId === t.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance');
        let artPerformanceBonus = 0;
        artEvents.forEach(c => {
          const match = c.reason.match(/\[Số lượng: (\d+)\]/);
          if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
          else artPerformanceBonus += 100000;
        });
        const allowance = t.monthlyAllowance || 500000;
        const potentialBonus = t.bonus || 300000;
        const attendanceBonus = (hasApprovedLeave ? 0 : potentialBonus) + artPerformanceBonus;
        const socialInsurance = t.socialInsurance || 0;
        const advanceSalary = t.advanceSalary || 0;
        const deduction = t.deduction || 0;
        const finalSalary = baseLessonsSalary + allowance + attendanceBonus - socialInsurance - advanceSalary - deduction;
        csvContent += `${t.id},${t.name},${totalPeriods},${t.hourlyRate},${allowance},${attendanceBonus},${socialInsurance},${advanceSalary},${deduction},${finalSalary}\n`;
      });
    } else if (reportType === 'schools') {
      csvContent += "Mã Trường,Tên Trường,Địa Chỉ,Người Liên Hệ,Sĩ Số Học Sinh,Tổng Số Tiết,Tổng Chi Phí Dự Tính\n";
      schools.forEach(s => {
        const sLogs = attendance.filter(a => a.schoolId === s.id && a.date.startsWith(reportMonth));
        const totalPeriods = sLogs.reduce((acc, curr) => acc + curr.periods, 0);
        const totalCost = sLogs.reduce((acc, curr) => {
          const t = teachers.find(teach => teach.id === curr.teacherId);
          return acc + (curr.periods * (t ? t.hourlyRate : 50000));
        }, 0);
        csvContent += `${s.id},${s.name},"${s.address}",${s.contactPerson},${classes.filter(c => c.schoolId === s.id).reduce((sum, cl) => sum + cl.studentCount, 0)},${totalPeriods},${totalCost}\n`;
      });
    } else {
      csvContent += "Mã Lịch,Bắt đầu,Giáo Viên,Địa Điểm,Trường Học,Sĩ Số\n";
      schedules.forEach(s => {
        csvContent += `${s.id},Thứ ${s.dayOfWeek} ${getSessionShort(s.session)},${getTeacherName(s.teacherId)},${getClassName(s.classId)},${getSchoolName(s.schoolId, s)},${classes.find(c => c.id === s.classId)?.studentCount || 0}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ETMS_Bao_Cao_${reportType}_Thang_${reportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddAuditLog('Xuất Excel thành công', 'Admin', `Đã kết xuất và xuất file bảng dữ liệu ${reportType} dạng .csv tương thích Excel.`);
  };

  const handlePrintReport = () => {
    window.print();
    onAddAuditLog('In báo cáo PDF', 'Admin', `Đã xuất bản bản in/bản xem trước PDF báo cáo hành chính.`);
  };

  // Searching logic
  const handleQueryFilter = (item: any, fields: string[]) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return fields.some(f => String(item[f]).toLowerCase().includes(lower));
  };

  const getSchoolInputValue = (val: string | undefined) => {
    if (!val || val === 'SCH_UNCLASSIFIED') return '';
    const found = schools.find(s => s.id === val);
    return found ? found.name : val;
  };

  const getClassInputValue = (val: string | undefined) => {
    if (!val || val === 'CLS_UNCLASSIFIED') return '';
    const found = classes.find(c => c.id === val);
    return found ? found.name : val;
  };

  const getTeacherInputValue = (val: string | undefined) => {
    if (!val || val === 'GV_UNCLASSIFIED') return '';
    const found = teachers.find(t => t.id === val);
    return found ? found.name : val;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50" id="admin_workspace">
      {/* Admin Top Notification Ticker / System Integrity Ribbon */}
      {flaggedCount > 0 && (
        <div className="bg-red-50 text-red-700 px-6 py-3 flex items-center justify-between border-b border-red-100 text-sm animate-pulse" id="alert_ticker">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
            <span><strong>CẢNH BÁO BẤT THƯỜNG:</strong> AI phát hiện <strong>{flaggedCount} trường hợp</strong> nghi ngờ gian lận định vị GPS hoặc quét sai thời gian thực! Thao tác đã được khoanh vùng đỏ.</span>
          </div>
          <button 
            onClick={() => setActiveTab('attendance')} 
            className="text-xs bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 font-medium transition cursor-pointer"
          >
            Kiểm tra ngay
          </button>
        </div>
      )}

      {/* Main Admin Banner Header */}
      <header className="bg-white border-b border-slate-100 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4" id="admin_header">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Hệ Thống Quản Trị ETMS
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-mono font-normal">ADMIN PANEL</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý định vị GPS giáo viên, phê duyệt lịch dạy, tính lương tự động và phân tích chi phí giáo dục</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm giáo viên, trường học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-sans"
            />
          </div>


        </div>
      </header>

      {/* Layout Tabs navigation toolbar */}
      <nav className="bg-white border-b border-slate-100 px-8 flex overflow-x-auto gap-1 py-1" id="admin_nav">
        {([
          { id: 'dashboard', label: 'Bàn Làm Việc', icon: Users },
          (currentUser?.role === 'admin' || hasPermission('can_view_all_schedules') || hasPermission('can_edit_schedule') || !!currentUser?.teacherId) ? { id: 'schedules', label: 'Lịch Giảng Dạy', icon: Calendar } : null,
          (currentUser?.role === 'admin' || hasPermission('can_view_all_teachers') || !!currentUser?.teacherId) ? { id: 'teachers', label: 'Hồ Sơ & Thù Lao', icon: Users } : null,
          (currentUser?.role === 'admin' || hasPermission('can_edit_school_address')) ? { id: 'schools', label: 'Trường & Lớp Học', icon: Building } : null,
          (currentUser?.role === 'admin' || hasPermission('can_approve_attendance') || !!currentUser?.teacherId) ? { id: 'attendance', label: 'Duyệt Chấm Công', icon: Clock, count: flaggedCount } : null,
          (currentUser?.role === 'admin' || hasPermission('can_manage_meeting_attendance') || !!currentUser?.teacherId) ? { id: 'meeting_attendance', label: 'Họp & Chuyên Môn', icon: CheckCircle2 } : null,
          (currentUser?.role === 'admin' || hasPermission('can_approve_changes') || !!currentUser?.teacherId) ? { id: 'changes', label: 'Thay Ca & Phép', icon: ArrowLeftRight, count: pendingChanges } : null,
          currentUser?.role === 'admin' ? { id: 'school_cancellations', label: 'Trường Nghỉ', icon: AlertTriangle } : null,
          currentUser?.role === 'admin' ? { id: 'school_payroll', label: 'Đối Soát Các Trường', icon: FileSpreadsheet } : null,
          (currentUser?.role === 'admin' || hasPermission('can_view_reports') || !!currentUser?.teacherId) ? { id: 'reports', label: 'Bảng Lương & Chi Phí', icon: DollarSign } : null,
          (currentUser?.role === 'admin' || hasPermission('can_view_audit_logs')) ? { id: 'logs', label: 'Nhật Ký Audit', icon: FileText } : null,
          currentUser?.role === 'admin' ? { id: 'accounts', label: 'Cấp Quyền / Tài Khoản', icon: ShieldCheck } : null,
          currentUser?.role === 'admin' ? { id: 'system_health', label: 'Sức Khỏe Hệ Thống', icon: Activity } : null,
          currentUser?.role === 'admin' ? { id: 'trash', label: 'Thùng Rác', icon: Trash2, count: rawSchedules.filter(s => s.isDeleted).length + rawTeachers.filter(t => t.isDeleted).length + rawSchools.filter(s => s.isDeleted).length + rawClasses.filter(c => c.isDeleted).length } : null
        ].filter(Boolean) as any[]).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs ml-1 px-1.5 py-0.2 rounded-full font-bold ${tab.id === 'attendance' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white animate-bounce'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TABS CONTAINER */}
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* ----------------TAB 1: DASHBOARD OVERVIEW ---------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn" id="dashboard_tab">
            
            {/* Bento statistics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-mono font-medium">GIÁO VIÊN ĐANG HOẠT ĐỘNG</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeTeachersCount} <span className="text-xs font-normal text-slate-400">/ {teachers.length} tổng</span></h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-mono font-medium">TRƯỜNG & ĐIỂM TRƯỜNG</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{schoolCount} <span className="text-xs font-normal text-slate-400">/ {classesCount} lớp</span></h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-mono font-medium">ĐÃ CHẤM CÔNG THÁNG NÀY</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{attendance.length} <span className="text-xs font-normal text-slate-400">buổi dạy</span></h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-mono font-medium">BẤT THƯỜNG / PHÉP TREO</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    <span className="text-red-500">{flaggedCount}</span>
                    <span className="text-slate-300 mx-2">|</span>
                    <span className="text-amber-500">{pendingChanges}</span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Admin Fast Actions & Settings */}
            {(currentUser?.role === 'admin' || hasPermission('can_edit_schedule')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border text-left border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-xl ${settings?.allowTeacherScheduleEdit ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                      <Edit2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Sửa Lịch (Thêm/Bớt Lịch)</h3>
                      <p className="text-xs text-slate-500 mt-1">G/v có thể thêm/nhập/xoá lịch thủ công, chỉnh sửa thời gian (Ví dụ: 8h, 9h...).</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        if (onUpdateSettings) {
                          const nextSettings = settings ? { ...settings, allowTeacherScheduleEdit: !settings.allowTeacherScheduleEdit } : { id: 'global', allowTeacherScheduleEdit: true };
                          onUpdateSettings(nextSettings);
                          onAddAuditLog(
                            nextSettings.allowTeacherScheduleEdit ? 'Mở nút cập nhật lịch' : 'Tắt nút cập nhật lịch',
                            currentUser?.username || 'Admin',
                            `Thay đổi quyền sửa lịch của giáo viên sang: ${nextSettings.allowTeacherScheduleEdit ? 'Cho phép' : 'Khóa'}`
                          );
                        }
                      }}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors shrink-0 ml-4 ${settings?.allowTeacherScheduleEdit ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings?.allowTeacherScheduleEdit ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-white border text-left border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-xl ${settings?.allowTeacherUpdateSchoolLocation ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Cập Nhật Định Vị (GPS) Trường</h3>
                      <p className="text-xs text-slate-500 mt-1">Giáo viên sẽ thấy nút "Lưu định vị trường bằng GPS hiện tại" trong tab Định Vị.</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        if (onUpdateSettings) {
                          const nextSettings = settings ? { ...settings, allowTeacherUpdateSchoolLocation: !settings.allowTeacherUpdateSchoolLocation } : { id: 'global', allowTeacherScheduleEdit: false, allowTeacherUpdateSchoolLocation: true };
                          onUpdateSettings(nextSettings);
                          onAddAuditLog(
                            nextSettings.allowTeacherUpdateSchoolLocation ? 'Mở nút cập nhật GPS trường' : 'Tắt nút cập nhật GPS trường',
                            currentUser?.username || 'Admin',
                            `Thay đổi quyền cập nhật GPS trường sang: ${nextSettings.allowTeacherUpdateSchoolLocation ? 'Cho phép' : 'Khóa'}`
                          );
                        }
                      }}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors shrink-0 ml-4 ${settings?.allowTeacherUpdateSchoolLocation ? 'bg-emerald-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings?.allowTeacherUpdateSchoolLocation ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-white border text-left border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-xl ${settings?.requireSelfieCheckIn !== false ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                      <Camera className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Điểm Danh Bằng Selfie (Ảnh Chụp)</h3>
                      <p className="text-xs text-slate-500 mt-1">Yêu cầu giáo viên chụp ảnh selfie thực tế tại lớp. Khi tắt, giáo viên chỉ cần ấn "Điểm Danh" là xong.</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        if (onUpdateSettings) {
                          const nextSettings = settings ? { ...settings, requireSelfieCheckIn: settings.requireSelfieCheckIn === false ? true : false } : { id: 'global', allowTeacherScheduleEdit: false, requireSelfieCheckIn: false };
                          onUpdateSettings(nextSettings);
                          onAddAuditLog(
                            nextSettings.requireSelfieCheckIn !== false ? 'Bật bắt buộc chụp Selfie' : 'Tắt bắt buộc chụp Selfie',
                            currentUser?.username || 'Admin',
                            `Thay đổi yêu cầu chụp ảnh selfie khi điểm danh sang: ${nextSettings.requireSelfieCheckIn !== false ? 'Bắt buộc' : 'Không bắt buộc'}`
                          );
                        }
                      }}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors shrink-0 ml-4 ${settings?.requireSelfieCheckIn !== false ? 'bg-rose-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings?.requireSelfieCheckIn !== false ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Quick Broadcast Announcement */}
            {(currentUser?.role === 'admin') && (
              <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <Megaphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight text-white">📢 Phát Thông Báo Nhanh Đến Giáo Viên</h3>
                    <p className="text-xs text-slate-400">Thông báo này sẽ nổi ngay trên màn hình thiết bị của người nhận và tự biến mất sau khi họ nhấn "Đã hiểu".</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    className="bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[200px]"
                    value={quickBroadcastTargetUserId}
                    onChange={(e) => setQuickBroadcastTargetUserId(e.target.value)}
                  >
                    <option value="" className="bg-slate-900 text-white">📢 Gửi toàn bộ giáo viên</option>
                    {users.filter(u => !u.isDeleted && u.username !== 'admin').map(u => {
                      const teacher = rawTeachers.find(t => t.id === u.teacherId);
                      const displayLabel = teacher ? `${teacher.name} (${u.username})` : u.username;
                      const targetValue = u.teacherId || u.id;
                      return (
                        <option key={u.id} value={targetValue} className="bg-slate-900 text-white">{displayLabel}</option>
                      );
                    })}
                  </select>
                  <input
                    type="text"
                    placeholder="Tiêu đề thông báo..."
                    className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={quickBroadcastTitle}
                    onChange={(e) => setQuickBroadcastTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Nội dung thông báo nhắc nhở giáo viên..."
                    className="flex-[2] bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={quickBroadcastMessage}
                    onChange={(e) => setQuickBroadcastMessage(e.target.value)}
                  />
                  <button
                    onClick={handleSendQuickBroadcast}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    <span>Gửi Ngay</span>
                  </button>
                </div>
              </div>
            )}

            {/* Admin State Sync Actions */}
            {(currentUser?.role === 'admin') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border text-left border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <Download className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Tải xuống toàn bộ CSDL</h3>
                      <p className="text-xs text-slate-500 mt-1">Trích xuất mọi dữ liệu giáo viên, lịch, điểm danh thành file JSON để sao lưu dự phòng.</p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={handleExportData}
                      className="whitespace-nowrap px-4 py-2 border border-emerald-600 font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-600 hover:text-white transition shadow-sm text-sm"
                    >
                      Export File
                    </button>
                  </div>
                </div>

                <div className="bg-white border text-left border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-xl bg-orange-50 text-orange-600">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Phục hồi & Đồng bộ Hệ thống</h3>
                      <p className="text-xs text-slate-500 mt-1">Ghi đè dữ liệu cục bộ bằng file JSON sao lưu. Mọi dữ liệu sửa đổi sau mốc sao lưu sẽ bị mất.</p>
                    </div>
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleImportData}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="whitespace-nowrap px-4 py-2 border border-orange-600 font-bold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-600 hover:text-white transition shadow-sm text-sm"
                    >
                      Import .json
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live activity grid - What other things are running? */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Lịch Sử Điểm Danh */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-800 text-base">Lịch Sử Điểm Danh</h3>
                  <div className="flex gap-2 text-sm">
                    <select
                      value={dashboardHistoryYear}
                      onChange={e => setDashboardHistoryYear(e.target.value)}
                      className="p-1 border border-slate-200 rounded-md bg-slate-50 text-slate-800 font-semibold"
                    >
                      {['2026', '2025'].map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    <select
                      value={dashboardHistoryMonth}
                      onChange={e => setDashboardHistoryMonth(e.target.value)}
                      className="p-1 border border-slate-200 rounded-md bg-slate-50 text-slate-800 font-semibold"
                    >
                      {Array.from({length: 12}, (_, i) => {
                        const m = (i + 1).toString().padStart(2, '0');
                        return <option key={m} value={m}>Tháng {m}</option>
                      })}
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-2 space-y-3">
                  {(() => {
                    const filteredLogs = attendance.filter(a => a.date.startsWith(`${dashboardHistoryYear}-${dashboardHistoryMonth}`));
                    
                    if (filteredLogs.length === 0) {
                      return <p className="text-center text-sm text-slate-400 py-6">Chưa có dữ liệu điểm danh tháng {dashboardHistoryMonth}/{dashboardHistoryYear}.</p>;
                    }

                    // Group by Object
                    const logsByDate = filteredLogs.reduce((acc, log) => {
                      acc[log.date] = acc[log.date] || [];
                      acc[log.date].push(log);
                      return acc;
                    }, {} as Record<string, AttendanceLog[]>);

                    return Object.entries(logsByDate)
                      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                      .map(([date, logs], idx) => (
                        <div key={idx} className="pt-3">
                          <h4 className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg mb-2">Ngày: {date}</h4>
                          <div className="space-y-3 pl-2">
                            {logs.map((att) => (
                              <div key={att.id} className="flex items-start justify-between gap-4 border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800 text-sm">{getTeacherName(att.teacherId)}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${att.session === 'morning' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'}`}>
                                      {getSessionShort(att.session).toUpperCase()}
                                    </span>
                                    {att.isFlagged && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse ${
                                        att.flagReason?.toLowerCase().includes('bù') 
                                          ? 'bg-orange-100 text-orange-700' 
                                          : 'bg-red-100 text-red-600'
                                      }`}>
                                        {att.flagReason?.toLowerCase().includes('bù') ? 'ĐIỂM DANH BÙ' : 'GIAN LẬN / TRỄ'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Building className="h-3 w-3 inline text-slate-400" />
                                    {getSchoolName(att.schoolId, att)} — Lớp: <strong>{getClassName(att.classId)}</strong> ({att.periods} tiết)
                                  </p>
                                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                    <span>Check-in: <strong>{att.checkInTime}</strong></span>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5 text-slate-400" /> Sai số GPS: <strong className={att.distanceMeter > 500 ? 'text-red-600 font-bold' : ''}>{att.distanceMeter}m</strong></span>
                                  </p>
                                  {att.flagReason && (
                                    <p className="text-[11px] text-orange-600 font-medium italic mt-1">Lý do: {att.flagReason}</p>
                                  )}
                                </div>

                                <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                                  {att.selfieImage ? (
                                    <div 
                                      className="relative cursor-pointer group"
                                      onClick={() => setSelectedSelfie({ 
                                        teacherName: getTeacherName(att.teacherId), 
                                        imgUrl: att.selfieImage, 
                                        time: att.checkInTime, 
                                        distance: att.distanceMeter, 
                                        method: att.verificationMethod 
                                      })}
                                    >
                                      <img src={att.selfieImage} alt="selfie" className="h-10 w-10 object-cover rounded-md border border-slate-200 group-hover:scale-105 transition" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-md flex items-center justify-center">
                                        <Eye className="h-3 w-3 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-[10px] text-slate-400">No Img</div>
                                  )}
                                  
                                  <div className="flex items-center gap-1">
                                    {att.confirmedByAdmin ? (
                                      <span className="text-[10px] text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 rounded font-mono font-medium">ĐÃ DUYỆT CÔNG</span>
                                    ) : att.isFlagged ? (
                                      <button 
                                        onClick={() => handleApproveAttendance(att.id)}
                                        className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-mono font-bold transition"
                                      >
                                        BUỘC DUYỆT
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => handleApproveAttendance(att.id)}
                                        className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded font-sans font-semibold transition"
                                      >
                                        DUYỆT MAU
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Right Column: Alerts and Requests summary */}
              <div className="space-y-6">

                {/* Account Management Shortcut (Admin only) */}
                {currentUser?.role === 'admin' && (
                  <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm shadow-blue-50 space-y-4">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-blue-600" /> Quản Lý & Phân Quyền</h3>
                      <button 
                        onClick={() => {
                          setEditingUser({
                            username: '',
                            password: '',
                            role: 'member',
                            teacherId: null,
                            permissions: [],
                            isDeleted: false
                          });
                          setShowUserModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-md transition"
                      >
                        + TẠO MỚI
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">
                      Phân quyền chi tiết cho Quản lý & Nhân viên nội bộ. Tài khoản có thể liên kết trực tiếp với 1 Giáo viên trên hệ thống.
                    </div>
                    <button
                      onClick={() => setActiveTab('accounts')}
                      className="w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold px-3 py-2 rounded-lg text-xs transition border border-slate-200"
                    >
                      Bảng Phân Quyền Chi Tiết &rarr;
                    </button>
                  </div>
                )}
                
                {/* Urgent Change requests notifications */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm">Yêu Cầu Thay Ca Mới Gửi</h3>
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">{pendingChanges}</span>
                  </div>

                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {changes.filter(c => c.status === 'pending').map((req) => (
                      <div key={req.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{getTeacherName(req.teacherId)}</span>
                          <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded">{req.requestType.toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-normal">{req.reason}</p>
                        <div className="text-[10px] text-slate-400">Ngày xin nghỉ: {req.date} ({getSessionShort(req.session)})</div>
                        
                        <div className="flex items-center gap-2 pt-1 justify-end">
                          <button 
                            onClick={() => handleApproveShiftChange(req.id, false)}
                            className="bg-transparent hover:bg-slate-100 text-slate-500 font-semibold px-2 py-1 rounded text-[10px] transition border border-slate-200"
                          >
                            Từ chối
                          </button>
                          <button 
                            onClick={() => handleApproveShiftChange(req.id, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded text-[10px] transition shadow-sm flex items-center gap-0.5"
                          >
                            <Check className="h-2.5 w-2.5" /> Duyệt đơn
                          </button>
                        </div>
                      </div>
                    ))}
                    {changes.filter(c => c.status === 'pending').length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-4">Tất cả các đơn đã ca được xử lý xong!</p>
                    )}
                  </div>
                </div>

                {/* Simulated notifications / Alerts Feed */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm">Hệ Thống Đẩy Báo Động</h3>
                    <span className="text-[10px] font-mono text-slate-400">LIVE FEED</span>
                  </div>

                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {(() => {
                      const notifsByDate = notifications.reduce((acc, not) => {
                        const date = not.timestamp.split('T')[0];
                        acc[date] = acc[date] || [];
                        acc[date].push(not);
                        return acc;
                      }, {} as Record<string, SystemNotification[]>);

                      const sortedDates = Object.keys(notifsByDate).sort((a,b) => b.localeCompare(a));
                      if (sortedDates.length === 0) return <p className="text-sm text-slate-400">Không có báo động nào</p>;

                      return sortedDates.map(date => (
                        <div key={date} className="space-y-3">
                          <div className="sticky top-0 bg-white py-1 border-b border-slate-100 z-10">
                            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">Ngày {date}</span>
                          </div>
                          {notifsByDate[date].slice(0, 10).map(not => (
                            <div key={not.id} className="flex gap-2 text-xs hover:bg-slate-50 p-1.5 -mx-1.5 rounded-lg transition">
                              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                not.type === 'alert' ? 'bg-red-500' : 
                                not.type === 'warning' ? 'bg-amber-500' :
                                not.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} />
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-800 leading-normal">{not.title}</p>
                                <p className="text-slate-500 leading-relaxed text-[11px]">{not.message}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{not.timestamp.split('T')[1]?.substring(0, 5)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

              </div>
            </div>

            {/* AI Warning Rule Display Panel */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl">
              <h4 className="font-bold flex items-center gap-2 text-base text-yellow-400">
                <ShieldAlert className="h-5 w-5" /> Cơ chế Phân Tích Chống Gian Lận (AI ETMS Rule Engine)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi Giáo viên check-in, phần mềm tự động định hình tọa độ GPS hiện tại so với Tọa độ Trường được Admin chỉ định. Nếu giáo viên vượt ngoài khoảng <strong>100 mét</strong>, chế độ <strong>Cấm Chấm Công</strong> sẽ kích hoạt. Nếu giáo viên dùng phần mềm làm giả định vị GPS, AI sẽ kiểm tra tốc độ di chuyển giữa 2 lần check-in. Nếu tốc độ tối đaa vượt mức phi lý (Ví dụ: &gt; 50km/h giữa 2 trường học đô thị trong 10 phút), bảng công sẽ lập tức bị bôi đỏ cảnh báo.
              </p>
            </div>
          </div>
        )}

        {/* ----------------TAB 2: TEACHING SCHEDULES (CALENDAR BUILDER) ---------------- */}
        {activeTab === 'system_health' && <SystemHealth />}

        {activeTab === 'school_payroll' && (
          <SchoolPayrollTab
            schools={rawSchools}
            classes={rawClasses}
            attendance={rawAttendance}
            schedules={rawSchedules}
            schoolCancellations={schoolCancellations}
            currentUser={currentUser}
            onAddAuditLog={onAddAuditLog}
            onUpdateSchools={onUpdateSchools}
            onUpdateClasses={onUpdateClasses}
            onUpdateSchedules={onUpdateSchedules}
            onUpdateAttendance={onUpdateAttendance}
            teachers={rawTeachers}
          />
        )}

        {activeTab === 'schedules' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="schedules_tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Bảng Lịch Giảng Dạy Tuần Chuẩn</h3>
                <p className="text-xs text-slate-500">Xem và gán cố định lịch giảng dạy tuần từ Thứ 2 đến Thứ 7 / Chủ Nhật</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">


                <button 
                  onClick={() => {
                    setEditingSchedule({ 
                      dayOfWeek: 2, 
                      session: 'morning', 
                      periods: 3, 
                      teacherId: scheduleTeacherFilter !== 'all' ? scheduleTeacherFilter : '' 
                    });
                    setShowScheduleModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Thêm lịch dạy tuần
                </button>
              </div>
            </div>

            {/* Bộ lọc tên Giáo viên tương tác */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <span>👤 LỊCH GIẢNG DẠY THEO GIÁO VIÊN ({teachers.length} người)</span>
                </span>
                {scheduleTeacherFilter !== 'all' && (
                  <button 
                    onClick={() => setScheduleTeacherFilter('all')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer bg-transparent border-0"
                  >
                    Xem lịch tổng hợp tất cả
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setScheduleTeacherFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    scheduleTeacherFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Tất cả ({teachers.length})
                </button>
                {teachers.map(t => {
                  const teacherSchedulesCount = schedules.filter(s => s.teacherId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setScheduleTeacherFilter(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                        scheduleTeacherFilter === t.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="max-w-[120px] truncate">{t.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        scheduleTeacherFilter === t.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-400 border border-slate-200/50'
                      }`}>
                        {teacherSchedulesCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {draggedSchedule && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold animate-pulse mb-3 flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                  ⚡ Đang kéo lịch dạy của: <strong>{getTeacherName(draggedSchedule.teacherId)}</strong> - Hãy thả vào ô Ca Sáng/Ca Chiều của cột ngày khác để đổi lịch.
                </span>
                <button 
                  type="button" 
                  onClick={() => { setDraggedSchedule(null); setDragOverCell(null); }}
                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-[10px] cursor-pointer font-bold transition"
                >
                  Hủy kéo
                </button>
              </div>
            )}

            {/* Desktop Visual Grid / Calendar-style layout */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full border-collapse text-left text-sm table-fixed min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-mono font-medium">
                    <th className="p-3 w-32 border-r border-slate-100">Buổi Dạy</th>
                    {daysOfWeekText.map(day => (
                      <th key={day.num} className="p-3 border-r border-slate-100">{day.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* MORNING ROW */}
                  <tr className="align-top">
                    <td className="p-3 bg-slate-50/50 font-semibold text-slate-700 border-r border-slate-100">
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="h-4 w-4" /> Ca Sáng
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">07:30 - 11:30</span>
                    </td>
                    {daysOfWeekText.map(day => {
                      const cells = schedules.filter(s => 
                        s.dayOfWeek === day.num && 
                        getSessionType(s.session) === 'morning' &&
                        (scheduleTeacherFilter === 'all' || s.teacherId === scheduleTeacherFilter)
                      ).sort((a, b) => getWeight(a.session) - getWeight(b.session));
                      const isOver = dragOverCell?.dayOfWeek === day.num && dragOverCell?.session === 'morning';
                      return (
                        <td 
                          key={day.num} 
                          className={`p-2 border-r border-slate-100 transition min-h-32 ${isOver ? 'bg-blue-50/80 border-2 border-dashed border-blue-400' : 'hover:bg-slate-50/50'}`}
                          onDragOver={(e) => handleDragOver(e, day.num, 'morning')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day.num, 'morning')}
                        >
                          <div className="space-y-2">
                            {cells.map(s => {
                              const schedule = {
                                ...s,
                                day: s.dayOfWeek,
                                shift: s.session
                              };
                              return (
                                <div 
                                  key={`sch-${s.id}`} 
                                  draggable="true"
                                  onDragStart={(e) => handleDragStart(e, s)}
                                  onDragEnd={handleDragEnd}
                                  className="p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-xs space-y-1 relative group cursor-grab active:cursor-grabbing hover:shadow-xs transition select-none"
                                >
                                  <div className="flex items-center justify-between">
                                    <strong className="text-blue-900 block font-bold leading-tight">{getTeacherName(s.teacherId)}</strong>
                                    <div className="opacity-0 group-hover:opacity-100 transition absolute right-1.5 top-1.5 bg-white shadow rounded flex items-center border border-slate-100">
                                      <button 
                                        type="button"
                                        onClick={() => { setEditingSchedule({ ...s, originalId: s.id }); setShowScheduleModal(true); }}
                                        className="p-1 hover:text-blue-600 text-slate-400 hover:bg-slate-50 rounded-l cursor-pointer"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteSchedule(s.id)}
                                        className="p-1 hover:text-red-600 text-slate-400 hover:bg-slate-50 rounded-r border-l border-slate-100 cursor-pointer"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-slate-600 font-semibold">{getClassName(s.classId)}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{getSchoolName(s.schoolId, s)}</p>
                                  <span className="inline-block text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded font-mono">{s.periods} Tiết</span>
                                </div>
                              );
                            })}
                            <button 
                              onClick={() => {
                                setEditingSchedule({ 
                                  dayOfWeek: day.num, 
                                  session: 'morning', 
                                  periods: 3, 
                                  teacherId: scheduleTeacherFilter !== 'all' ? scheduleTeacherFilter : '' 
                                });
                                setShowScheduleModal(true);
                              }}
                              className="w-full border border-dashed border-slate-200 hover:border-slate-400 hover:bg-white text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg text-center text-xs flex items-center justify-center gap-1 font-medium cursor-pointer"
                            >
                              <Plus className="h-3 w-3" /> Gán
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* AFTERNOON ROW */}
                  <tr className="align-top">
                    <td className="p-3 bg-slate-50/50 font-semibold text-slate-700 border-r border-slate-100">
                      <div className="flex items-center gap-1.5 text-violet-600">
                        <Clock className="h-4 w-4" /> Ca Chiều
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">13:30 - 17:00</span>
                    </td>
                    {daysOfWeekText.map(day => {
                      const cells = schedules.filter(s => 
                        s.dayOfWeek === day.num && 
                        getSessionType(s.session) === 'afternoon' &&
                        (scheduleTeacherFilter === 'all' || s.teacherId === scheduleTeacherFilter)
                      ).sort((a, b) => getWeight(a.session) - getWeight(b.session));
                      const isOver = dragOverCell?.dayOfWeek === day.num && dragOverCell?.session === 'afternoon';
                      return (
                        <td 
                          key={day.num} 
                          className={`p-2 border-r border-slate-100 transition min-h-32 ${isOver ? 'bg-violet-50/80 border-2 border-dashed border-violet-400' : 'hover:bg-slate-50/50'}`}
                          onDragOver={(e) => handleDragOver(e, day.num, 'afternoon')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day.num, 'afternoon')}
                        >
                          <div className="space-y-2">
                            {cells.map(s => {
                              const schedule = {
                                ...s,
                                day: s.dayOfWeek,
                                shift: s.session
                              };
                              return (
                                <div 
                                  key={`sch-${s.id}`} 
                                  draggable="true"
                                  onDragStart={(e) => handleDragStart(e, s)}
                                  onDragEnd={handleDragEnd}
                                  className="p-2 bg-violet-50/70 border border-violet-100 rounded-lg text-xs space-y-1 relative group cursor-grab active:cursor-grabbing hover:shadow-xs transition select-none"
                                >
                                  <div className="flex items-center justify-between">
                                    <strong className="text-violet-900 block font-bold leading-tight">{getTeacherName(s.teacherId)}</strong>
                                    <div className="opacity-0 group-hover:opacity-100 transition absolute right-1.5 top-1.5 bg-white shadow rounded flex items-center border border-slate-100">
                                      <button 
                                        type="button"
                                        onClick={() => { setEditingSchedule({ ...s, originalId: s.id }); setShowScheduleModal(true); }}
                                        className="p-1 hover:text-violet-600 text-slate-400 hover:bg-slate-50 rounded-l cursor-pointer"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteSchedule(s.id)}
                                        className="p-1 hover:text-red-600 text-slate-400 hover:bg-slate-50 rounded-r border-l border-slate-100 cursor-pointer"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-slate-600 font-semibold">{getClassName(s.classId)}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{getSchoolName(s.schoolId, s)}</p>
                                  <span className="inline-block text-[9px] bg-violet-100 text-violet-800 font-bold px-1.5 py-0.2 rounded font-mono">{s.periods} Tiết</span>
                                </div>
                              );
                            })}
                            <button 
                              onClick={() => {
                                setEditingSchedule({ 
                                  dayOfWeek: day.num, 
                                  session: 'afternoon', 
                                  periods: 2, 
                                  teacherId: scheduleTeacherFilter !== 'all' ? scheduleTeacherFilter : '' 
                                });
                                setShowScheduleModal(true);
                              }}
                              className="w-full border border-dashed border-slate-200 hover:border-slate-400 hover:bg-white text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg text-center text-xs flex items-center justify-center gap-1 font-medium cursor-pointer"
                            >
                              <Plus className="h-3 w-3" /> Gán
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Instruction footnote */}
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 leading-normal">
              💡 <strong>Hành Động Thuận Tiện:</strong> Admin có thể gõ trực tiếp nút <strong>Gán</strong> tại từng cột ô thời gian ngày để tự tạo lịch nhanh mà không sợ cấu hình sai ngày. Bảng này hoạt động tuần tự và được cập nhật ngay lập tức xuống các ứng dụng giáo viên trong thời gian thực.
            </div>
          </div>
        )}

        {/* ----------------TAB 3: TEACHERS DIRECTORY & PAYMENTS ---------------- */}
        {activeTab === 'teachers' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="teachers_tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Quản Lý Danh Sách Giáo Viên & Đơn Giá Lương</h3>
                <p className="text-xs text-slate-500">Quản lý hồ sơ cơ bản, đơn giá thù lao/tiết, chuyên cần, đóng BHXH, tạm ứng và phạt vi phạm</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setShowSyncModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Đồng bộ từ Google Sheets
                </button>

                <button 
                  onClick={() => {
                    setEditingTeacher({ status: 'active', hourlyRate: 50000, monthlyAllowance: 200000 });
                    setShowTeacherModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Tuyển giáo viên mới
                </button>
              </div>
            </div>

            {/* Teachers list table */}
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeacherDragEnd}>
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                    <th className="p-3">Mã GV</th>
                    <th className="p-3">Họ Tên</th>
                    <th className="p-3">Thông Tin Liên Hệ</th>
                    <th className="p-3 text-right">Đơn giá / Tiết</th>
                    <th className="p-3 text-right">Phụ Cấp</th>
                    <th className="p-3 text-right">Chuyên Cần</th>
                    <th className="p-3 text-right">BHXH</th>
                    <th className="p-3 text-right">Ứng Lương</th>
                    <th className="p-3 text-right">Phạt</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                    <th className="p-3 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <SortableContext items={teachers.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                      {[...teachers]
                        .filter((t: any) => handleQueryFilter(t, ['id', 'name', 'phone', 'email']))
                        .sort((a: any, b: any) => {
                          if (searchTerm) return 0; // Disable sort when searching
                          const indexA = teacherOrder.indexOf(a.id);
                          const indexB = teacherOrder.indexOf(b.id);
                          if (indexA === -1 && indexB === -1) return 0;
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          return indexA - indexB;
                        })
                        .map((teacher: any) => (
                          <SortableTeacherRow 
                            key={teacher.id} 
                            teacher={teacher} 
                            formatVND={formatVND}
                            onEdit={(t: any) => { setEditingTeacher({ ...t, originalId: t.id }); setShowTeacherModal(true); }}
                            onDelete={handleDeleteTeacher}
                          />
                        ))}
                    </SortableContext>
                </tbody>
              </table>
              </DndContext>
            </div>
          </div>
        )}

        {/* ----------------TAB 4: SCHOOLS & CLASSES MANAGEMENT ---------------- */}
        {activeTab === 'schools' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn" id="schools_tab">
            
            {/* Left 2 Columns: Schools managed */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Danh Sách Trường Đối Tác</h3>
                  <p className="text-xs text-slate-400">Các điểm trường hỗ trợ kiểm tra sai số định vị GPS (500m)</p>
                </div>

                <button 
                  onClick={() => {
                    setEditingSchool({ lat: 10.774, lng: 106.702 });
                    setShowSchoolModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm trường học
                </button>
              </div>

              <div className="divide-y divide-slate-100 space-y-3">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSchoolDragEnd}>
                    <SortableContext items={schools.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                      {schools
                        .filter((s: any) => handleQueryFilter(s, ['id', 'name', 'address', 'contactPerson']))
                        .sort((a: any, b: any) => {
                          if (searchTerm) return 0;
                          const iA = schoolOrder.indexOf(a.id);
                          const iB = schoolOrder.indexOf(b.id);
                          if (iA === -1 && iB === -1) return 0;
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map((sch: any) => {
                          const schClasses = classes.filter((c: any) => c.schoolId === sch.id);
                          return (
                            <SortableSchoolRow 
                              key={sch.id}
                              sch={sch}
                              schClasses={schClasses}
                              onEdit={(s: any) => { setEditingSchool({...s, originalId: s.id}); setShowSchoolModal(true); }}
                              onDelete={handleDeleteSchool}
                              setSelectedQR={setSelectedQR}
                            />
                          );
                        })}
                    </SortableContext>
                  </DndContext>
              </div>
            </div>

            {/* Right Column: Classes management under schools */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Hồ Sơ Các Lớp</h3>
                  <p className="text-xs text-slate-400">Thiết lập sĩ số chuẩn của từng khối lớp</p>
                </div>

                <button 
                  onClick={() => {
                    setEditingClass({ studentCount: 20, standardPeriods: 3, schoolId: schools[0]?.id || '' });
                    setShowClassModal(true);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition animate-pulse"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-500" /> Bản lớp
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1 space-y-3">
                {classes.filter(c => handleQueryFilter(c, ['name'])).map((cls) => (
                  <div key={cls.id} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-slate-800">{cls.name} <span className="font-normal text-slate-400">• {getSchoolName(cls.schoolId)}</span></h5>
                      <span className="text-[10px] text-slate-400 font-mono block">Sĩ số: <b>{cls.studentCount} HS</b> | Tiết chuẩn: <b>{cls.standardPeriods} tiết</b></span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setEditingClass({ ...cls, originalId: cls.id }); setShowClassModal(true); }}
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ----------------TAB 5: ATTENDANCE VERIFICATION & FRAUD CHECKS ---------------- */}
                {activeTab === 'attendance' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="attendance_tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Phê Duyệt Lịch Trình Chấm Công Chuyên Cần</h3>
                <p className="text-xs text-slate-500">Giám sát điểm danh theo ngày, kiểm tra sai số định vị GPS, check-in QR Code, và ảnh selfie.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-bold text-slate-600">CHỌN NGÀY:</span>
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      setExpandedAttendanceTeacher(null);
                    }}
                    className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleFixSchoolLinks}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-lg border border-indigo-200 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Tự động sửa các bản ghi điểm danh bị lệch mã trường so với mã lớp"
                >
                  <span>🔧</span> Vá liên kết trường
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-sans">Locals:</span>
                  <span className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-md border border-red-100 font-bold font-mono">
                    {flaggedCount} PHÁT HIỆN GIAN LẬN
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                    <th className="p-3 w-1/4">Giáo Viên</th>
                    <th className="p-3 w-1/4">Trạng Thái Ngày</th>
                    <th className="p-3">Số Lịch Phân Công</th>
                    <th className="p-3">Thù Lao / Tiết</th>
                    <th className="p-3 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {attendanceTeachers.map(teacher => {
                    // Check schedules for this day
                    const dayOfWeekMap = [8, 2, 3, 4, 5, 6, 7]; // 0=Sunday->8, 1=Monday->2
                    const dateObj = new Date(attendanceDate);
                    const dayOfWeek = dayOfWeekMap[dateObj.getDay()];
                    
                    const teacherSchedulesToday = schedules.filter(s => !s.isDeleted && s.teacherId === teacher.id && s.dayOfWeek === dayOfWeek);
                    const teacherAttendanceToday = attendance.filter(a => a.teacherId === teacher.id && a.date === attendanceDate);
                    
                    let statusColor = 'bg-slate-50 text-slate-600 border-slate-200';
                    let statusText = 'KHÔNG CÓ LỊCH DẠY';
                    
                    if (teacherAttendanceToday.length > 0) {
                      if (teacherAttendanceToday.some(a => a.isFlagged)) {
                         statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                         statusText = 'CẦN RÀ SOÁT LẠI (CÓ GIAN LẬN/SAI LỆCH)';
                      } else {
                         statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                         statusText = 'ĐÃ ĐIỂM DANH AN TOÀN';
                      }
                    } else if (teacherSchedulesToday.length > 0) {
                       statusColor = 'bg-red-50 text-red-600 border-red-200';
                       statusText = 'VẮNG MẶT / CHƯA ĐIỂM DANH';
                    }
                    
                    const isExpanded = expandedAttendanceTeacher === teacher.id;

                    return (
                      <React.Fragment key={teacher.id}>
                        <tr 
                          onClick={() => setExpandedAttendanceTeacher(isExpanded ? null : teacher.id)}
                          className={`cursor-pointer transition hover:bg-slate-50/80 ${isExpanded ? 'bg-slate-50/50' : ''}`}
                        >
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{teacher.name}</span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2.5 py-1 rounded border font-bold font-mono ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-slate-600 font-mono">{teacherSchedulesToday.length} Lịch phân công</span>
                          </td>
                          <td className="p-3">
                            <span className="text-blue-600 font-medium font-mono">{(teacher.hourlyRate || 50000).toLocaleString('vi-VN')} đ</span>
                          </td>
                          <td className="p-3 text-right">
                            <button className="text-xs text-blue-600 font-bold hover:underline">
                              {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                            </button>
                          </td>
                        </tr>
                        
                        {isExpanded && (
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <td colSpan={5} className="p-0">
                              <div className="p-4 border-l-4 border-blue-500 m-3 bg-white rounded-lg shadow-sm">
                                <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" /> 
                                  Chi tiết chấm công ngày {attendanceDate}
                                </h4>
                                
                                {teacherSchedulesToday.length === 0 && teacherAttendanceToday.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic">Không có dữ liệu lịch dạy hoặc điểm danh trong ngày này.</p>
                                ) : (
                                  <table className="w-full border-collapse text-left text-sm whitespace-nowrap mt-2 bg-white shadow-sm border border-slate-100 rounded-lg overflow-hidden">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-semibold">
                                        <th className="p-2 pl-4">Ca / Thời Gian</th>
                                        <th className="p-2">Trường / Lớp</th>
                                        <th className="p-2 text-center">Bán Kính</th>
                                        <th className="p-2 text-center">Phương Thức</th>
                                        <th className="p-2 text-center">Selfie</th>
                                        <th className="p-2">AI / Trạng Thái</th>
                                        <th className="p-2 text-center pr-4">Thao Tác</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(() => {
                                        const items: { schedules?: any[], attendanceGroup?: any[] }[] = [];
                                        
                                        const groupedSchedules: Record<string, any[]> = {};
                                        teacherSchedulesToday.forEach(sch => {
                                           const key = `${sch.session}_${sch.schoolId}`;
                                           if (!groupedSchedules[key]) groupedSchedules[key] = [];
                                           groupedSchedules[key].push(sch);
                                        });

                                        const groupedAttendance: Record<string, any[]> = {};
                                        teacherAttendanceToday.forEach(a => {
                                           const key = `${a.session}_${a.schoolId}`;
                                           if (!groupedAttendance[key]) groupedAttendance[key] = [];
                                           groupedAttendance[key].push(a);
                                        });
                                        
                                        Object.keys(groupedSchedules).forEach(key => {
                                           const schs = groupedSchedules[key];
                                           const atts = groupedAttendance[key] || [];
                                           if (atts.length > 0) {
                                             items.push({ schedules: schs, attendanceGroup: atts });
                                           } else {
                                             items.push({ schedules: schs });
                                           }
                                        });
                                        
                                        Object.keys(groupedAttendance).forEach(key => {
                                           if (!groupedSchedules[key]) {
                                             items.push({ attendanceGroup: groupedAttendance[key] });
                                           }
                                        });
                                        
                                        return items.map((item, idx) => {
                                          const schs = item.schedules;
                                          const atts = item.attendanceGroup;
                                          const firstSch = schs ? schs[0] : null;
                                          const firstAtt = atts ? atts[0] : null;
                                          
                                          // check if any of the grouped attendance logs is flagged
                                          const isFlagged = atts ? atts.some((a: any) => a.isFlagged) : false;
                                          
                                          return (
                                            <tr key={idx} className={`${isFlagged ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                                              <td className="p-2 pl-4">
                                                <div className="font-bold text-slate-800 text-xs">Ca {getSessionShort(firstSch ? firstSch.session : firstAtt.session)}</div>
                                                {firstAtt && <div className="text-[10px] text-slate-500 font-mono">{firstAtt.checkInTime}</div>}
                                              </td>
                                              <td className="p-2">
                                                <div className="font-semibold text-slate-700 text-xs">{getSchoolName(firstSch ? firstSch.schoolId : firstAtt.schoolId, firstSch || firstAtt)}</div>
                                                {schs && schs.length > 0 && <div className="text-[10px] text-slate-500 max-w-[180px] whitespace-normal">Lớp: {schs.map((s:any) => `${getClassName(s.classId)} (${s.periods} tiết)`).join(', ')}</div>}
                                                {(!schs || schs.length === 0) && firstAtt && <div className="text-[10px] text-slate-500 max-w-[180px] whitespace-normal">Lớp: {atts?.map((a:any) => getClassName(a.classId)).join(', ')}</div>}
                                              </td>
                                              <td className="p-2 text-center">
                                                {firstAtt ? (
                                                  <div className="font-mono text-xs flex flex-col items-center">
                                                    <span className={`font-bold ${firstAtt.distanceMeter > 500 ? 'text-red-600' : 'text-slate-700'}`}>
                                                      {firstAtt.distanceMeter} mét
                                                    </span>
                                                  </div>
                                                ) : <span className="text-slate-400">-</span>}
                                              </td>
                                              <td className="p-2 text-center text-[10px] font-mono text-slate-600">
                                                {firstAtt ? firstAtt.verificationMethod : '-'}
                                              </td>
                                              <td className="p-2 text-center">
                                                {firstAtt?.selfieImage ? (
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedSelfie({ 
                                                        teacherName: teacher.name, 
                                                        imgUrl: firstAtt.selfieImage, 
                                                        time: firstAtt.checkInTime, 
                                                        distance: firstAtt.distanceMeter, 
                                                        method: firstAtt.verificationMethod 
                                                      })
                                                    }}
                                                    className="inline-block relative overflow-hidden h-8 w-8 border border-slate-200 rounded bg-white cursor-pointer hover:scale-105"
                                                  >
                                                    <img src={firstAtt.selfieImage} alt="selfie" className="h-full w-full object-cover rounded" />
                                                  </button>
                                                ) : <span className="text-slate-400 text-[10px]">-</span>}
                                              </td>
                                              <td className="p-2 text-[10px] max-w-[200px] whitespace-normal">
                                                {!firstAtt ? (
                                                   <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Chưa điểm danh</span>
                                                ) : isFlagged ? (
                                                  <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded border border-red-200">{firstAtt.flagReason}</span>
                                                ) : (
                                                  <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Hợp lệ</span>
                                                )}
                                              </td>
                                              <td className="p-2 text-center pr-4">
                                                <div className="flex items-center justify-center gap-2">
                                                  {!firstAtt ? (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const schIds = schs ? schs.map((s:any) => s.id) : [];
                                                        const clsIds = schs ? schs.map((s:any) => s.classId) : [];
                                                        const sId = schs ? schs[0].schoolId : '';
                                                        const sess = schs ? schs[0].session : '';
                                                        setManualAttModal({ teacherId: teacher.id, scheduleIds: schIds, date: attendanceDate, session: sess, schoolId: sId, classIds: clsIds });
                                                      }}
                                                      className="text-[9px] font-bold px-2 py-1.5 rounded text-white bg-purple-600 hover:bg-purple-700 transition"
                                                    >
                                                      + Nhập thủ công
                                                    </button>
                                                  ) : atts?.every((a:any) => a.confirmedByAdmin) ? (
                                                    <span className="text-[9px] text-emerald-700 font-bold border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-full">
                                                      ĐÃ DUYỆT
                                                    </span>
                                                  ) : (
                                                    <button 
                                                      onClick={(e) => { e.stopPropagation(); handleApproveAttendance(atts!.map((a:any) => a.id)); }}
                                                      className={`text-[9px] font-bold px-2 py-1.5 rounded text-white transition ${isFlagged ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    >
                                                      Duyệt
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        });
                                      })()}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------TAB 5.5: MEETING ATTENDANCE ---------------- */}
        {activeTab === 'meeting_attendance' && (
          <div className="flex-1 bg-white p-4 overflow-y-auto animate-fadeIn relative">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  Điểm Danh Họp & Chuyên Môn
                </h2>
                <p className="text-xs text-slate-500 mt-1">Quản lý điểm danh các buổi họp và tập huấn chuyên môn</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setMeetingTypeFilter('all')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${meetingTypeFilter === 'all' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Tất Cả
                  </button>
                  <button 
                    onClick={() => setMeetingTypeFilter('training')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${meetingTypeFilter === 'training' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Tập Chuyên Môn
                  </button>
                  <button 
                    onClick={() => setMeetingTypeFilter('meeting')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${meetingTypeFilter === 'meeting' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Đi Họp
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none focus:ring-0 p-0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="p-4 font-bold text-slate-700">Giáo Viên</th>
                    <th className="p-4 font-bold text-center">Tập Chuyên Môn</th>
                    <th className="p-4 font-bold text-center">Đi Họp</th>
                    <th className="p-4 font-bold">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {meetingTeachers.map(teacher => {
                    const trainingRecord = meetingAttendance?.find(ma => ma.teacherId === teacher.id && ma.date === meetingDate && ma.type === 'training');
                    const meetingRecord = meetingAttendance?.find(ma => ma.teacherId === teacher.id && ma.date === meetingDate && ma.type === 'meeting');
                    
                    if (meetingTypeFilter === 'training' && !trainingRecord) return null;
                    if (meetingTypeFilter === 'meeting' && !meetingRecord) return null;

                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{teacher.name}</div>
                          <div className="text-xs text-slate-500">{teacher.id}</div>
                        </td>
                        
                        <td className="p-4 text-center">
                          <select 
                            value={trainingRecord?.status || ''} 
                            onChange={(e) => handleUpdateMeetingAttendanceRecord(teacher.id, 'training', e.target.value as any)}
                            className={`text-xs font-bold rounded-lg px-2 py-1.5 border outline-none cursor-pointer transition ${
                              trainingRecord?.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              trainingRecord?.status === 'absent_excused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              trainingRecord?.status === 'absent_unexcused' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <option value="">-- Chưa Điểm Danh --</option>
                            <option value="present">Có Mặt</option>
                            <option value="absent_excused">Vắng Có Phép</option>
                            <option value="absent_unexcused">Vắng Không Phép</option>
                          </select>
                        </td>
                        
                        <td className="p-4 text-center">
                          <select 
                            value={meetingRecord?.status || ''} 
                            onChange={(e) => handleUpdateMeetingAttendanceRecord(teacher.id, 'meeting', e.target.value as any)}
                            className={`text-xs font-bold rounded-lg px-2 py-1.5 border outline-none cursor-pointer transition ${
                              meetingRecord?.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              meetingRecord?.status === 'absent_excused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              meetingRecord?.status === 'absent_unexcused' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <option value="">-- Chưa Điểm Danh --</option>
                            <option value="present">Có Mặt</option>
                            <option value="absent_excused">Vắng Có Phép</option>
                            <option value="absent_unexcused">Vắng Không Phép</option>
                          </select>
                        </td>

                        <td className="p-4">
                          <input 
                            type="text" 
                            placeholder="Ghi chú..." 
                            value={meetingRecord?.note || trainingRecord?.note || ''}
                            onChange={(e) => {
                              if (meetingRecord) handleUpdateMeetingAttendanceRecord(teacher.id, 'meeting', meetingRecord.status, e.target.value);
                              if (trainingRecord) handleUpdateMeetingAttendanceRecord(teacher.id, 'training', trainingRecord.status, e.target.value);
                            }}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-300 outline-none transition"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------TAB 6: SHIFT EXCHANGE COWORKERS ---------------- */}
        {activeTab === 'changes' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="changes_tab">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Yêu Cầu Nghỉ Dạy, Đổi Ca, Giáo Viên Dạy Thay Thế</h3>
                <p className="text-xs text-slate-500 mt-1">Giáo viên khởi tạo đề xuất nghỉ dạy, đổi lịch. Yêu cầu xét duyệt hệ thống mới chính thức.</p>
              </div>
              {(currentUser?.role === 'admin' || hasPermission('can_approve_changes')) && (
                <button
                  onClick={() => {
                    setEditingChange({
                      requestType: 'sick_leave',
                      date: (`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`),
                      session: 'morning',
                      status: 'pending',
                      reason: ''
                    });
                    setShowChangeModal(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>TẠO YÊU CẦU MỚI</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                    <th className="p-3">Giáo Viên Gửi</th>
                    <th className="p-3">Loại Đơn Đề Sắp</th>
                    <th className="p-3">Ngày Xin Thay</th>
                    <th className="p-3">Chi Tiết Buổi Dạy</th>
                    <th className="p-3">Giáo Viên Thay Thế</th>
                    <th className="p-3">Lý Do Đề Xuất</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                    <th className="p-3 text-center">Thao Tác Duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changes.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-semibold text-slate-900">{getTeacherName(req.teacherId)}</td>
                      <td className="p-3">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          req.requestType === 'sick_leave' ? 'bg-red-50 text-red-700 border border-red-100' :
                          req.requestType === 'swap_shift' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          req.requestType === 'art_performance' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {req.requestType === 'sick_leave' ? 'XIN NGHỈ PHÉP' :
                           req.requestType === 'swap_shift' ? 'ĐỔI CA DẠY' : 
                           req.requestType === 'art_performance' ? 'COI VĂN NGHỆ' : 'DẠY THẾ/LỚT'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700">{req.date}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 text-xs font-mono block uppercase">
                          Ca {getSessionShort(req.session)}
                        </span>
                        <span className="text-[10px] text-slate-400">Gốc: {getTeacherName(req.originalTeacherId)}</span>
                      </td>
                      <td className="p-3 font-semibold text-blue-800">
                        {req.status === 'pending' ? (
                          <select 
                            value={req.targetTeacherId || ''}
                            onChange={(e) => {
                              onUpdateChanges(changes.map(c => c.id === req.id ? { ...c, targetTeacherId: e.target.value } : c));
                            }}
                            className="bg-white border border-blue-200 text-blue-700 p-1 text-xs rounded outline-none"
                          >
                            <option value="">-- Xếp GV Dạy Thay --</option>
                            <option value="no_substitute" className="bg-slate-900 text-white">Không có người dạy thay</option>
                            {getAvailableTeachersForDateSession(req.date, req.session, req.teacherId).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        ) : (
                          req.targetTeacherId ? getTeacherName(req.targetTeacherId) : <span className="text-slate-400 font-normal">Trống</span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs whitespace-normal text-xs text-slate-600 leading-normal">{req.reason}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {req.status === 'approved' ? 'Đã duyệt' : 
                           req.status === 'rejected' ? 'Từ chối' : 'Chờ xử lý'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                          {req.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApproveShiftChange(req.id, false)}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1.5 rounded text-[10px] transition border border-red-200"
                              >
                                Từ chối
                              </button>
                              <button 
                                onClick={() => handleApproveShiftChange(req.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition flex items-center gap-0.5"
                              >
                                Phê duyệt
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => { setEditingChange({ ...req }); setShowChangeModal(true); }}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-2 py-1.5 rounded text-[10px] transition border border-blue-200 font-semibold"
                          >
                            Chi tiết/Sửa
                          </button>
                          {(currentUser?.role === 'admin' || hasPermission('can_approve_changes')) && (
                            <button 
                              onClick={() => {
                                customConfirm('Xóa Yêu Cầu?', `Bạn có chắc chắn muốn xóa yêu cầu của GV ${getTeacherName(req.teacherId)} không?`, () => {
                                  onUpdateChanges(changes.filter(c => c.id !== req.id));
                                  onAddAuditLog('Xóa Yêu Cầu Thay Ca', 'Admin', `Đã xóa yêu cầu của ${getTeacherName(req.teacherId)}`);
                                });
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition" title="Xóa yêu cầu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------TAB: SCHOOL CLOSURES (TRƯỜNG NGHỈ) ---------------- */}
        {activeTab === 'school_cancellations' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="school_cancellations_tab">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" /> Báo Cáo Trường Nghỉ Trong Tháng
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Quản lý các ca dạy bị huỷ do trường báo nghỉ. Hỗ trợ đối chiếu và thu tiền học phí từ phía nhà trường chính xác.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">Chọn tháng đối chiếu:</span>
                <input 
                  type="month" 
                  value={reportMonth} 
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Calculations & Summary Cards */}
            {(() => {
              const monthClosedList = schoolCancellations.filter(c => c.date.startsWith(reportMonth));
              const arrivedCount = monthClosedList.filter(c => c.cancellationType === 'arrived').length;
              const notifiedCount = monthClosedList.filter(c => c.cancellationType === 'notified').length;
              const totalCredited = monthClosedList.reduce((acc, curr) => acc + curr.periodsCredited, 0);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">TỔNG CA TRƯỜNG NGHỈ</span>
                    <strong className="text-xl text-slate-800 font-mono block mt-1">{monthClosedList.length} ca</strong>
                  </div>
                  <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                    <span className="text-[10px] text-orange-600/80 font-bold uppercase block">ĐÃ TỚI TRƯỜNG MỚI BÁO</span>
                    <strong className="text-xl text-orange-700 font-mono block mt-1">{arrivedCount} ca (+1t)</strong>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">ĐƯỢC BÁO NGHỈ TRƯỚC</span>
                    <strong className="text-xl text-slate-600 font-mono block mt-1">{notifiedCount} ca (0t)</strong>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-[10px] text-emerald-600/80 font-bold uppercase block">TỔNG TIẾT DẠY CỘNG DỒN</span>
                    <strong className="text-xl text-emerald-700 font-mono block mt-1">{totalCredited} tiết</strong>
                  </div>
                </div>
              );
            })()}

            {/* Closure Logs Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase font-mono">
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Giáo Viên</th>
                    <th className="p-3">Trường & Lớp</th>
                    <th className="p-3">Ca dạy</th>
                    <th className="p-3">Phương án báo nghỉ</th>
                    <th className="p-3 text-center">Tiết cộng</th>
                    <th className="p-3">Lý do nghỉ / Ghi chú (Admin bổ sung)</th>
                    <th className="p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const monthClosedList = schoolCancellations.filter(c => c.date.startsWith(reportMonth));
                    if (monthClosedList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 font-medium bg-slate-50/20">
                            Không có báo cáo trường nghỉ nào ghi nhận trong tháng này.
                          </td>
                        </tr>
                      );
                    }
                    return monthClosedList.map(c => {
                      const teacher = rawTeachers.find(t => t.id === c.teacherId);
                      const school = rawSchools.find(s => s.id === c.schoolId);
                      const classObj = rawClasses.find(cl => cl.id === c.classId);
                      
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition animate-fadeIn">
                          <td className="p-3 font-mono font-bold text-slate-700">{c.date}</td>
                          <td className="p-3 font-semibold text-slate-900">{teacher ? teacher.name : c.teacherId}</td>
                          <td className="p-3 text-slate-600 font-medium">
                            {school ? school.name : c.schoolId} - <strong>{classObj ? classObj.name : c.classId}</strong>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                              c.session === 'morning' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {c.session === 'morning' ? 'SÁNG' : 'CHIỀU'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              c.cancellationType === 'arrived' 
                                ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {c.cancellationType === 'arrived' ? 'Tới trường mới báo' : 'Báo trước khi tới'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800">+{c.periodsCredited}t</td>
                          <td className="p-3">
                            <input 
                              type="text"
                              value={c.reason}
                              placeholder="Nhấp để nhập lý do nghỉ..."
                              onChange={async (e) => {
                                const newReason = e.target.value;
                                const updatedList = schoolCancellations.map(item => 
                                  item.id === c.id ? { ...item, reason: newReason } : item
                                );
                                onUpdateSchoolCancellations(updatedList);
                                
                                // Silent save to server on change
                                try {
                                  await fetch(`/api/school-cancellations/${c.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ reason: newReason })
                                  });
                                } catch (err) {
                                  console.error('Failed to update closure reason:', err);
                                }
                              }}
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none transition"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={async () => {
                                if (confirm('Bạn có chắc chắn muốn xóa bản ghi báo nghỉ này không?')) {
                                  try {
                                    const res = await fetch(`/api/school-cancellations/${c.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (res.ok) {
                                      const updatedList = schoolCancellations.filter(item => item.id !== c.id);
                                      onUpdateSchoolCancellations(updatedList);
                                      onAddAuditLog(
                                        'Xóa báo trường nghỉ',
                                        'Admin',
                                        `Xóa bản ghi báo trường nghỉ ca ${c.session === 'morning' ? 'Sáng' : 'Chiều'} ngày ${c.date} của ${teacher ? teacher.name : c.teacherId}`
                                      );
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------TAB 7: PAYROLL & REPORTING & FILE EXPORTS ---------------- */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="reports_tab">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Bảng Tính Lương Tự Động & Kinh Phí Giáo Viên</h3>
                <p className="text-xs text-slate-500">Giảm thiểu việc nhập liệu Excel bằng tay. Lương tháng được tính tự động dựa trên số tiết hoàn thành chấm công GPS</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input 
                  type="month" 
                  value={reportMonth} 
                  onChange={(e) => setReportMonth(e.target.value)} 
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 font-mono text-slate-700" 
                />

                <button 
                  onClick={() => handleExportCSV('payroll')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Xuất Excel (.csv)
                </button>

                <button 
                  onClick={handlePrintReport}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Printer className="h-4 w-4" /> In PDF / Báo cáo
                </button>
              </div>
            </div>

            {/* Structured calculation columns explaining the formula: (Tổng tiết * Đơn Giá) + Phụ Cấp + Thưởng - Khẩu Trừ */}
            <div className="p-4 bg-blue-55 text-blue-900 border border-blue-100 rounded-2xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 bg-blue-50/50">
              <div className="space-y-0.5">
                <p className="font-bold">✨ Tự động áp dụng Công thức thù lao ETMS:</p>
                <p className="text-slate-600">Lương thực lĩnh = (Tổng số tiết × Đơn giá) + Phụ cấp + Chuyên cần - BHXH - Ứng lương - Phạt vi phạm.</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[11px] bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1 rounded font-mono font-bold">Tháng phân tích: {reportMonth}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeacherDragEnd}>
              <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-mono text-xs uppercase font-semibold">
                    <th className="p-3">Mã GV</th>
                    <th className="p-3">Họ và Tên</th>
                    <th className="p-3 text-center">Tiết Chốt</th>
                    <th className="p-3 text-right">Đơn giá</th>
                    <th className="p-3 text-center text-indigo-600">Bổ sung tiết</th>
                    <th className="p-3 text-right">Phần thù lao tiết</th>
                    <th className="p-3 text-right">Phụ Cấp</th>
                    <th className="p-3 text-right">Chuyên Cần</th>
                    <th className="p-3 text-right text-red-600">BHXH</th>
                    <th className="p-3 text-right text-amber-600">Ứng Lương</th>
                    <th className="p-3 text-right text-red-600">Phạt</th>
                    <th className="p-3 text-right font-bold text-slate-950">LƯƠNG THỰC LĨNH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <SortableContext items={reportTeachers.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                      {reportTeachers
                        .sort((a: any, b: any) => {
                          if (searchTerm) return 0;
                          const iA = teacherOrder.indexOf(a.id);
                          const iB = teacherOrder.indexOf(b.id);
                          if (iA === -1 && iB === -1) return 0;
                          if (iA === -1) return 1;
                          if (iB === -1) return -1;
                          return iA - iB;
                        })
                        .map((teacher: any) => {
                          // Filter attendance logs of this teacher that are within selected month AND confirmed or verified
                          const tLogs = rawAttendance.filter((a: any) => a.teacherId === teacher.id && a.date.startsWith(reportMonth) && (a.confirmedByAdmin || a.isVerified));
                          
                          const approvedSubRequests = rawChanges.filter((c: any) => c.status === 'approved' && c.targetTeacherId === teacher.id && c.date.startsWith(reportMonth));
                                                    const substituteLogs = tLogs.filter((log: any) => {
                            const sched = rawSchedules.find((s: any) => !s.isDeleted && s.id === log.scheduleId);
                            return sched && sched.teacherId !== teacher.id;
                          });
                          const regularLogs = tLogs.filter((log: any) => {
                            const sched = rawSchedules.find((s: any) => !s.isDeleted && s.id === log.scheduleId);
                            return !sched || sched.teacherId === teacher.id;
                          });

                          // Group by date + session for period adjustment
                          const adjustPeriods = (logs: any[]) => {
                            const groups: Record<string, any[]> = {};
                            logs.forEach((l: any) => {
                              const key = l.date + '_' + getSessionType(l.session);
                              if (!groups[key]) groups[key] = [];
                              groups[key].push(l);
                            });
                            let total = 0;
                            Object.values(groups).forEach(group => {
                              let sum = group.reduce((acc: number, curr: any) => acc + curr.periods, 0);
                              if (sum === 1) sum = 2;
                              else if (sum === 2) sum = 2.5;
                              total += sum;
                            });
                            return total;
                          };
                          
                          const regularPeriods = adjustPeriods(regularLogs);
                          const substitutePeriods = adjustPeriods(substituteLogs);
                          
                          let bonusPeriodsDict: Record<string, number> = {};
                          try {
                            if (teacher.bonusPeriodsJSON) {
                              bonusPeriodsDict = JSON.parse(teacher.bonusPeriodsJSON);
                            }
                          } catch(e) {}
                          const currentBonusPeriods = bonusPeriodsDict[reportMonth] || 0;
                          
                          const schoolClosedArrivedPeriods = schoolCancellations.filter(c => c.teacherId === teacher.id && c.date.startsWith(reportMonth) && c.cancellationType === 'arrived').length;
                          const totalPeriods = regularPeriods + substitutePeriods + currentBonusPeriods + schoolClosedArrivedPeriods;
                          const baseLessonsSalary = (regularPeriods + currentBonusPeriods + schoolClosedArrivedPeriods) * teacher.hourlyRate + substitutePeriods * 55000;
                          
                          // Giữ lại logic phụ cấp 500k cứng + chuyên cần 300k
                          const hasApprovedLeave = changes.some((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && (c.requestType === 'sick_leave' || c.requestType === 'substitute_teacher'));
                          const artEvents = changes.filter((c: any) => c.teacherId === teacher.id && c.status === 'approved' && c.date.startsWith(reportMonth) && c.requestType === 'art_performance');
                          let artPerformanceBonus = 0;
                          artEvents.forEach((c: any) => {
                            const match = c.reason.match(/\[Số lượng: (\d+)\]/);
                            if (match) artPerformanceBonus += parseInt(match[1]) * 100000;
                            else artPerformanceBonus += 100000;
                          });
                          const allowance = teacher.monthlyAllowance || 500000;
                          const potentialBonus = teacher.bonus || 300000;
                          const attendanceBonus = (hasApprovedLeave ? 0 : potentialBonus) + artPerformanceBonus;
                          const socialInsurance = teacher.socialInsurance || 0;
                          const advanceSalary = teacher.advanceSalary || 0;
                          const deduction = teacher.deduction || 0;
                          const finalWage = baseLessonsSalary + allowance + attendanceBonus - deduction - socialInsurance - advanceSalary;

                          return (
                            <SortableReportRow 
                              key={teacher.id}
                              teacher={teacher}
                              totalPeriods={totalPeriods}
                              formatVND={formatVND}
                              baseLessonsSalary={baseLessonsSalary}
                              currentBonusPeriods={currentBonusPeriods}
                              onUpdateBonus={(val: number) => {
                                const newDict = { ...bonusPeriodsDict, [reportMonth]: val };
                                if (val === 0) delete newDict[reportMonth];
                                const updatedTeacher = { ...teacher, bonusPeriodsJSON: JSON.stringify(newDict) };
                                fetch('/api/teachers', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedTeacher)
                                }).then(() => {
                                  onUpdateTeachers(teachers.map((t: any) => t.id === teacher.id ? updatedTeacher : t));
                                }).catch(console.error);
                              }}
                              allowance={allowance}
                              hasApprovedLeave={hasApprovedLeave}
                              attendanceBonus={attendanceBonus}
                              potentialBonus={potentialBonus}
                              artPerformanceBonus={artPerformanceBonus}
                              socialInsurance={socialInsurance}
                              advanceSalary={advanceSalary}
                              deduction={deduction}
                              finalWage={finalWage}
                              isAdmin={currentUser?.role === 'admin'}
                            />
                          );
                        })}
                    </SortableContext>
                </tbody>
              </table>
              </DndContext>
            </div>

            {/* School level summarized analytics panel */}
            <div className="pt-6 border-t border-slate-150 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm font-sans">Báo cáo tóm lược theo Trường Đối Tác</h4>
              
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {(() => {
                  const [yearStr, monthStr] = reportMonth.split('-');
                  const year = parseInt(yearStr, 10) || 2026;
                  const month = (parseInt(monthStr, 10) || 7) - 1;

                  const dayOfWeekOccurrences: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
                  const numDays = new Date(year, month + 1, 0).getDate();
                  for (let day = 1; day <= numDays; day++) {
                    const d = new Date(year, month, day);
                    const jsDay = d.getDay();
                    const appDay = jsDay === 0 ? 8 : jsDay + 1;
                    dayOfWeekOccurrences[appDay] = (dayOfWeekOccurrences[appDay] || 0) + 1;
                  }

                  const activeSchools = [...schools];
                  
                  const orphanedClasses = classes.filter(cls => {
                    const hasValidSchool = schools.some(s => s.id === cls.schoolId);
                    if (hasValidSchool) return false;
                    
                    const classSchedules = rawSchedules.filter(s => s.classId === cls.id && !s.isDeleted);
                    const classSessions = classSchedules.reduce((sum, s) => sum + (dayOfWeekOccurrences[s.dayOfWeek] || 0), 0);
                    return classSessions > 0;
                  });

                  if (orphanedClasses.length > 0) {
                    activeSchools.push({
                      id: 'VIRTUAL_ORPHANED_SCHOOL',
                      name: '⚠️ Lớp chưa gán trường / cần sửa',
                      address: '',
                      lat: 10.8231,
                      lng: 106.6297,
                      contactPerson: '',
                      phone: '',
                      qrCodeData: '',
                      isDeleted: false
                    });
                  }

                  const getSortName = (name: string) => {
                    let n = name.trim().toLowerCase();
                    const prefixes = [
                      /^trường mầm non\s+/,
                      /^trường mn\s+/,
                      /^mầm non\s+/,
                      /^trường\s+/,
                      /^mn\s+/,
                      /^lớp mẫu giáo\s+/,
                      /^mẫu giáo\s+/
                    ];
                    for (const prefix of prefixes) {
                      n = n.replace(prefix, '');
                    }
                    return n;
                  };

                  activeSchools.sort((a, b) => {
                    if (a.id === 'VIRTUAL_ORPHANED_SCHOOL') return -1;
                    if (b.id === 'VIRTUAL_ORPHANED_SCHOOL') return 1;
                    
                    const nameA = getSortName(a.name);
                    const nameB = getSortName(b.name);
                    return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base', numeric: true });
                  });

                  const filteredSchools = activeSchools.filter(sch => 
                    sch.name.toLowerCase().includes(schoolFilterText.toLowerCase())
                  );

                  return (
                    <>
                      {/* Left Sidebar School Selector */}
                      <div className="w-full lg:w-64 shrink-0 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm lg:sticky lg:top-24 space-y-3 max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
                        <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider font-mono flex items-center justify-between border-b pb-2 border-slate-100 shrink-0">
                          <span>Trường Học ({activeSchools.length})</span>
                        </div>
                        
                        <div className="relative shrink-0">
                          <input
                            type="text"
                            placeholder="Tìm nhanh..."
                            value={schoolFilterText}
                            onChange={(e) => setSchoolFilterText(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none transition font-medium"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-450 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin select-none">
                          {activeSchools.map(sch => {
                            const isOrphaned = sch.id === 'VIRTUAL_ORPHANED_SCHOOL';
                            const matchesFilter = sch.name.toLowerCase().includes(schoolFilterText.toLowerCase());
                            return (
                              <button
                                key={sch.id}
                                onClick={() => {
                                  const element = document.getElementById(`school-card-${sch.id}`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                                    setTimeout(() => {
                                      element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                                    }, 1500);
                                  }
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition truncate block ${
                                  !matchesFilter 
                                    ? 'opacity-40 hover:opacity-100 hover:bg-slate-50' 
                                    : isOrphaned 
                                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                                      : 'text-slate-655 hover:text-blue-600 hover:bg-slate-50'
                                }`}
                              >
                                {isOrphaned ? '⚠️ Lớp chưa gán trường' : sch.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Grid of Cards */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {filteredSchools.map(sch => {
                          const isOrphaned = sch.id === 'VIRTUAL_ORPHANED_SCHOOL';
                          const sLogs = isOrphaned ? [] : attendance.filter(a => a.schoolId === sch.id && a.date.startsWith(reportMonth));
                          const totalPeriods = sLogs.reduce((sum, curr) => sum + curr.periods, 0);
                          const schoolClasses = isOrphaned ? orphanedClasses : classes.filter(c => c.schoolId === sch.id);
                          const monthCancellations = isOrphaned ? [] : schoolCancellations.filter(c => c.schoolId === sch.id && c.date.startsWith(reportMonth));
                          const numCancellations = monthCancellations.length;

                          // Group expected sessions by trimmed class name
                          const classSessionsMap: Record<string, number> = {};
                          schoolClasses.forEach(cls => {
                            const classSchedules = rawSchedules.filter(s => s.classId === cls.id && !s.isDeleted);
                            const classSessions = classSchedules.reduce((sum, s) => sum + (dayOfWeekOccurrences[s.dayOfWeek] || 0), 0);
                            
                            const trimmedName = cls.name.trim();
                            if (classSessions > 0) {
                              classSessionsMap[trimmedName] = (classSessionsMap[trimmedName] || 0) + classSessions;
                            }
                          });

                          const classNotes = Object.entries(classSessionsMap).map(([name, sessions]) => ({
                            name,
                            sessions
                          }));

                          const numClasses = classNotes.length;

                          // Compute teachers for this school
                          const schoolSchedulesForTeachers = rawSchedules.filter(s => 
                            (isOrphaned 
                              ? schoolClasses.some(c => c.id === s.classId) 
                              : s.schoolId === sch.id) 
                            && !s.isDeleted
                          );
                          const teacherIds = Array.from(new Set(schoolSchedulesForTeachers.map(s => s.teacherId)));
                          const teacherNames = teacherIds
                            .map(id => rawTeachers.find(t => t.id === id)?.name || id)
                            .filter(Boolean);

                          const yogaClasses = classNotes.filter(c => c.name.toLowerCase().includes('yoga'));
                          const aerobicClasses = classNotes.filter(c => !c.name.toLowerCase().includes('yoga'));
                          const sortedClassNotes = [...aerobicClasses, ...yogaClasses];

                          let classBadgeText = `${numClasses} lớp hiện có`;
                          if (yogaClasses.length > 0 && aerobicClasses.length > 0) {
                            classBadgeText = `${numClasses} lớp hiện có (${aerobicClasses.length} aerobic, ${yogaClasses.length} yoga)`;
                          }

                          return (
                            <div 
                              key={sch.id} 
                              id={`school-card-${sch.id}`}
                              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-sm hover:shadow transition-all duration-300 ${isOrphaned ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 flex-1">
                                  <strong className="text-xs font-extrabold text-slate-800 block truncate max-w-44 font-sans">{sch.name}</strong>
                                  {teacherNames.length > 0 && (
                                    <div className="text-[9.5px] text-slate-500 font-bold font-sans truncate max-w-44" title={teacherNames.join(', ')}>
                                      👩‍🏫 {teacherNames.join(', ')}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                    <span className={`text-[10px] border rounded px-1.5 py-0.5 font-bold inline-block ${isOrphaned ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                                      {classBadgeText}
                                    </span>
                                    {numCancellations > 0 && (
                                      <button 
                                        onClick={() => setSelectedCancellationSchool({ school: sch, cancellations: monthCancellations })}
                                        className="text-[10px] text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded px-1.5 py-0.5 font-bold inline-flex items-center gap-1 transition"
                                      >
                                        🚫 {numCancellations} buổi nghỉ (Xem lý do)
                                      </button>
                                    )}
                                  </div>
                                  {isOrphaned ? (
                                    <p className="text-[10px] text-amber-600 font-bold pt-1 leading-normal">
                                      Click 📝 để gán lớp vào trường học đúng
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-500 font-mono font-bold pt-1">Thực tế dạy: {totalPeriods} tiết dạy hoàn thành</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {!isOrphaned && (
                                    <button
                                      onClick={() => handleDeleteSchool(sch.id, sch.name)}
                                      className="p-1 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                      title="Xóa trường đối tác"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                  <div className={`p-1.5 rounded-lg ${isOrphaned ? 'bg-amber-100 text-amber-700' : 'bg-slate-200/60 text-slate-600'}`}>
                                    <Building className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>

                              {/* Class expected sessions notes */}
                              {sortedClassNotes.length > 0 && (
                                <div className="text-[10px] text-slate-500 bg-slate-100/50 p-2 rounded-lg border border-slate-150/40 space-y-0.5">
                                  <div className="font-bold text-[8.5px] text-slate-400 uppercase tracking-wider font-mono">Dự kiến số buổi dạy:</div>
                                  {sortedClassNotes.map((note, idx) => (
                                    <div key={idx} className="flex justify-between items-center group/item hover:bg-slate-200/50 p-0.5 rounded transition">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-semibold truncate">{note.name}</span>
                                        <button
                                          onClick={() => {
                                            const matchingClasses = schoolClasses.filter(c => c.name.trim() === note.name);
                                            setQuickEditClassData({
                                              name: note.name,
                                              schoolId: sch.id,
                                              classesToUpdate: matchingClasses
                                            });
                                            setShowCreateSchoolInline(false);
                                            setNewSchoolNameInline('');
                                            setTargetMergeClassId('');
                                          }}
                                          className="p-0.5 hover:bg-slate-250 rounded text-slate-400 hover:text-blue-600 transition shrink-0"
                                          title="Sửa lớp / Chuyển trường"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                      <span className="font-mono font-bold text-slate-700 shrink-0">{note.sessions} buổi</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>
        )}

        {/* ----------------TAB 8: AUDIT HISTORIC IMMUTABLE LOGS ---------------- */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn" id="logs_tab">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-lg">Nhật Ký Hệ Thống (Audit Log)</h3>
              <p className="text-xs text-slate-500">Giám sát vết kiểm duyệt ngân sách, điều hướng giáo viên. Nhật ký này được mã hóa bảo mật cố định và không cho phép can thiệp xóa dữ liệu.</p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-[10px] uppercase font-mono">{log.action}</span>
                      <span className="text-slate-400 font-mono">{log.timestamp.replace('T', ' ')}</span>
                    </div>
                    <p className="text-slate-600 font-sans mt-1">{log.details}</p>
                  </div>
                  <div className="shrink-0 text-slate-400 font-mono text-[9px] bg-slate-200/50 px-2 py-0.5 rounded">
                    Thực hiện: <b>{log.actor}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------TAB: USER ACCOUNTS AND CREDENTIALS ---------------- */}
        {activeTab === 'accounts' && currentUser?.role === 'admin' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="accounts_tab">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Quản Lý Tài Khoản & Phân Quyền
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Khởi tạo thông tin xác thực, điều phối vai trò (Admin, Quản lý, Giáo viên) và phân nhánh quyền hạn chi tiết.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => {
                    const newUsers = [...users];
                    let addedCount = 0;
                    
                    rawTeachers.filter(t => !t.isDeleted).forEach(teacher => {
                      // Check if a user already exists for this teacher
                      const exists = newUsers.some(u => u.teacherId === teacher.id || u.username === teacher.id);
                      if (!exists) {
                        newUsers.push({
                          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                          username: teacher.id,
                          password: '123456789',
                          role: 'member',
                          teacherId: teacher.id,
                          permissions: [],
                          isDeleted: false
                        });
                        addedCount++;
                      }
                    });
                    
                    if (addedCount > 0) {
                      onUpdateUsers(newUsers);
                      onAddAuditLog('Đồng bộ hệ thống', currentUser?.username || 'Admin', `Đã tự động tạo ${addedCount} tài khoản cho giáo viên`);
                      customAlert('Thông báo', `Đã đồng bộ và tạo tự động ${addedCount} tài khoản cho giáo viên.\n\nTài khoản: [Mã giáo viên]\nMật khẩu mặc định: 123456789\n\nVí dụ: mã GV001 -> pass: 123456789`);
                    } else {
                      customAlert('Thông báo', 'Tất cả giáo viên đã có tài khoản trên hệ thống!');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/15"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>ĐỒNG BỘ GIÁO VIÊN</span>
                </button>
                <button
                  onClick={() => {
                    setEditingUser({
                      username: '',
                      password: '',
                      role: 'member',
                      teacherId: null,
                      permissions: [],
                      isDeleted: false
                    });
                    setShowUserModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/15"
                >
                  <Plus className="h-4 w-4" />
                  <span>TẠO TÀI KHOẢN MỚI</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUserDragEnd}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="p-4">Tài khoản (Username)</th>
                    <th className="p-4">Mật khẩu</th>
                    <th className="p-4">Vai trò (Role)</th>
                    <th className="p-4">Giáo viên liên kết</th>
                    <th className="p-4">Quyền hạn chi tiết</th>
                    <th className="p-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-normal">Không tìm thấy tài khoản nào trên cơ sở dữ liệu</td>
                    </tr>
                  ) : (
                      <SortableContext items={users.map((u: any) => u.id)} strategy={verticalListSortingStrategy}>
                        {users
                          .sort((a: any, b: any) => {
                            if (searchTerm) return 0;
                            const iA = userOrder.indexOf(a.id);
                            const iB = userOrder.indexOf(b.id);
                            if (iA === -1 && iB === -1) return 0;
                            if (iA === -1) return 1;
                            if (iB === -1) return -1;
                            return iA - iB;
                          })
                          .map((u: any) => {
                            const linkedTeacher = rawTeachers.find((t: any) => t.id === u.teacherId);
                            return (
                              <SortableUserRow 
                                key={u.id}
                                u={u}
                                linkedTeacher={linkedTeacher}
                                AVAILABLE_PERMISSIONS={AVAILABLE_PERMISSIONS}
                                setEditingUser={setEditingUser}
                                setShowUserModal={setShowUserModal}
                                handleDeleteUser={handleDeleteUser}
                              />
                            );
                          })}
                      </SortableContext>
                  )}
                </tbody>
              </table>
              </DndContext>
            </div>
          </div>
        )}

        {/* ----------------TAB 9: RECYCLABLE TRASH BIN ---------------- */}
        {activeTab === 'trash' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn" id="trash_tab">
            <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" /> Thùng Rác Hệ Thống
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nơi khôi phục hoặc xóa vĩnh viễn dữ liệu. Các bản ghi bị xóa tạm thời được ẩn và giữ an toàn tại đây trong vòng 30 ngày (bảo vệ tránh mất mát dữ liệu).
                </p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 text-rose-700 text-xs shrink-0 max-w-sm">
                <b>💡 Ghi chú:</b> Dữ liệu ở đây hoàn toàn bị ẩn khỏi tầm nhìn của giáo viên và giao diện chấm công tiêu chuẩn.
              </div>
            </div>

            {/* Sub-tabs inside trash */}
            <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
              {[
                { id: 'schedules', label: 'Lịch Học', count: rawSchedules.filter(s => s.isDeleted).length },
                { id: 'teachers', label: 'Giáo Viên', count: rawTeachers.filter(t => t.isDeleted).length },
                { id: 'schools', label: 'Trường Học', count: rawSchools.filter(s => s.isDeleted).length },
                { id: 'classes', label: 'Lớp Học', count: rawClasses.filter(c => c.isDeleted).length }
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setTrashCategory(subTab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                    trashCategory === subTab.id
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {subTab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    trashCategory === subTab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {subTab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Category content */}
            <div className="space-y-4">
              {trashCategory === 'schedules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawSchedules.filter(s => s.isDeleted).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm">Thùng rác lịch dạy trống</div>
                  ) : (
                    rawSchedules.filter(s => s.isDeleted).map((s) => (
                      <div key={s.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 relative group hover:border-slate-200 transition-colors">
                        <div>
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Mã: {s.id}</span>
                          <span className="ml-2 font-semibold text-xs text-rose-500">Đã xóa</span>
                        </div>
                        <div className="text-xs text-slate-700 space-y-1">
                          <p>🏫 Trường: <b className="text-slate-900">{getSchoolName(s.schoolId, s)}</b></p>
                          <p>🏫 Lớp: <b className="text-slate-900">{getClassName(s.classId)}</b></p>
                          <p>👤 Giáo viên: <b className="text-slate-900">{getTeacherName(s.teacherId)}</b></p>
                          <p>📅 Thời gian: <b>Thứ {s.dayOfWeek === 8 ? 'Nhật' : s.dayOfWeek} • {getSessionShort(s.session)}</b> ({s.periods} tiết)</p>
                          {s.deletedAt && (
                            <p className="text-[10px] text-slate-400 mt-2 font-mono">Xóa lúc: {new Date(s.deletedAt).toLocaleString('vi-VN')}</p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              onUpdateSchedules(rawSchedules.map(item => item.id === s.id ? { ...item, isDeleted: false, deletedAt: undefined } : item));
                              onAddAuditLog('Phục hồi lịch dạy', 'Admin', `Đã khôi phục lịch dạy lớp ${getClassName(s.classId)} của ${getTeacherName(s.teacherId)}`);
                            }}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 py-1.5 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Khôi phục
                          </button>
                          <button
                            onClick={() => {
                              customConfirm(
                                'Xóa vĩnh viễn lịch dạy 🚨',
                                'CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN buổi lịch này không? Thao tác này sẽ xóa triệt để khỏi cơ sở dữ liệu và không thể hoàn tác!',
                                () => {
                                  onUpdateSchedules(rawSchedules.filter(item => item.id !== s.id));
                                  onAddAuditLog('Xóa vĩnh viễn lịch dạy', 'Admin', `Đã xóa vĩnh viễn hoàn toàn lịch học mã số ${s.id}`);
                                },
                                'XÓA VĨNH VIỄN',
                                'Hủy',
                                true
                              );
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 p-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {trashCategory === 'teachers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawTeachers.filter(t => t.isDeleted).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm">Thùng rác giáo viên trống</div>
                  ) : (
                    rawTeachers.filter(t => t.isDeleted).map((t) => (
                      <div key={t.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 relative group hover:border-slate-200 transition-colors">
                        <div>
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Mã: {t.id}</span>
                          <span className="ml-2 font-semibold text-xs text-rose-500">Đã xóa</span>
                        </div>
                        <div className="text-xs text-slate-700 space-y-1">
                          <p>👤 Giáo viên: <b className="text-slate-900 text-sm">{t.name}</b></p>
                          <p>📧 Email: <span>{t.email || '(trống)'}</span></p>
                          <p>📞 Điện thoại: <span>{t.phone || '(trống)'}</span></p>
                          <p>💵 Thù lao: <b>{formatVND(t.hourlyRate)}/tiết</b></p>
                          {t.deletedAt && (
                            <p className="text-[10px] text-slate-400 mt-2 font-mono">Xóa lúc: {new Date(t.deletedAt).toLocaleString('vi-VN')}</p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              onUpdateTeachers(rawTeachers.map(item => item.id === t.id ? { ...item, isDeleted: false, deletedAt: undefined } : item));
                              onAddAuditLog('Phục hồi hồ sơ giáo viên', 'Admin', `Đã khôi phục hồ sơ cho Giáo viên ${t.name} (${t.id})`);
                            }}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 py-1.5 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Khôi phục
                          </button>
                          <button
                            onClick={() => {
                              customConfirm(
                                'Xóa vĩnh viễn giáo viên 🚨',
                                `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN giáo viên ${t.name} không? Thao tác này sẽ xóa triệt để thông tin và bảng chấm công liên quan khỏi cơ sở dữ liệu và không thể hoàn tác!`,
                                () => {
                                  onUpdateTeachers(rawTeachers.filter(item => item.id !== t.id));
                                  onAddAuditLog('Xóa vĩnh viễn giáo viên', 'Admin', `Đã xóa vĩnh viễn hoàn toàn Hồ sơ giáo viên ${t.name} (${t.id})`);
                                },
                                'XÓA VĨNH VIỄN',
                                'Hủy',
                                true
                              );
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 p-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {trashCategory === 'schools' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawSchools.filter(s => s.isDeleted).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm">Thùng rác trường học trống</div>
                  ) : (
                    rawSchools.filter(s => s.isDeleted).map((s) => (
                      <div key={s.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 relative group hover:border-slate-200 transition-colors">
                        <div>
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Mã: {s.id}</span>
                          <span className="ml-2 font-semibold text-xs text-rose-500">Đã xóa</span>
                        </div>
                        <div className="text-xs text-slate-700 space-y-1">
                          <p>🏫 Trường: <b className="text-slate-900 text-sm">{s.name}</b></p>
                          <p>📍 Địa chỉ: <span>{s.address}</span></p>
                          <p>👤 Người liên hệ: <span>{s.contactPerson || '(trống)'}</span></p>
                          {s.deletedAt && (
                            <p className="text-[10px] text-slate-400 mt-2 font-mono">Xóa lúc: {new Date(s.deletedAt).toLocaleString('vi-VN')}</p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              onUpdateSchools(rawSchools.map(item => item.id === s.id ? { ...item, isDeleted: false, deletedAt: undefined } : item));
                              onAddAuditLog('Phục hồi trường học', 'Admin', `Đã khôi phục đối tác Trường ${s.name} (${s.id})`);
                            }}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 py-1.5 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Khôi phục
                          </button>
                          <button
                            onClick={() => {
                              customConfirm(
                                'Xóa vĩnh viễn trường học 🚨',
                                `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN trường học ${s.name} không? Thao tác này sẽ xóa triệt để trường và lớp học liên quan khỏi cơ sở dữ liệu và không thể hoàn tác!`,
                                () => {
                                  onUpdateSchools(rawSchools.filter(item => item.id !== s.id));
                                  onAddAuditLog('Xóa vĩnh viễn trường học', 'Admin', `Đã xóa vĩnh viễn hoàn toàn đối tác Trường ${s.name} (${s.id})`);
                                },
                                'XÓA VĨNH VIỄN',
                                'Hủy',
                                true
                              );
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 p-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {trashCategory === 'classes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawClasses.filter(c => c.isDeleted).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm">Thùng rác lớp học trống</div>
                  ) : (
                    rawClasses.filter(c => c.isDeleted).map((c) => (
                      <div key={c.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 relative group hover:border-slate-200 transition-colors">
                        <div>
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Mã: {c.id}</span>
                          <span className="ml-2 font-semibold text-xs text-rose-500">Đã xóa</span>
                        </div>
                        <div className="text-xs text-slate-700 space-y-1">
                          <p>🏫 Lớp: <b className="text-slate-900 text-sm">{c.name}</b></p>
                          <p>🏫 Trực thuộc: <span>{getSchoolName(c.schoolId)}</span></p>
                          <p>👥 Sĩ số: <span>{c.studentCount} học sinh</span></p>
                          {c.deletedAt && (
                            <p className="text-[10px] text-slate-400 mt-2 font-mono">Xóa lúc: {new Date(c.deletedAt).toLocaleString('vi-VN')}</p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              onUpdateClasses(rawClasses.map(item => item.id === c.id ? { ...item, isDeleted: false, deletedAt: undefined } : item));
                              onAddAuditLog('Phục hồi lớp học', 'Admin', `Đã khôi phục Lớp học ${c.name} thuộc Trường ${getSchoolName(c.schoolId)}`);
                            }}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 py-1.5 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Khôi phục
                          </button>
                          <button
                            onClick={() => {
                              customConfirm(
                                'Xóa vĩnh viễn lớp học 🚨',
                                `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN lớp học ${c.name} không? Thao tác này sẽ xóa triệt để khỏi cơ sở dữ liệu và không thể hoàn tác!`,
                                () => {
                                  onUpdateClasses(rawClasses.filter(item => item.id !== c.id));
                                  onAddAuditLog('Xóa vĩnh viễn lớp học', 'Admin', `Đã xóa vĩnh viễn hoàn toàn Lớp học ${c.name} (${c.id})`);
                                },
                                'XÓA VĨNH VIỄN',
                                'Hủy',
                                true
                              );
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 p-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: TEACHER EDITOR MODAL */}
      {/* ------------------------------------------------------------- */}
      {showTeacherModal && editingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="teacher_mod">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-lg">
                {editingTeacher.id ? 'Sửa thông tin & Lương Giáo viên' : 'Tuyển dụng Giáo viên mới'}
              </h4>
              <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã Số Giáo Viên</label>
                  <input 
                    type="text" 
                    value={editingTeacher.id || ''} 
                    onChange={e => setEditingTeacher({ ...editingTeacher, id: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono font-bold" 
                    placeholder="Sẽ tự sinh nếu để trống"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Họ và Tên *</label>
                  <input 
                    required
                    type="text" 
                    value={editingTeacher.name || ''} 
                    onChange={e => setEditingTeacher({ ...editingTeacher, name: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded font-sans text-slate-800 focus:ring-1 focus:ring-blue-500" 
                    placeholder="Nguyễn Thị Lan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Ngày sinh</label>
                  <input 
                    type="date" 
                    value={editingTeacher.dob || ''} 
                    onChange={e => setEditingTeacher({ ...editingTeacher, dob: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Số điện thoại *</label>
                  <input 
                    required
                    type="tel" 
                    value={editingTeacher.phone || ''} 
                    onChange={e => setEditingTeacher({ ...editingTeacher, phone: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                    placeholder="0912xxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Thư điện tử (Email)</label>
                <input 
                  type="email" 
                  value={editingTeacher.email || ''} 
                  onChange={e => setEditingTeacher({ ...editingTeacher, email: e.target.value })} 
                  className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                  placeholder="name@etms.edu.vn"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Địa chỉ thường trú</label>
                <input 
                  type="text" 
                  value={editingTeacher.address || ''} 
                  onChange={e => setEditingTeacher({ ...editingTeacher, address: e.target.value })} 
                  className="w-full p-2 border border-slate-200 rounded text-slate-800" 
                />
              </div>

              {/* LƯƠNG CHI TIẾT */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-blue-600" /> Cấu hình các loại thu nhập cố định và đơn giá
                </h5>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Đơn giá / Tiết dạy (VNĐ) *</label>
                    <input 
                      required
                      type="number" 
                      value={editingTeacher.hourlyRate || ''} 
                      onChange={e => setEditingTeacher({ ...editingTeacher, hourlyRate: Number(e.target.value) })} 
                      className="w-full p-2 border border-slate-200 rounded text-blue-900 font-bold font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Phụ cấp cố định / tháng</label>
                    <input 
                      type="number" 
                      value={editingTeacher.monthlyAllowance || 0} 
                      onChange={e => setEditingTeacher({ ...editingTeacher, monthlyAllowance: Number(e.target.value) })} 
                      className="w-full p-2 border border-slate-200 rounded text-slate-800 font-semibold font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Thưởng Chuyên Cần (nếu ko nghỉ)</label>
                    <input 
                      type="number" 
                      value={editingTeacher.bonus || 0} 
                      onChange={e => setEditingTeacher({ ...editingTeacher, bonus: Number(e.target.value) })} 
                      className="w-full p-2 border border-slate-200 rounded text-emerald-600 font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Phạt vi phạm (Khấu trừ)</label>
                    <input 
                      type="number" 
                      value={editingTeacher.deduction || 0} 
                      onChange={e => setEditingTeacher({ ...editingTeacher, deduction: Number(e.target.value) })} 
                      className="w-full p-2 border border-slate-200 rounded text-red-500 font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Đóng BHXH</label>
                    <input 
                      type="number" 
                      value={editingTeacher.socialInsurance || 0} 
                      onChange={e => setEditingTeacher({ ...editingTeacher, socialInsurance: Number(e.target.value) })} 
                      className="w-full p-2 border border-slate-200 rounded text-red-500 font-mono" 
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const amountStr = window.prompt("Nhập số tiền ứng lương (VNĐ):", String(editingTeacher.advanceSalary || 0));
                        if (amountStr !== null) {
                          const amount = parseInt(amountStr, 10);
                          if (!isNaN(amount)) {
                            setEditingTeacher({ ...editingTeacher, advanceSalary: amount });
                          }
                        }
                      }}
                      className="w-full p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 rounded font-bold text-sm transition"
                    >
                      {editingTeacher.advanceSalary ? `Đã ứng: ${formatVND(editingTeacher.advanceSalary)}` : 'Nhập Ứng Lương'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Trạng thái làm việc</label>
                  <select 
                    value={editingTeacher.status || 'active'} 
                    onChange={e => setEditingTeacher({ ...editingTeacher, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 bg-white"
                  >
                    <option value="active">Đang giảng dạy (Active)</option>
                    <option value="inactive">Tạm ngưng (Inactive)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Ghi chú bộ phận chuyên môn</label>
                  <input 
                    type="text" 
                    placeholder="..."
                    value={editingTeacher.notes || ''} 
                    onChange={e => setEditingTeacher({ ...editingTeacher, notes: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg"
                  onClick={() => setShowTeacherModal(false)}
                >
                  Đóng
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: SCHOOL EDITOR MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSchoolModal && editingSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="school_mod">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 my-8">
            <h4 className="font-bold text-slate-800 text-lg">
              {editingSchool.id ? 'Cập nhật trường học đối tác' : 'Ký kết & Thêm trường đối tác'}
            </h4>

            <form onSubmit={handleSaveSchool} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã Trường học</label>
                  <input 
                    type="text" 
                    value={editingSchool.id || ''} 
                    onChange={e => setEditingSchool({ ...editingSchool, id: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono font-bold" 
                    placeholder="Sẽ tự sinh nếu trống"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tên Điểm Trường *</label>
                  <input 
                    required
                    type="text" 
                    value={editingSchool.name || ''} 
                    onChange={e => setEditingSchool({ ...editingSchool, name: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800" 
                    placeholder="Trường Hoa Hồng"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Địa chỉ cụ thể *</label>
                <input 
                  required
                  type="text" 
                  value={editingSchool.address || ''} 
                  onChange={e => setEditingSchool({ ...editingSchool, address: e.target.value })} 
                  className="w-full p-2 border border-slate-200 rounded text-slate-800" 
                  placeholder="Số 10 Nguyễn Huệ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Người đại diện liên hệ</label>
                  <input 
                    type="text" 
                    value={editingSchool.contactPerson || ''} 
                    onChange={e => setEditingSchool({ ...editingSchool, contactPerson: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800" 
                    placeholder="Cô Hiệu Trưởng"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Số điện thoại liên lạc</label>
                  <input 
                    type="text" 
                    value={editingSchool.phone || ''} 
                    onChange={e => setEditingSchool({ ...editingSchool, phone: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                    placeholder="028..."
                  />
                </div>
              </div>

              {/* LOCATIVE GPS - EXTREMELY HELPFUL SLIDER EXPLAINING CHAT CHEATS */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                <span className="font-bold text-amber-900 block">🎯 Định Vị Định Danh Toạ Độ Trường:</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Kinh độ và vĩ độ được so sánh trực tiếp từ điện thoại giáo viên lúc họ bấm check-in. Vui lòng nhập số thực phân tích:
                </p>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold">Vĩ độ (Latitude)</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={editingSchool.lat || 10.774}
                      onChange={e => setEditingSchool({ ...editingSchool, lat: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold">Kinh độ (Longitude)</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={editingSchool.lng || 106.702}
                      onChange={e => setEditingSchool({ ...editingSchool, lng: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" className="px-3 py-1.5 bg-slate-100 rounded text-slate-600" onClick={() => setShowSchoolModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold">
                  {editingSchool.originalId ? 'Lưu thay đổi' : 'Ký kết & Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CLASS EDITOR MODAL */}
      {/* ------------------------------------------------------------- */}
      {showClassModal && editingClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="class_mod">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 my-8">
            <h4 className="font-bold text-slate-800 text-base">
              {editingClass.id ? 'Sửa thông tin lớp học' : 'Khai sinh lớp học phân khu'}
            </h4>

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã Lớp học</label>
                  <input 
                    type="text" 
                    value={editingClass.id || ''} 
                    onChange={e => setEditingClass({ ...editingClass, id: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono font-bold" 
                    placeholder="Sẽ tự sinh nếu trống"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tên Lớp mầm non *</label>
                  <input 
                    required
                    type="text" 
                    value={editingClass.name || ''} 
                    onChange={e => setEditingClass({ ...editingClass, name: e.target.value })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800" 
                    placeholder="Ví dụ: Chồi 3, Lá 1..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Trường quản lý trực thuộc</label>
                <select 
                  value={editingClass.schoolId || ''} 
                  onChange={e => setEditingClass({ ...editingClass, schoolId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-slate-800 bg-white"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Sĩ số học sinh (HS)</label>
                  <input 
                    type="number" 
                    value={editingClass.studentCount || ''} 
                    onChange={e => setEditingClass({ ...editingClass, studentCount: Number(e.target.value) })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Số Tiết chuẩn quy định</label>
                  <input 
                    type="number" 
                    value={editingClass.standardPeriods || ''} 
                    onChange={e => setEditingClass({ ...editingClass, standardPeriods: Number(e.target.value) })} 
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" className="px-3 py-1.5 bg-slate-100 rounded text-slate-600" onClick={() => setShowClassModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold">
                  {editingClass.originalId ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DRAG ACTION SELECTION MODAL */}
      {/* ------------------------------------------------------------- */}
      {showDragActionModal && draggedSchedule && dragDropTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 my-8 text-left text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">
                Xử lý kéo thả lịch dạy
              </h4>
              <button 
                type="button"
                onClick={closeDragModal}
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-slate-700 leading-normal border border-slate-100">
              <p><strong>Giáo viên:</strong> {getTeacherName(draggedSchedule.teacherId)}</p>
              <p><strong>Lớp:</strong> {getClassName(draggedSchedule.classId)}</p>
              <p><strong>Trường:</strong> {getSchoolName(draggedSchedule.schoolId, draggedSchedule)}</p>
              <p className="pt-1.5 border-t border-slate-200/50 text-[10px] text-slate-450">
                Kéo từ: Thứ {draggedSchedule.dayOfWeek} ({getSessionType(draggedSchedule.session) === 'morning' ? 'Ca Sáng' : 'Ca Chiều'})
              </p>
              <p className="text-[10px] text-blue-600 font-semibold">
                Thả tới: Thứ {dragDropTarget.dayOfWeek} ({dragDropTarget.session === 'morning' ? 'Ca Sáng' : 'Ca Chiều'})
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => confirmDragAction('move')}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Di chuyển lịch dạy này
              </button>

              <button
                type="button"
                onClick={() => confirmDragAction('copy')}
                className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-2xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Sao chép lịch (Tạo bản sao mới)
              </button>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="font-bold text-slate-500 block">Hoặc chuyển / sao chép cho giáo viên khác:</label>
                <select
                  value={dragTransferTeacherId}
                  onChange={e => setDragTransferTeacherId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none"
                >
                  <option value="" disabled>Chọn giáo viên nhận lịch...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!dragTransferTeacherId}
                    onClick={() => confirmDragAction('transfer', { newTeacherId: dragTransferTeacherId, isCopy: false })}
                    className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Chuyển hẳn
                  </button>
                  <button
                    type="button"
                    disabled={!dragTransferTeacherId}
                    onClick={() => confirmDragAction('transfer', { newTeacherId: dragTransferTeacherId, isCopy: true })}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Sao chép sang
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: WEEKLY SCHEDULE ASSIGNER MODAL */}
      {/* ------------------------------------------------------------- */}
      {showScheduleModal && editingSchedule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto" id="schedule_mod">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 my-8">
            <h4 className="font-bold text-slate-800 text-base">
              {editingSchedule.id ? 'Điều chỉnh buổi giảng tuần' : 'Phân bổ ca dạy cố định hàng tuần'}
            </h4>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Chọn Thứ trong tuần</label>
                  <select 
                    value={editingSchedule.dayOfWeek || 2}
                    onChange={e => setEditingSchedule({ ...editingSchedule, dayOfWeek: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800"
                  >
                    <option value={2}>Thứ 2</option>
                    <option value={3}>Thứ 3</option>
                    <option value={4}>Thứ 4</option>
                    <option value={5}>Thứ 5</option>
                    <option value={6}>Thứ 6</option>
                    <option value={7}>Thứ 7</option>
                    <option value={8}>Chủ Nhật</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Giờ (Sáng, Chiều, 8h15, etc.)</label>
                  <input 
                    type="text"
                    value={editingSchedule.session || ''}
                    onChange={e => setEditingSchedule({ ...editingSchedule, session: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800"
                    placeholder="VD: Sáng, 8h10..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Trường học</label>
                <input 
                  type="text"
                  value={getSchoolInputValue(editingSchedule.schoolId)}
                  onChange={e => setEditingSchedule({ ...editingSchedule, schoolId: e.target.value })}
                  placeholder="Nhập tên trường học..."
                  className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Lớp học</label>
                  <input 
                    type="text"
                    value={getClassInputValue(editingSchedule.classId)}
                    onChange={e => setEditingSchedule({ ...editingSchedule, classId: e.target.value })}
                    placeholder="vd: Lá 1, Chồi 3..."
                    className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Số tiết dạy thực hiện</label>
                  <input 
                    type="number" 
                    value={editingSchedule.periods || 3}
                    onChange={e => setEditingSchedule({ ...editingSchedule, periods: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded text-slate-800 font-mono" 
                  />
                </div>
              </div>

              {scheduleTeacherFilter === 'all' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Giáo viên phụ trách chính</label>
                  <input 
                    type="text"
                    value={getTeacherInputValue(editingSchedule.teacherId)}
                    onChange={e => setEditingSchedule({ ...editingSchedule, teacherId: e.target.value })}
                    placeholder="Nhập tên hoặc mã giáo viên..."
                    className="w-full p-2 border border-slate-200 rounded bg-white text-slate-800 font-sans"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" className="px-3 py-1.5 bg-slate-100 rounded text-slate-600" onClick={() => setShowScheduleModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold">Xác nhận gán</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4.5: USER ACCOUNT EDITOR MODAL */}
      {/* ------------------------------------------------------------- */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto animate-fadeIn" id="user_mod">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 my-8 animate-scaleUp">
            <h4 className="font-bold text-slate-800 text-base">
              {editingUser.id ? 'Cập nhật tài khoản & Phân quyền' : 'Thiết lập tài khoản nghiệp vụ mới'}
            </h4>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Tên tài khoản (Username) *</label>
                <input 
                  required
                  type="text" 
                  disabled={editingUser.username === 'admin'}
                  value={editingUser.username || ''} 
                  onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50" 
                  placeholder="nhập tên đăng nhập không dấu..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500">Mật khẩu mới / Cũ *</label>
                <input 
                  required
                  type="text" 
                  value={editingUser.password || ''} 
                  onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-blue-500" 
                  placeholder="nhập mật khẩu an toàn..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Phân cấp Vai Trò (Role) *</label>
                  <select 
                    disabled={editingUser.username === 'admin'}
                    value={editingUser.role || 'member'}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white"
                  >
                    <option value="admin">Quản Trị Viên (Admin)</option>
                    <option value="manager">Quản lý (Manager)</option>
                    <option value="hr">Phòng Nhân sự (HR)</option>
                    <option value="training">Phòng Đào tạo (Training)</option>
                    <option value="accounting">Phòng Kế toán (Accounting)</option>
                    <option value="member">Thầy / Cô Giáo viên (Teacher)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">Giáo viên liên kết</label>
                  <select 
                    value={editingUser.teacherId || ''}
                    onChange={e => setEditingUser({ ...editingUser, teacherId: e.target.value || null })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 bg-white"
                  >
                    <option value="">-- Không liên kết --</option>
                    {rawTeachers.filter(t => !t.isDeleted).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PERMISSION CHECKBOXES - ONLY APPLICABLE IF NOT ADMIN */}
              {editingUser.role !== 'admin' ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Phân quyền chi tiết cho nhân viên
                  </h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_PERMISSIONS.map((ap) => {
                      const currentPerms = ensureArray(editingUser.permissions);
                      const isChecked = currentPerms.includes(ap.value);
                      return (
                        <label key={ap.value} className="flex items-start gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              const nextPerms = e.target.checked 
                                ? [...currentPerms, ap.value]
                                : currentPerms.filter(p => p !== ap.value);
                              setEditingUser({ ...editingUser, permissions: nextPerms });
                            }}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-medium text-slate-600">{ap.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl text-[11px] font-semibold border border-blue-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                  <span>Tài khoản Admin chứa tất cả đặc quyền hệ thống mặc định.</span>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
                <button type="button" className="px-3 py-1.5 bg-slate-100 rounded text-slate-600 cursor-pointer" onClick={() => setShowUserModal(false)}>Hủy</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer">Lưu cấu hình</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CHANGE REQUEST MODAL */}
      {/* ------------------------------------------------------------- */}
      {showChangeModal && editingChange && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 my-8 animate-scaleUp">
            <h4 className="font-bold text-slate-800 text-base">
              {editingChange.id ? 'Sửa Đơn Xin Nghỉ/Đổi Ca' : 'Tạo Đơn Xin Nghỉ/Đổi Ca Mới'}
            </h4>
            
            <form onSubmit={handleSaveChange} className="space-y-4 text-sm mt-4">
              <div className="space-y-3">
                
                {/* 1. Giáo viên */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Của Giáo Viên <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={editingChange.teacherId || ''} 
                    onChange={e => setEditingChange({ ...editingChange, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn Giáo Viên --</option>
                    {rawTeachers.filter(t => !t.isDeleted).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Loại yêu cầu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Phân Loại Yêu Cầu <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={editingChange.requestType || 'sick_leave'} 
                    onChange={e => setEditingChange({ ...editingChange, requestType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sick_leave">Xin Nghỉ Dạy (Phép, Ốm...)</option>
                    <option value="swap_shift">Đổi Ca Có Giáo Viên Khác</option>
                    <option value="substitute_teacher">Xin Người Dạy Thế/Lót</option>
                  </select>
                </div>

                {/* 3. Ngày xin đổi */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Ngày áp dụng <span className="text-red-500">*</span></label>
                    <input 
                      type="date"
                      required
                      value={editingChange.date || ''}
                      onChange={e => setEditingChange({ ...editingChange, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Ca dạy (Sáng, 8h10...) <span className="text-red-500">*</span></label>
                    <input 
                      required
                      type="text"
                      placeholder="VD: Sáng, 8h10..."
                      value={editingChange.session || ''} 
                      onChange={e => setEditingChange({ ...editingChange, session: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 4. Target Teacher nếu đổi ca */}
                {(editingChange.requestType === 'swap_shift' || editingChange.requestType === 'substitute_teacher') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Giáo viên thay thế (tùy chọn)</label>
                    <select 
                      value={editingChange.targetTeacherId || ''} 
                      onChange={e => setEditingChange({ ...editingChange, targetTeacherId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Không xác định --</option>
                      {getAvailableTeachersForDateSession(editingChange.date, editingChange.session, editingChange.teacherId).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 5. Lý do */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Lý do chi tiết <span className="text-red-500">*</span></label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Nhập lý do vắng mặt..."
                    value={editingChange.reason || ''} 
                    onChange={e => setEditingChange({ ...editingChange, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              <div className="flex gap-2 pt-4 justify-end border-t border-slate-100">
                <button type="button" className="px-3 py-1.5 bg-slate-100 rounded text-slate-600 font-medium cursor-pointer" onClick={() => setShowChangeModal(false)}>Hủy bỏ</button>
                <button type="submit" className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold cursor-pointer">LƯU YÊU CẦU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: QR PREVIEW */}
      {/* ------------------------------------------------------------- */}
      {selectedQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55" onClick={() => setSelectedQR(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-slate-800 text-sm">QR Code Điểm Danh {selectedQR.schoolName}</h4>
            <p className="text-xs text-slate-500">Vui lòng dán bản QR này tại văn phòng trường đối tác để giáo viên dùng Camera để quét kiểm toán đối sánh chéo vị trí GPS.</p>
            
            <div className="mx-auto flex justify-center py-4 bg-slate-50 rounded-xl">
              <div className="bg-white p-4 border border-slate-200 shadow-inner rounded-xl flex flex-col items-center">
                {/* Simulated visual QR graphic representation using styled borders */}
                <div className="w-40 h-40 border-[10px] border-black flex flex-wrap p-2 relative">
                  <div className="w-10 h-10 bg-black absolute top-0 left-0"></div>
                  <div className="w-10 h-10 bg-black absolute top-0 right-0"></div>
                  <div className="w-10 h-10 bg-black absolute bottom-0 left-0"></div>
                  {/* Internal grid elements simulating complex qr noise */}
                  <div className="absolute inset-4 border border-dashed border-slate-500 flex flex-wrap gap-1 p-0.5 justify-center overflow-hidden">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 ${i % 3 === 0 || i % 7 === 1 ? 'bg-black' : 'bg-transparent'}`} />
                    ))}
                  </div>
                  {/* Center branding */}
                  <div className="absolute inset-15 bg-white border border-slate-200 rounded flex items-center justify-center">
                    <span className="text-[8px] font-mono font-bold text-blue-600">ETMS</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-3 font-semibold select-all bg-slate-50 p-1 rounded border border-slate-100">{selectedQR.code}</span>
              </div>
            </div>

            <button onClick={() => setSelectedQR(null)} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono">Đóng QR Code</button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: SELFIE VERIFICATION AND EXTRAS */}
      {/* ------------------------------------------------------------- */}
      {selectedSelfie && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55" onClick={() => setSelectedSelfie(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 relative" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-slate-800 text-sm">Hình Ảnh Selfie Xác Thực Chấm Công</h4>
            <p className="text-xs text-slate-400">Hình ảnh chụp thời gian thực tại lớp học của Cô <b>{selectedSelfie.teacherName}</b></p>
            
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={selectedSelfie.imgUrl} alt="selfie detailed view" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white p-3 text-left space-y-0.5 text-xs">
                <p>Khung giờ: <b>{selectedSelfie.time}</b></p>
                <p>Địa điểm chênh lệch: <b className="text-emerald-400">{selectedSelfie.distance} mét (ĐÚNG NƠI QUY ĐỊNH)</b></p>
                <p>Phương thức kiểm định: <b>{selectedSelfie.method}</b></p>
              </div>
            </div>

            <button onClick={() => setSelectedSelfie(null)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">Xác nhận đúng người</button>
          </div>
        </div>
      )}

      {/* Google Sheets Synchronisation Modal */}
      <SheetsSyncModal 
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncCompleted={handleSyncCompleted}
        currentTeachersCount={teachers.length}
        existingTeachers={teachers}
        existingSchools={schools}
      />

      {/* ------------------------------------------------------------- */}
      {/* MANUAL ATTENDANCE ENTRY MODAL */}
      {/* ------------------------------------------------------------- */}
      {manualAttModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <span className="text-purple-600">✏️</span> Nhập Điểm Danh Thủ Công
            </h4>
            <div className="bg-purple-50 rounded-xl p-3 space-y-1 text-xs text-slate-700">
              <p><b>Giáo viên:</b> {rawTeachers.find(t => t.id === manualAttModal.teacherId)?.name || manualAttModal.teacherId}</p>
              <p><b>Trường:</b> {getSchoolName(manualAttModal.schoolId)}</p>
              <p><b>Ngày:</b> {manualAttModal.date}</p>
              <p><b>Ca:</b> {getSessionLabel(manualAttModal.session)}</p>
              <p><b>Số lịch:</b> {manualAttModal.scheduleIds.length} ca ({manualAttModal.classIds.map(c => getClassName(c)).join(', ')})</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Ghi chú lý do nhập thủ công:</label>
              <input
                type="text"
                value={manualAttNote}
                onChange={e => setManualAttNote(e.target.value)}
                placeholder="VD: Giáo viên quên điểm danh, lỗi GPS..."
                className="w-full text-sm p-2 border border-purple-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setManualAttModal(null); setManualAttNote(''); }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleAddManualAttendance}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition"
              >
                ✓ Xác nhận nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM CONFIRM & ALERT MODAL */}
      {/* ------------------------------------------------------------- */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fadeIn" id="custom_confirm_modal">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-2xl ${
                confirmState.isLargeWarning 
                  ? 'bg-rose-50 text-rose-600' 
                  : confirmState.isAlertOnly 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {confirmState.isLargeWarning ? (
                  <ShieldAlert className="h-6 w-6" />
                ) : confirmState.isAlertOnly ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-bold text-slate-800 text-base leading-tight">
                  {confirmState.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium whitespace-pre-wrap leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-50">
              {!confirmState.isAlertOnly && (
                <button
                  onClick={() => setConfirmState(null)}
                  className="px-4 py-2 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold border border-slate-100 transition-colors"
                >
                  {confirmState.cancelText || 'Hủy'}
                </button>
              )}
              <button
                onClick={confirmState.onConfirm}
                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm ${
                  confirmState.isLargeWarning
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : confirmState.isAlertOnly
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {confirmState.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedCancellationSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-slate-800 text-sm font-sans">
                    Chi tiết nghỉ - {selectedCancellationSchool.school.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedCancellationSchool(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {selectedCancellationSchool.cancellations.map(c => {
                  const teacher = teachers.find(t => t.id === c.teacherId);
                  const classObj = classes.find(cl => cl.id === c.classId);
                  return (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150/60 text-[11px] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 font-mono">{c.date} (Ca {c.session === 'morning' ? 'Sáng' : 'Chiều'})</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          c.cancellationType === 'arrived' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {c.cancellationType === 'arrived' ? 'Tới trường mới báo' : 'Báo trước'}
                        </span>
                      </div>
                      <div className="text-slate-500 font-sans">
                        Giáo viên: <strong className="text-slate-700">{teacher ? teacher.name : c.teacherId}</strong> | Lớp: <strong className="text-slate-700">{classObj ? classObj.name : c.classId}</strong>
                      </div>
                      {c.reason && (
                        <div className="mt-1.5 bg-white p-2 rounded border border-slate-100 italic text-slate-600">
                          Ghi chú: {c.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedCancellationSchool(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}
      {quickEditClassData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" /> Chỉnh Sửa / Chuyển Trường Lớp Học
              </h3>
              <button 
                onClick={() => setQuickEditClassData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Tên lớp học:</label>
                <input 
                  type="text"
                  value={quickEditClassData.name}
                  onChange={(e) => setQuickEditClassData({ ...quickEditClassData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Trường học:</label>
                  <button 
                    onClick={() => {
                      setShowCreateSchoolInline(!showCreateSchoolInline);
                      setNewSchoolNameInline('');
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                  >
                    {showCreateSchoolInline ? '← Chọn trường sẵn có' : '+ Tạo trường mới'}
                  </button>
                </div>

                {!showCreateSchoolInline ? (
                  <select 
                    value={quickEditClassData.schoolId}
                    onChange={(e) => setQuickEditClassData({ ...quickEditClassData, schoolId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none transition font-medium"
                  >
                    {(() => {
                      const getSortName = (name: string) => {
                        let n = name.trim().toLowerCase();
                        const prefixes = [
                          /^trường mầm non\s+/,
                          /^trường mn\s+/,
                          /^mầm non\s+/,
                          /^trường\s+/,
                          /^mn\s+/,
                          /^lớp mẫu giáo\s+/,
                          /^mẫu giáo\s+/
                        ];
                        for (const prefix of prefixes) {
                          n = n.replace(prefix, '');
                        }
                        return n;
                      };
                      return [...schools]
                        .sort((a, b) => {
                          const nameA = getSortName(a.name);
                          const nameB = getSortName(b.name);
                          return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base', numeric: true });
                        })
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ));
                    })()}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder="Nhập tên trường mới..."
                      value={newSchoolNameInline}
                      onChange={(e) => setNewSchoolNameInline(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Merge Classes Section */}
            {(() => {
              const mergeCandidateClasses = rawClasses.filter(c => 
                c.schoolId === quickEditClassData.schoolId && 
                !c.isDeleted && 
                !quickEditClassData.classesToUpdate.some(tu => tu.id === c.id)
              );

              if (mergeCandidateClasses.length === 0) return null;

              return (
                <div className="pt-3.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] uppercase tracking-wider font-mono">
                    <GitMerge className="w-3.5 h-3.5" /> Gộp lớp (Xử lý trùng lặp)
                  </div>
                  <p className="text-[10px] text-slate-450 leading-normal">
                    Chọn lớp đúng cùng trường để gộp lớp này vào. Lịch dạy và điểm danh sẽ được chuyển sang lớp được chọn.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={targetMergeClassId}
                      onChange={(e) => setTargetMergeClassId(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition font-medium"
                    >
                      <option value="">-- Chọn lớp để gộp vào --</option>
                      {mergeCandidateClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (!targetMergeClassId) {
                          alert('Vui lòng chọn một lớp để gộp vào.');
                          return;
                        }

                        const sourceClasses = quickEditClassData.classesToUpdate;
                        const sourceClassName = quickEditClassData.name;
                        const targetClassObj = mergeCandidateClasses.find(c => c.id === targetMergeClassId);
                        const targetClassName = targetClassObj ? targetClassObj.name : '';

                        if (!confirm(`Bạn có chắc chắn muốn gộp các lớp có tên '${sourceClassName}' vào lớp '${targetClassName}' không?\nTất cả lịch dạy và dữ liệu điểm danh sẽ được chuyển sang lớp '${targetClassName}'. Lớp '${sourceClassName}' sẽ bị xóa. Hành động này không thể hoàn tác!`)) {
                          return;
                        }

                        try {
                          await Promise.all(sourceClasses.map(sc => 
                            fetch('/api/classes/merge', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                sourceClassId: sc.id,
                                targetClassId: targetMergeClassId
                              })
                            })
                          ));

                          const deletedIds = sourceClasses.map(sc => sc.id);
                          
                          const updatedClasses = rawClasses.map(c => 
                            deletedIds.includes(c.id) ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c
                          );
                          onUpdateClasses(updatedClasses);

                          // Deduplicate schedules client-side
                          const updatedSchedules = [...rawSchedules];
                          const scheduleIdMap: Record<string, string> = {};

                          deletedIds.forEach(sourceClassId => {
                            const sourceSchedules = updatedSchedules.filter(s => s.classId === sourceClassId && !s.isDeleted);
                            sourceSchedules.forEach(sourceSched => {
                              const targetSched = updatedSchedules.find(s => 
                                s.classId === targetMergeClassId && 
                                !s.isDeleted &&
                                s.dayOfWeek === sourceSched.dayOfWeek &&
                                s.session === sourceSched.session &&
                                s.teacherId === sourceSched.teacherId &&
                                s.schoolId === sourceSched.schoolId
                              );

                              if (targetSched) {
                                const idx = updatedSchedules.findIndex(s => s.id === sourceSched.id);
                                if (idx !== -1) {
                                  updatedSchedules[idx] = { 
                                    ...updatedSchedules[idx], 
                                    isDeleted: true, 
                                    deletedAt: new Date().toISOString() 
                                  };
                                }
                                scheduleIdMap[sourceSched.id] = targetSched.id;
                              } else {
                                const idx = updatedSchedules.findIndex(s => s.id === sourceSched.id);
                                if (idx !== -1) {
                                  updatedSchedules[idx] = { 
                                    ...updatedSchedules[idx], 
                                    classId: targetMergeClassId 
                                  };
                                }
                              }
                            });
                          });
                          onUpdateSchedules(updatedSchedules);

                          if (attendance && onUpdateAttendance) {
                            const updatedAttendance = attendance.map(a => {
                              let nextA = { ...a };
                              if (deletedIds.includes(a.classId)) {
                                nextA.classId = targetMergeClassId;
                              }
                              if (a.scheduleId && scheduleIdMap[a.scheduleId]) {
                                nextA.scheduleId = scheduleIdMap[a.scheduleId];
                              }
                              return nextA;
                            });
                            onUpdateAttendance(updatedAttendance);
                          }

                          onAddAuditLog('Gộp lớp học', 'Admin', `Gộp thành công lớp '${sourceClassName}' vào lớp '${targetClassName}'`);
                          alert('Gộp lớp thành công!');
                          setQuickEditClassData(null);
                        } catch (err) {
                          console.error('Failed to merge classes:', err);
                          alert('Có lỗi xảy ra khi gộp lớp.');
                        }
                      }}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
                    >
                      GỘP
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setQuickEditClassData(null)}
                className="px-4 py-2 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold border border-slate-100 transition"
              >
                HỦY
              </button>
              <button 
                onClick={async () => {
                  if (!quickEditClassData.name.trim()) {
                    alert('Tên lớp không được để trống.');
                    return;
                  }

                  try {
                    let targetSchoolId = quickEditClassData.schoolId;

                    if (showCreateSchoolInline) {
                      if (!newSchoolNameInline.trim()) {
                        alert('Vui lòng nhập tên trường mới.');
                        return;
                      }
                      
                      const newSchoolId = `sch_${Date.now()}`;
                      const newSchoolObj = {
                        id: newSchoolId,
                        name: newSchoolNameInline.trim(),
                        address: '',
                        radius: 300,
                        lat: 10.8231,
                        lng: 106.6297,
                        contactPerson: '',
                        phone: '',
                        qrCodeData: '',
                        isDeleted: false,
                        createdAt: new Date().toISOString()
                      };

                      const updatedSchools = [...rawSchools, newSchoolObj];
                      onUpdateSchools(updatedSchools);
                      onAddAuditLog('Tạo trường học', 'Admin', `Tạo trường đối tác mới '${newSchoolNameInline.trim()}' quick-edit`);

                      await fetch('/api/schools', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newSchoolObj)
                      });

                      targetSchoolId = newSchoolId;
                    }

                    const updatedClasses = rawClasses.map(c => {
                      const toUpdate = quickEditClassData.classesToUpdate.find(tu => tu.id === c.id);
                      if (toUpdate) {
                        return {
                          ...c,
                          name: quickEditClassData.name.trim(),
                          schoolId: targetSchoolId
                        };
                      }
                      return c;
                    });

                    onUpdateClasses(updatedClasses);
                    onAddAuditLog('Chỉnh sửa lớp học', 'Admin', `Cập nhật nhanh lớp học '${quickEditClassData.name.trim()}' (chuyển sang trường ${targetSchoolId})`);

                    await Promise.all(quickEditClassData.classesToUpdate.map(c => 
                      fetch(`/api/classes/${c.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: quickEditClassData.name.trim(),
                          schoolId: targetSchoolId
                        })
                      })
                    ));

                    setQuickEditClassData(null);
                  } catch (err) {
                    console.error('Failed to quick-edit classes:', err);
                    alert('Có lỗi xảy ra khi cập nhật lớp học.');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                LƯU LẠI
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
