import React, { useState, useEffect } from 'react';
import { 
  getStoredData, 
  saveStoredData, 
  resetStoredToDefault 
} from './utils/localStorage';
import { auth, googleAuthProvider } from './lib/firebase';
import { signInWithPopup } from 'firebase/auth'; 
import { 
  Teacher, 
  School,
  ClassInfo, 
  Schedule, 
  AttendanceLog, 
  ChangeRequest, 
  SystemNotification, 
  AuditLog,
  AppUser,
  AppSettings,
  MeetingAttendance
} from './types';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { 
  Laptop, 
  Smartphone, 
  LayoutGrid, 
  BookOpen, 
  RefreshCw, 
  CheckCircle,
  Clock,
  Sparkles,
  Trash2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  User,
  Shield,
  UserCheck,
  ShieldCheck,
  Settings
} from 'lucide-react';

let syncQueue = Promise.resolve();

export default function App() {
  // Global State initialized directly to clean empty arrays on startup to prevent auto-fetch freezes
  const [state, setState] = useState<{
      teachers: Teacher[];
      schools: School[];
      classes: ClassInfo[];
      schedules: Schedule[];
      attendance: AttendanceLog[];
      changes: ChangeRequest[];
      notifications: SystemNotification[];
      auditLogs: AuditLog[];
      users: AppUser[];
      meetingAttendance: MeetingAttendance[];
      settings: AppSettings;
  }>(() => ({
    teachers: [],
    schools: [],
    classes: [],
    schedules: [],
    attendance: [],
    changes: [],
    notifications: [],
    auditLogs: [],
    users: [],
    meetingAttendance: [],
    settings: { id: 'global', allowTeacherScheduleEdit: false }
  }));
  
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem('etms_current_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const checkAdminAccess = (user: AppUser | null) => {
    if (!user) return false;
    if (user.role !== 'member') return true;
    const rawPerms = typeof user.permissions === 'string' 
      ? (() => { try { return JSON.parse(user.permissions || '[]'); } catch { return []; } })() 
      : (user.permissions || []);
    const permsArray = Array.isArray(rawPerms) ? rawPerms : [];
    return permsArray.length > 0;
  };

  // App view mode layout selector
  const [viewMode, setViewMode] = useState<'admin' | 'teacher'>(() => {
    try {
      const cached = localStorage.getItem('etms_current_user');
      const user = cached ? JSON.parse(cached) : null;
      return checkAdminAccess(user) ? 'admin' : 'teacher';
    } catch {
      return 'teacher';
    }
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('etms_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('etms_current_user');
    setViewMode('teacher');
  };

  // Login form states & methods
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e?: React.FormEvent, method: 'legacy' | 'google' = 'google') => {
    if (e) e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      let res;
      let token = '';
      
      if (method === 'google') {
        const result = await signInWithPopup(auth, googleAuthProvider);
        token = await result.user.getIdToken();
        
        res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
      }
      
      const data = await res.json();
      if (res.ok && data.success) {
        // Also save token in currentUser or somewhere if needed for API calls?
        // Wait, other API calls need the Bearer token now!
        const userToSave = method === 'google' ? { ...data.user, token } : data.user;
        handleLoginSuccess(userToSave);
        
        // Auto select view mode depending on role
        if (checkAdminAccess(userToSave)) {
          setViewMode('admin');
        } else {
          setViewMode('teacher');
        }
      } else {
        setLoginError(data.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError('Đăng nhập thất bại.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Startup useEffect: Fetch PostgreSQL state on initialization & poll for updates to keep frontend in perfect sync with the DB
  useEffect(() => {
    let currentServerVersion: string | null = null;
    let lastKnownTimestamp = 0;

    const fetchLatestState = async () => {
      try {
        const response = await fetch('/api/state', { 
          cache: 'no-store',
          headers: { 'x-app-version': '2' }
        });
        if (response.ok) {
          const dbState = await response.json();
          if (dbState && dbState.teachers) {
            if (dbState.users && Array.isArray(dbState.users)) {
              dbState.users = dbState.users.map((u: any) => {
                let parsed = [];
                try {
                  parsed = typeof u.permissions === 'string' ? JSON.parse(u.permissions || '[]') : u.permissions;
                  if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                  }
                } catch (e) {
                  console.error('Failed to parse permissions for user', u.id, e);
                  parsed = [];
                }
                return { ...u, permissions: parsed };
              });
            }
            
            setState(dbState);
            saveStoredData(dbState);
          }
        }
      } catch (err) {
        console.error('Failed to fetch state from API', err);
      }
    };

    const pollForChanges = async () => {
      try {
        const res = await fetch('/api/state/timestamp', { cache: 'no-store' });
        if (res.ok) {
           const { timestamp, version } = await res.json();
           if (!currentServerVersion) {
              currentServerVersion = version;
           } else if (currentServerVersion !== version) {
              console.log('New version detected, reloading...');
              window.location.reload();
              return;
           }

           if (timestamp !== lastKnownTimestamp) {
              lastKnownTimestamp = timestamp;
              await fetchLatestState();
           }
        }
      } catch (err) {
        // ignore
      }
    };

    const checkDatabaseHealth = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          return data.status === 'ok';
        }
        return false;
      } catch (e) {
        return false;
      }
    };

    const initialLoad = async () => {
       setIsInitialLoad(true);
       try {
         const hasData = await checkDatabaseHealth();
         if (hasData) {
            await pollForChanges();
         } else {
            setState(getStoredData());
         }
       } catch (err) {
         setState(getStoredData());
       } finally {
         setIsInitialLoad(false);
       }
    };
    
    initialLoad();

    // Set up real-time polling every 5 seconds using lightweight timestamp endpoint
    const intervalId = setInterval(pollForChanges, 5000);
    
    // Also listen for cross-tab local storage changes (if users have multiple tabs in same browser)
    const handleStorageChange = () => {
       const cached = getStoredData();
       setState(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(cached)) {
             return cached;
          }
          return prev;
       });
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
       clearInterval(intervalId);
       window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Trigger loading or syncing of state
  const syncState = (newState: typeof state) => {
    setState(newState);
    saveStoredData(newState);
  };

  // Helper State Setters (Surgically synced with PostgreSQL backend in real-time)
  const handleUpdateTeachers = async (updatedTeachers: any[]) => {
    const prevIds = state.teachers.map(item => item.id);
    const prevStateArray = state.teachers;
    setState(prev => {
      const nextState = { ...prev, teachers: updatedTeachers };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedTeachers.map(t => t.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        const upsert = updatedTeachers.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/teachers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/teachers/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing teachers to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateSchools = async (updatedSchools: any[]) => {
    const prevIds = state.schools.map(item => item.id);
    const prevStateArray = state.schools;
    setState(prev => {
      const nextState = { ...prev, schools: updatedSchools };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedSchools.map(s => s.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        const upsert = updatedSchools.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/schools/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/schools/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing schools to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateClasses = async (updatedClasses: any[]) => {
    const prevIds = state.classes.map(item => item.id);
    const prevStateArray = state.classes;
    setState(prev => {
      const nextState = { ...prev, classes: updatedClasses };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedClasses.map(c => c.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        const upsert = updatedClasses.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/classes/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/classes/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing classes to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateSchedules = async (updatedSchedules: any[]) => {
    const prevIds = state.schedules.map(item => item.id);
    const prevStateArray = state.schedules;
    setState(prev => {
      const nextState = { ...prev, schedules: updatedSchedules };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedSchedules.map(s => s.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        const upsert = updatedSchedules.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/schedules/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/schedules/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing schedules to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateAttendance = async (updatedAttendance: any[]) => {
    const prevIds = state.attendance.map(item => item.id);
    const prevStateArray = state.attendance;
    setState(prev => {
      const nextState = { ...prev, attendance: updatedAttendance };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedAttendance.map(a => a.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        const upsert = updatedAttendance.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/attendance/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing attendance to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateChanges = async (updatedChanges: any[]) => {
    const prevIds = state.changes.map(item => item.id);
    const prevStateArray = state.changes;
    setState(prev => {
      const nextState = { ...prev, changes: updatedChanges };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedChanges.map(c => c.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        const upsert = updatedChanges.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        // Skip API call if nothing changed
        if (upsert.length === 0 && deletedIds.length === 0) return;

        const res = await fetch('/api/changes/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert, remove: deletedIds })
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/changes/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing change requests to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateUsers = async (updatedUsers: any[]) => {
    const prevIds = state.users.map(item => item.id);
    const prevStateArray = state.users;
    setState(prev => {
      const nextState = { ...prev, users: updatedUsers };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedUsers.map(u => u.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        
        const upsertRaw = updatedUsers.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        if (upsertRaw.length === 0 && deletedIds.length === 0) return;

        const formattedUsers = upsertRaw.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role,
          teacherId: u.teacherId || null,
          permissions: JSON.stringify(u.permissions || []),
          isDeleted: u.isDeleted || false
        }));

        const res = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsert: formattedUsers, remove: deletedIds })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('API Error /api/users/bulk:', errText);
          throw new Error(errText);
        }
      } catch (err) {
        console.error('Error syncing users to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleUpdateMeetingAttendance = async (updatedMA: any[]) => {
    const prevIds = state.meetingAttendance.map(item => item.id);
    const prevStateArray = state.meetingAttendance;
    setState(prev => {
      const nextState = { ...prev, meetingAttendance: updatedMA };
      saveStoredData(nextState);
      return nextState;
    });

    syncQueue = syncQueue.then(async () => {
      try {
        const nextIds = updatedMA.map(u => u.id);
        const deletedIds = prevIds.filter(id => !nextIds.includes(id));
        
        const upsertRaw = updatedMA.filter(item => {
           const old = prevStateArray.find(o => o.id === item.id);
           if (!old) return true;
           return JSON.stringify(old) !== JSON.stringify(item);
        });
        
        for (const id of deletedIds) {
          await fetch(`/api/meeting-attendance/${id}`, { method: 'DELETE' });
        }
        for (const item of upsertRaw) {
          await fetch(`/api/meeting-attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
        }
      } catch (err) {
        console.error('Error syncing meeting attendance to PostgreSQL:', err);
      }
    }).catch(err => console.error(err));
  };

  const handleBulkSync = async (
    updatedTeachers: Teacher[],
    updatedSchools: School[],
    updatedClasses: ClassInfo[],
    updatedSchedules: Schedule[],
    mode: 'overwrite' | 'update'
  ) => {
    let finalTeachers = mode === 'overwrite' ? [] : [...state.teachers];
    let finalSchools = mode === 'overwrite' ? [] : [...state.schools];
    let finalClasses = mode === 'overwrite' ? [] : [...state.classes];
    let finalSchedules = mode === 'overwrite' ? [] : [...state.schedules];

    // Cache deleted names/IDs so we never mistakenly restore soft-deleted items (ONLY if updating)
    const deletedSchoolNames = new Set(mode === 'update' ? state.schools.filter(s => s.isDeleted).map(s => s.name.toLowerCase()) : []);
    const deletedClassNames = new Set(mode === 'update' ? state.classes.filter(c => c.isDeleted).map(c => c.name.toLowerCase()) : []);
    const deletedTeacherNames = new Set(mode === 'update' ? state.teachers.filter(t => t.isDeleted).map(t => t.name.toLowerCase()) : []);
    
    const normalizeBoolean = (val: any) => {
       if (typeof val === 'boolean') return val;
       if (typeof val === 'string') return val.toLowerCase() === 'true';
       return !!val;
    };

    // Remap the updated elements to set isDeleted: true if their names match previously deleted items (ONLY if updating)
    const processSchools = updatedSchools.map(sch => 
      (mode === 'update' && deletedSchoolNames.has(sch.name.toLowerCase())) ? { ...sch, id: sch.id || `SCH_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, isDeleted: true } : { ...sch, id: sch.id || `SCH_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, isDeleted: normalizeBoolean(sch.isDeleted) }
    );
    const processClasses = updatedClasses.map(cls => 
      (mode === 'update' && deletedClassNames.has(cls.name.toLowerCase())) ? { ...cls, id: cls.id || `CLS_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, isDeleted: true } : { ...cls, id: cls.id || `CLS_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, isDeleted: normalizeBoolean(cls.isDeleted) }
    );
    const processTeachers = updatedTeachers.map(tc => 
      (mode === 'update' && deletedTeacherNames.has(tc.name.toLowerCase())) ? { ...tc, id: tc.id || `GV_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, isDeleted: true } : { ...tc, id: tc.id || `GV_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, isDeleted: normalizeBoolean(tc.isDeleted) }
    );

    // Merge teachers FIRST so we have the correct IDs for schedule mapping
    const teacherIdMap = new Map<string, string>();
    processTeachers.forEach(imported => {
      const importSlug = imported.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
      const idx = finalTeachers.findIndex(t => {
        const currentSlug = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        return t.id === imported.id || (t.email && t.email === imported.email) || currentSlug === importSlug;
      });

      if (idx !== -1) {
        teacherIdMap.set(imported.id, finalTeachers[idx].id);
        finalTeachers[idx] = { ...finalTeachers[idx], ...imported, id: finalTeachers[idx].id, isDeleted: imported.isDeleted };
      } else {
        finalTeachers.push(imported);
      }
    });

    // Now map schedules
    const remappedUpdatedSchedules = updatedSchedules.map(sc => {
       const numericDayOfWeek = Number(sc.dayOfWeek) || 2;
       const numericPeriods = Number(sc.periods) || 1;
       const mappedSc = { ...sc, id: sc.id || `SKD_DYN_${Math.random().toString(16).slice(2,10).toUpperCase()}`, dayOfWeek: numericDayOfWeek, periods: numericPeriods, isDeleted: normalizeBoolean(sc.isDeleted) };
       
       if (!mappedSc.teacherId) return mappedSc;
       
       if (!finalTeachers.some(t => t.id === mappedSc.teacherId)) {
          const potentialSlug = String(mappedSc.teacherId).replace('GV_', '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
          const target = finalTeachers.find(t => {
            const tSlug = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            return tSlug === potentialSlug || String(mappedSc.teacherId).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '').includes(tSlug);
          });
          if (target) {
            return { ...mappedSc, teacherId: target.id };
          }
       }
       return mappedSc;
    });

    const schoolIdMap = new Map<string, string>();
    const classIdMap = new Map<string, string>();

    if (mode === 'overwrite') {
      finalSchools = processSchools;
      finalClasses = processClasses;
      finalSchedules = remappedUpdatedSchedules;
    } else {
      // Merge schools
      processSchools.forEach(sch => {
        const idx = finalSchools.findIndex(s => s.id === sch.id || s.name.toLowerCase() === sch.name.toLowerCase());
        if (idx !== -1) {
          schoolIdMap.set(sch.id, finalSchools[idx].id);
          finalSchools[idx] = { ...finalSchools[idx], ...sch, id: finalSchools[idx].id, isDeleted: sch.isDeleted };
        } else {
          finalSchools.push(sch);
        }
      });

      // Merge classes
      processClasses.forEach(cls => {
        const mappedSchoolId = schoolIdMap.get(cls.schoolId) || cls.schoolId;
        const mappedClass = { ...cls, schoolId: mappedSchoolId };
        
        const idx = finalClasses.findIndex(c => c.id === mappedClass.id || (c.schoolId === mappedClass.schoolId && c.name.toLowerCase() === mappedClass.name.toLowerCase()));
        if (idx !== -1) {
          classIdMap.set(mappedClass.id, finalClasses[idx].id);
          finalClasses[idx] = { ...finalClasses[idx], ...mappedClass, id: finalClasses[idx].id, isDeleted: mappedClass.isDeleted };
        } else {
          finalClasses.push(mappedClass);
        }
      });
      
      // Update schedule references to point to the preserved existing IDs
      const mappedUpdatedSchedules = remappedUpdatedSchedules.map(sc => {
         let resolvedSchoolId = schoolIdMap.get(sc.schoolId) || sc.schoolId;
         let resolvedClassId = classIdMap.get(sc.classId) || sc.classId;
         let resolvedTeacherId = teacherIdMap.get(sc.teacherId) || sc.teacherId;
         
         // Fallback: If the user typed a name instead of an ID in the Google Sheet for School
         if (resolvedSchoolId && !finalSchools.some(s => s.id === resolvedSchoolId)) {
           const foundSch = finalSchools.find(s => s.name.toLowerCase() === resolvedSchoolId.toLowerCase());
           if (foundSch) resolvedSchoolId = foundSch.id;
         }
         
         // Fallback: If the user typed a name instead of an ID in the Google Sheet for Class
         if (resolvedClassId && !finalClasses.some(c => c.id === resolvedClassId)) {
           // Try to match by class name, preferably within the resolved school
           const foundCls = finalClasses.find(c => c.name.toLowerCase() === resolvedClassId.toLowerCase() && c.schoolId === resolvedSchoolId) 
                         || finalClasses.find(c => c.name.toLowerCase() === resolvedClassId.toLowerCase());
           if (foundCls) resolvedClassId = foundCls.id;
         }

         // Fallback: If the user typed a name instead of an ID in the Google Sheet for Teacher
         if (resolvedTeacherId && !finalTeachers.some(t => t.id === resolvedTeacherId)) {
            const potentialSlug = String(resolvedTeacherId).replace('GV_', '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            const target = finalTeachers.find(t => {
              const tSlug = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
              return tSlug === potentialSlug || String(resolvedTeacherId).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '').includes(tSlug);
            });
            if (target) {
              resolvedTeacherId = target.id;
            }
         }

         // Ensure fallback for completely missing school/class/teacher to avoid being dropped
         if (!resolvedSchoolId && finalSchools.length > 0) {
            resolvedSchoolId = finalSchools.find(s => !s.isDeleted)?.id || finalSchools[0].id;
         }
         if (!resolvedClassId && finalClasses.length > 0) {
            resolvedClassId = finalClasses.find(c => !c.isDeleted)?.id || finalClasses[0].id;
         }
         if (!resolvedTeacherId && finalTeachers.length > 0) {
            resolvedTeacherId = finalTeachers.find(t => !t.isDeleted)?.id || finalTeachers[0].id;
         }

         return {
            ...sc,
            schoolId: resolvedSchoolId,
            classId: resolvedClassId,
            teacherId: resolvedTeacherId
         };
      });
      
      // Merge schedules carefully to avoid wiping all schedules for a teacher.
      // We only replace schedules that overlap on the same teacher + day + session.
      const updatedKeys = new Set(mappedUpdatedSchedules.map(s => `${s.teacherId}-${s.dayOfWeek}-${s.session}`));
      const keptSchedules = finalSchedules.filter(s => {
         const key = `${s.teacherId}-${s.dayOfWeek}-${s.session}`;
         return !updatedKeys.has(key);
      });
      finalSchedules = [...keptSchedules, ...mappedUpdatedSchedules];
    }
    
    // Drop schedules that belong to soft-deleted schools / classes / teachers, or are missing required relations
    const finalDeletedSchools = new Set(finalSchools.filter(s => s.isDeleted).map(s => s.id));
    const finalDeletedClasses = new Set(finalClasses.filter(c => c.isDeleted).map(c => c.id));
    const finalDeletedTeachers = new Set(finalTeachers.filter(t => t.isDeleted).map(t => t.id));
    
    // Create sets of all valid ids to ensure strict foreign key consistency
    const validSchools = new Set(finalSchools.map(s => s.id));
    const validClasses = new Set(finalClasses.map(c => c.id));
    const validTeachers = new Set(finalTeachers.map(t => t.id));

    finalSchedules = finalSchedules.filter(s => 
      s.schoolId && s.classId && s.teacherId &&
      validSchools.has(s.schoolId) &&
      validClasses.has(s.classId) &&
      validTeachers.has(s.teacherId) &&
      !finalDeletedSchools.has(s.schoolId) && 
      !finalDeletedClasses.has(s.classId) && 
      !finalDeletedTeachers.has(s.teacherId)
    );

    const nextState = {
      ...state,
      teachers: finalTeachers,
      schools: finalSchools,
      classes: finalClasses,
      schedules: finalSchedules
    };

    // Update frontend state instantly & localStorage
    setState(nextState);
    saveStoredData(nextState);

    // Sync database asynchronously using atomic db-restore
    try {
      await fetch('/api/db-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachers: finalTeachers,
          schools: finalSchools,
          classes: finalClasses,
          schedules: finalSchedules,
          attendance: state.attendance,
          changes: state.changes,
          notifications: state.notifications,
          auditLogs: state.auditLogs,
          users: state.users,
          settings: state.settings
        })
      });
    } catch (err) {
      console.error('Error with PostgreSQL bulk sync:', err);
    }
  };

  // Log new operational action
  const handleAddAuditLog = async (action: string, actor: string, details: string) => {
    let newLog: AuditLog;
    setState(prev => {
      newLog = {
        id: `LOG${String(prev.auditLogs.length + 1).padStart(3, '0')}`,
        action,
        actor,
        timestamp: new Date().toISOString(),
        details
      };
      const nextState = { ...prev, auditLogs: [newLog, ...prev.auditLogs] };
      saveStoredData(nextState);
      return nextState;
    });

    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog!)
      });
    } catch (err) {
      console.error('Error logging audit action to PostgreSQL:', err);
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setState(prev => {
      const nextState = { ...prev, settings: newSettings };
      saveStoredData(nextState);
      return nextState;
    });
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (err) {
      console.error('Error syncing settings:', err);
    }
  };

  // Send Push warnings / Alerts
  const handleAddNotification = async (
    title: string, 
    message: string, 
    type: 'info' | 'warning' | 'alert' | 'success', 
    targetTeacherId?: string
  ) => {
    let newNot: SystemNotification;
    setState(prev => {
      newNot = {
        id: `NOT${String(prev.notifications.length + 1).padStart(3, '0')}`,
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        isRead: false,
        targetTeacherId
      };
      const nextState = { ...prev, notifications: [newNot, ...prev.notifications] };
      saveStoredData(nextState);
      return nextState;
    });

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNot!)
      });
    } catch (err) {
      console.error('Error logging system notification to PostgreSQL:', err);
    }
  };



  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="inline-flex p-3 bg-blue-600 rounded-2xl relative overflow-hidden font-display font-extrabold text-white text-xl shadow-lg shadow-blue-500/25 tracking-wider select-none animate-bounce mb-6">
          ETMS
        </div>
        <p className="text-slate-400 font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
          Đang tải dữ liệu hệ thống...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 lg:p-8 font-sans select-none relative overflow-hidden" id="login_root">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 bg-blue-600 rounded-2xl relative overflow-hidden font-display font-extrabold text-white text-xl shadow-lg shadow-blue-500/25 tracking-wider select-none animate-bounce">
              ETMS
              <div className="absolute inset-0 bg-white/10 skew-x-12 translate-x-5"></div>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Hệ Thống Quản Lý Giáo Viên</h2>
              <p className="text-xs text-slate-400 mt-1">Đăng nhập để vào hệ thống quản lý lịch giảng dạy & chấm công</p>
            </div>
          </div>

          <div className="bg-slate-900/85 backdrop-blur-md rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest text-center border-b border-slate-800 pb-3">ĐĂNG NHẬP HỆ THỐNG</h3>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2.5 px-3.5 rounded-xl font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLoginSubmit(e, 'legacy')} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tài khoản (Username)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600 transition"
                    placeholder="Nhập tên tài khoản..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Mật khẩu (Password)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-11 pr-11 text-xs text-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600 transition"
                    placeholder="Nhập mật khẩu..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/15 cursor-pointer mt-2"
              >
                {isLoggingIn ? 'Đang xác thực bảo mật...' : 'ĐĂNG NHẬP BẰNG TÀI KHOẢN'}
              </button>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-medium uppercase tracking-widest">HOẶC</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleLoginSubmit(undefined, 'google')}
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2 border border-slate-700"
              >
                {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập bằng Google'}
              </button>
            </div>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-600 font-medium">Hệ thống phân quyền 3 cấp độc lập • Education Group 2026</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none overflow-hidden text-neutral-900" id="main_root">
      
      {/* GLOBAL BRAND STICKY BAR HEADER */}
      <nav className="bg-slate-950 text-white border-b border-white/5 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-50 shrink-0 select-none btn-no-print">
        
        {/* Logo and meta details */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl relative overflow-hidden flex items-center justify-center font-display font-extrabold text-white text-sm shadow-md shadow-blue-500/25 tracking-wider shrink-0 select-none">
            ETMS
            <div className="absolute inset-0 bg-white/10 skew-x-12 translate-x-5"></div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white font-display flex items-center gap-1.5 leading-none">
              Education Teacher Management System
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.2 rounded font-bold uppercase">v3.1.0</span>
              <button 
                onClick={() => {
                  const reloadWithCacheBust = () => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', new Date().getTime().toString());
                    window.location.href = url.toString();
                  };
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) {
                        registration.unregister();
                      }
                      reloadWithCacheBust();
                    });
                  } else {
                    reloadWithCacheBust();
                  }
                }}
                className="text-[9px] bg-red-500/20 text-red-400 font-mono px-1.5 py-0.2 rounded font-bold hover:bg-red-500/40"
              >
                LÀM MỚI BẢN CẬP NHẬT
              </button>
            </h1>
            <p className="text-[10px] text-slate-400/80 mt-1">Hệ thống quản lý giáo viên, lịch dạy, tính lương tự động & Chống gian lận AI GPS</p>
          </div>
        </div>

        {/* View Mode Switching Tabs and User Account Status */}
        <div className="flex items-center flex-wrap gap-4 select-none">
          
          {checkAdminAccess(currentUser) && (
            <div className="bg-slate-900 p-1 rounded-xl border border-white/5 flex gap-1">
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none ${
                  viewMode === 'admin' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Chỉ Hiện Web Admin</span>
              </button>

              <button
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none ${
                  viewMode === 'teacher' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Chỉ Hiện Mobile Giáo Viên</span>
              </button>
            </div>
          )}



          {/* User Sign-In Info & Logout badge */}
          <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-1.5 rounded-2xl border border-white/5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm tracking-wide">
              {currentUser?.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <span>{currentUser?.username}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {currentUser?.role === 'admin' ? '🔥 Admin' : currentUser?.role === 'manager' ? '⚡ Quản lý' : currentUser?.role === 'hr' ? '👥 Nhân sự' : currentUser?.role === 'training' ? '🎓 Đào tạo' : currentUser?.role === 'accounting' ? '💰 Kế toán' : '🍀 Giáo viên'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer ml-1"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

        </div>
      </nav>

      {/* RENDER BODY CONTAINER BY VIEW MODE */}
      <div className="flex-1 flex overflow-hidden bg-slate-900 relative">
        
        {/* VIEWMODE 2: ONLY ADMIN WORKSPACE */}
        {viewMode === 'admin' && (
          <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            <AdminDashboard 
              teachers={state.teachers}
              schools={state.schools}
              classes={state.classes}
              schedules={state.schedules}
              attendance={state.attendance}
              changes={state.changes}
              auditLogs={state.auditLogs}
              notifications={state.notifications}
              users={state.users}
              meetingAttendance={state.meetingAttendance}
              settings={state.settings}
              currentUser={currentUser}
              onSyncState={syncState}
              onUpdateTeachers={handleUpdateTeachers}
              onUpdateSchools={handleUpdateSchools}
              onUpdateClasses={handleUpdateClasses}
              onUpdateSchedules={handleUpdateSchedules}
              onUpdateAttendance={handleUpdateAttendance}
              onUpdateChanges={handleUpdateChanges}
              onUpdateUsers={handleUpdateUsers}
              onUpdateMeetingAttendance={handleUpdateMeetingAttendance}
              onUpdateSettings={handleUpdateSettings}
              onAddAuditLog={handleAddAuditLog}
              onAddNotification={handleAddNotification}
              onBulkSync={handleBulkSync}
            />
          </div>
        )}

        {/* VIEWMODE 3: ONLY TEACHER DEVICE SIMULATOR */}
        {viewMode === 'teacher' && (
          <div className="w-full h-full flex flex-col overflow-y-auto bg-slate-50">
            <TeacherDashboard 
              teachers={state.teachers}
              schools={state.schools}
              classes={state.classes}
              schedules={state.schedules}
              attendance={state.attendance}
              changes={state.changes}
              settings={state.settings}
              currentUser={currentUser}
              onUpdateSchools={handleUpdateSchools}
              onUpdateClasses={handleUpdateClasses}
              onUpdateSchedules={handleUpdateSchedules}
              onUpdateAttendance={handleUpdateAttendance}
              onUpdateChanges={handleUpdateChanges}
              onAddAuditLog={handleAddAuditLog}
              onAddNotification={handleAddNotification}
            />
          </div>
        )}

      </div>

    </div>
  );
}
