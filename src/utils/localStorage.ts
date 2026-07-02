import { 
  INITIAL_TEACHERS, 
  INITIAL_SCHOOLS, 
  INITIAL_CLASSES, 
  INITIAL_SCHEDULES, 
  INITIAL_ATTENDANCE, 
  INITIAL_CHANGES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockData';
import { Teacher, School, ClassInfo, Schedule, AttendanceLog, ChangeRequest, SystemNotification, AuditLog } from '../types';

const KEYS = {
  TEACHERS: 'etms_teachers_v1',
  SCHOOLS: 'etms_schools_v1',
  CLASSES: 'etms_classes_v1',
  SCHEDULES: 'etms_schedules_v1',
  ATTENDANCE: 'etms_attendance_v1',
  CHANGES: 'etms_changes_v1',
  NOTIFICATIONS: 'etms_notifications_v1',
  AUDIT_LOGS: 'etms_audit_logs_v1',
  USERS: 'etms_users_v1',
  MEETING_ATTENDANCE: 'etms_meeting_attendance_v1',
  SETTINGS: 'etms_settings_v1'
};

export const getStoredData = () => {
  const getItem = <T>(key: string, fallback: T): T => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return fallback;
    }
  };

  const isWiped = localStorage.getItem('etms_is_wiped') === 'true';

  return {
    teachers: isWiped ? [] : getItem<Teacher[]>(KEYS.TEACHERS, INITIAL_TEACHERS),
    schools: isWiped ? [] : getItem<School[]>(KEYS.SCHOOLS, INITIAL_SCHOOLS),
    classes: isWiped ? [] : getItem<ClassInfo[]>(KEYS.CLASSES, INITIAL_CLASSES),
    schedules: isWiped ? [] : getItem<Schedule[]>(KEYS.SCHEDULES, INITIAL_SCHEDULES),
    attendance: isWiped ? [] : getItem<AttendanceLog[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
    changes: isWiped ? [] : getItem<ChangeRequest[]>(KEYS.CHANGES, INITIAL_CHANGES),
    notifications: isWiped ? [] : getItem<SystemNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
    auditLogs: isWiped ? [] : getItem<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
    users: isWiped ? [] : getItem<any[]>(KEYS.USERS, []),
    meetingAttendance: isWiped ? [] : getItem<any[]>(KEYS.MEETING_ATTENDANCE, []),
    settings: isWiped ? { id: 'global', allowTeacherScheduleEdit: false } : getItem<any>(KEYS.SETTINGS, { id: 'global', allowTeacherScheduleEdit: false })
  };
};

export const saveStoredData = (data: {
  teachers?: Teacher[];
  schools?: School[];
  classes?: ClassInfo[];
  schedules?: Schedule[];
  attendance?: AttendanceLog[];
  changes?: ChangeRequest[];
  notifications?: SystemNotification[];
  auditLogs?: AuditLog[];
  users?: any[];
  meetingAttendance?: any[];
  settings?: any;
}) => {
  try {
    const hasData = (data.teachers && data.teachers.length > 0) || 
                    (data.schools && data.schools.length > 0) ||
                    (data.classes && data.classes.length > 0);
    if (hasData) {
      localStorage.removeItem('etms_is_wiped');
    }

    if (data.teachers) localStorage.setItem(KEYS.TEACHERS, JSON.stringify(data.teachers));
    if (data.schools) localStorage.setItem(KEYS.SCHOOLS, JSON.stringify(data.schools));
    if (data.classes) localStorage.setItem(KEYS.CLASSES, JSON.stringify(data.classes));
    if (data.schedules) localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(data.schedules));
    if (data.attendance) localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(data.attendance));
    if (data.changes) localStorage.setItem(KEYS.CHANGES, JSON.stringify(data.changes));
    if (data.notifications) localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
    if (data.auditLogs) localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs));
    if (data.users) localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));
    if (data.meetingAttendance) localStorage.setItem(KEYS.MEETING_ATTENDANCE, JSON.stringify(data.meetingAttendance));
    if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
  } catch (e) {
    console.error('Error saving data to localStorage', e);
  }
};

export const resetStoredToDefault = () => {
  try {
    localStorage.removeItem(KEYS.TEACHERS);
    localStorage.removeItem(KEYS.SCHOOLS);
    localStorage.removeItem(KEYS.CLASSES);
    localStorage.removeItem(KEYS.SCHEDULES);
    localStorage.removeItem(KEYS.ATTENDANCE);
    localStorage.removeItem(KEYS.CHANGES);
    localStorage.removeItem(KEYS.NOTIFICATIONS);
    localStorage.removeItem(KEYS.AUDIT_LOGS);
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.MEETING_ATTENDANCE);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem('etms_is_wiped');
    return getStoredData();
  } catch (e) {
    console.error('Error resetting data in localStorage', e);
    return {
      teachers: INITIAL_TEACHERS,
      schools: INITIAL_SCHOOLS,
      classes: INITIAL_CLASSES,
      schedules: INITIAL_SCHEDULES,
      attendance: INITIAL_ATTENDANCE,
      changes: INITIAL_CHANGES,
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: INITIAL_AUDIT_LOGS,
      users: [],
      meetingAttendance: [],
      settings: { id: 'global', allowTeacherScheduleEdit: false }
    };
  }
};

// Calculate distance in meters using Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return Math.round(d);
};
