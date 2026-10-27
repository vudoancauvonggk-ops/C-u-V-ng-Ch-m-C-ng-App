import React, { useState, useEffect, Component } from 'react';
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
import TeacherDashboard from './components/TeacherDashboard';

// Auto-retry lazy load on dynamic import failure (e.g. when app is updated with new chunk hashes)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  React.lazy(async () => {
    const isRetry = window.sessionStorage.getItem('chunk_retry_attempt');
    try {
      const component = await componentImport();
      window.sessionStorage.removeItem('chunk_retry_attempt');
      return component;
    } catch (error: any) {
      if (!isRetry) {
        window.sessionStorage.setItem('chunk_retry_attempt', '1');
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          } catch {}
        }
        const url = new URL(window.location.href);
        url.searchParams.set('v', Date.now().toString());
        window.location.href = url.toString();
        return { default: () => null };
      }
      throw error;
    }
  });

// Lazy load heavy admin dashboard to keep mobile/teacher bundle extremely lightweight (~100KB instead of 2.2MB)
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'));
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

// ==========================================
// [NÂNG CẤP MỤC 7]: QUẢN LÝ HÀNG ĐỢI CHẤM CÔNG NGOẠI TUYẾN (OFFLINE ATTENDANCE SYNC)
// ==========================================
function saveAttendanceToOfflineQueue(payload: { upsert: any[]; remove: string[] }) {
  try {
    const raw = localStorage.getItem('cauvong_offline_attendance_queue');
    const existing = raw ? JSON.parse(raw) : { upsert: [], remove: [] };
    const upsertMap = new Map();
    (existing.upsert || []).forEach((item: any) => upsertMap.set(item.id, item));
    (payload.upsert || []).forEach((item: any) => upsertMap.set(item.id, item));
    const mergedUpsert = Array.from(upsertMap.values());
    const mergedRemove = Array.from(new Set([...(existing.remove || []), ...(payload.remove || [])]));

    localStorage.setItem('cauvong_offline_attendance_queue', JSON.stringify({ upsert: mergedUpsert, remove: mergedRemove }));
    window.dispatchEvent(new CustomEvent('cauvong_offline_status_change', { detail: { count: mergedUpsert.length } }));
    console.log('📶 [OFFLINE SYNC] Đã lưu ca chấm công vào bộ nhớ đệm ngoại tuyến. Tổng chờ:', mergedUpsert.length);
  } catch (e) {
    console.error('Lỗi lưu offline queue:', e);
  }
}

async function flushOfflineAttendanceQueue() {
  try {
    const raw = localStorage.getItem('cauvong_offline_attendance_queue');
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!queue || (!queue.upsert?.length && !queue.remove?.length)) return;

    console.log('🌐 [OFFLINE SYNC] Đang gửi', queue.upsert.length, 'ca chấm công ngoại tuyến lên máy chủ Cầu Vồng...');
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queue)
    });
    if (res.ok) {
      localStorage.removeItem('cauvong_offline_attendance_queue');
      window.dispatchEvent(new CustomEvent('cauvong_offline_status_change', { detail: { count: 0, synced: true } }));
      console.log('✅ [OFFLINE SYNC] Đồng bộ thành công toàn bộ ca chấm công ngoại tuyến!');
    }
  } catch (err) {
    console.warn('Đồng bộ ngoại tuyến chưa thành công, sẽ thử lại khi có sóng ổn định:', err);
  }
}

let syncQueue = Promise.resolve();

// ============================================================
// ERROR BOUNDARY - Bẫy bắt mọi lỗi React, tránh màn hình trắng
// ============================================================
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }
export class ErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  props: { children: React.ReactNode };
  state: ErrorBoundaryState = { hasError: false, error: null };
  constructor(props: any) {
    super(props);
    this.props = props;
  }
  static getDerivedStateFromError(error: Error) {
    // Tự động reload nếu là lỗi cập nhật phiên bản dynamic module
    if (error?.message && (error.message.includes('dynamically imported module') || error.message.includes('Loading chunk') || error.message.includes('Failed to fetch'))) {
      const autoReloadDone = sessionStorage.getItem('auto_reload_chunk_error');
      if (!autoReloadDone) {
        sessionStorage.setItem('auto_reload_chunk_error', '1');
        if ('caches' in window) {
          caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).catch(() => {});
        }
        const url = new URL(window.location.href);
        url.searchParams.set('reload_v', Date.now().toString());
        window.location.href = url.toString();
      }
    }
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  handleReset = async () => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      } catch {}
    }
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      } catch {}
    }
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.href = url.toString();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', padding: '20px', fontFamily: 'sans-serif' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '100%', border: '2px solid #fca5a5', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#b91c1c', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>Ứng dụng gặp sự cố</h2>
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>Đã xảy ra lỗi không mong muốn hoặc phiên bản ứng dụng vừa được cập nhật. Vui lòng bấm nút bên dưới để khởi động lại ứng dụng.</p>
            <details open style={{ marginBottom: '20px', background: '#fef2f2', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#991b1b' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Chi tiết lỗi kỹ thuật</summary>
              <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error?.message}{'\n'}{this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={this.handleReset}
              style={{ width: '100%', padding: '14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
            >
              🔄 Tải lại & Cập nhật ứng dụng mới nhất
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Global State initialized directly from localStorage cache for INSTANT 0ms startup on mobile (Stale-While-Revalidate)
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
      quickAnnouncement?: { id: string; title: string; message: string; timestamp: string } | null;
      schoolCancellations: any[];
  }>(() => {
    const stored = getStoredData();
    return {
      teachers: stored.teachers || [],
      schools: stored.schools || [],
      classes: stored.classes || [],
      schedules: stored.schedules || [],
      attendance: stored.attendance || [],
      changes: stored.changes || [],
      notifications: stored.notifications || [],
      auditLogs: stored.auditLogs || [],
      users: stored.users || [],
      meetingAttendance: stored.meetingAttendance || [],
      settings: stored.settings || { id: 'global', allowTeacherScheduleEdit: false },
      quickAnnouncement: null,
      schoolCancellations: (stored as any).schoolCancellations || []
    };
  });
  
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

  // Show splash loading screen on initial app launch
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const handleLoginSuccess = (user: AppUser) => {
    let parsed: any = [];
    try {
      parsed = typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : user.permissions;
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    } catch {
      parsed = [];
    }
    if (!Array.isArray(parsed)) {
      parsed = [];
    }
    const normalizedUser = { ...user, permissions: parsed };
    setCurrentUser(normalizedUser);
    localStorage.setItem('etms_current_user', JSON.stringify(normalizedUser));
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
        const trimmedUser = usernameInput.trim();
        const trimmedPass = passwordInput.trim();
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: trimmedUser, password: trimmedPass })
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

  // Auto-request push notification permission on login
  useEffect(() => {
    if (currentUser && 'Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission().catch(console.error);
      }, 5000);
    }
  }, [currentUser]);

  // Auto-subscribe to Web Push for all logged-in users (Admin, Staff, or Teachers)
  useEffect(() => {
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const autoRegisterPush = async () => {
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && currentUser) {
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
          
          const targetId = currentUser.teacherId || currentUser.id;
          
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: targetId,
              subscription
            })
          });
        } catch (e) {
          console.warn('Auto-registering push subscription failed in App:', e);
        }
      }
    };
    autoRegisterPush();
  }, [currentUser]);

  // Startup useEffect: Fetch PostgreSQL state on initialization & poll for updates to keep frontend in perfect sync with the DB
  useEffect(() => {
    let currentServerVersion: string | null = null;
    let lastKnownTimestamp = 0;

    const fetchLatestState = async (): Promise<boolean> => {
      try {
        const response = await fetch('/api/state', { 
          cache: 'no-store',
          headers: { 'x-app-version': '2' }
        });
        if (response.ok) {
          const dbState = await response.json();
          if (dbState && Array.isArray(dbState.teachers)) {
            if (dbState.users && Array.isArray(dbState.users)) {
              dbState.users = dbState.users.map((u: any) => {
                let parsed: any = [];
                try {
                  parsed = typeof u.permissions === 'string' ? JSON.parse(u.permissions || '[]') : u.permissions;
                  if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                  }
                } catch (e) {
                  console.error('Failed to parse permissions for user', u.id, e);
                  parsed = [];
                }
                if (!Array.isArray(parsed)) {
                  parsed = [];
                }
                return { ...u, permissions: parsed };
              });

              try {
                const cachedUserStr = localStorage.getItem('etms_current_user');
                if (cachedUserStr) {
                  const cachedUser = JSON.parse(cachedUserStr);
                  const freshCurrentUser = dbState.users.find((u: any) => u.id === cachedUser.id);
                  if (freshCurrentUser) {
                    const hasChanged = JSON.stringify(freshCurrentUser) !== JSON.stringify(cachedUser);
                    if (hasChanged) {
                      setCurrentUser(freshCurrentUser);
                      localStorage.setItem('etms_current_user', JSON.stringify(freshCurrentUser));
                      
                      // If roles or permissions change, we might want to also re-check admin access
                      const checkAdminAccess = (user: AppUser | null) => {
                        if (!user) return false;
                        if (user.role !== 'member') return true;
                        const rawPerms = typeof user.permissions === 'string' 
                          ? (() => { try { return JSON.parse(user.permissions || '[]'); } catch { return []; } })() 
                          : (user.permissions || []);
                        const permsArray = Array.isArray(rawPerms) ? rawPerms : [];
                        return permsArray.length > 0;
                      };
                      setViewMode(checkAdminAccess(freshCurrentUser) ? 'admin' : 'teacher');
                    }
                  }
                }
              } catch (e) {
                console.error('Error syncing user profile in polling loop:', e);
              }
            }
            
            if (dbState && dbState.quickAnnouncement) {
              const qa = dbState.quickAnnouncement;
              
              let isTargeted = true;
              if (qa.targetUserId) {
                let myUserId = '';
                let myTeacherId = '';
                try {
                  const cachedUserStr = localStorage.getItem('etms_current_user');
                  if (cachedUserStr) {
                    const cached = JSON.parse(cachedUserStr);
                    myUserId = cached.id || '';
                    myTeacherId = cached.teacherId || '';
                  }
                } catch {}
                isTargeted = (qa.targetUserId === myUserId) || (qa.targetUserId === myTeacherId);
              }

              if (isTargeted) {
                const lastNotifiedQaId = localStorage.getItem('last_notified_qa_id');
                const readQaId = localStorage.getItem('read_qa_id');
                
                if (lastNotifiedQaId !== qa.id && readQaId !== qa.id) {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                      new Notification(qa.title, {
                        body: qa.message,
                        icon: '/logo_cauvong.jpg'
                      });
                      localStorage.setItem('last_notified_qa_id', qa.id);
                    } catch (e) {
                      console.warn('Failed to trigger native notification:', e);
                    }
                  }
                }
              }
            }
            
            setState(dbState);
            saveStoredData(dbState);
            return true;
          }
        }
      } catch (err) {
        console.error('Failed to fetch state from API', err);
      }
      return false;
    };

    const pollForChanges = async () => {
      // Tạm ngưng poll khi tab đang ẩn/màn hình tắt để tiết kiệm pin và băng thông
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
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

           if (timestamp !== lastKnownTimestamp || state.teachers.length === 0) {
              const success = await fetchLatestState();
              if (success) {
                lastKnownTimestamp = timestamp;
              }
           }
        }
      } catch (err) {
        // ignore
      }
    };

    const initialLoad = async () => {
       const startTime = Date.now();
       try {
         // Fetch latest state immediately in background
         const ok = await fetchLatestState();
         if (!ok) {
           // Retry after a short delay if first attempt failed
           setTimeout(fetchLatestState, 1500);
         }
       } catch (err) {
         console.warn('Background state sync error:', err);
       } finally {
         const elapsed = Date.now() - startTime;
         const minSplashDuration = 1200;
         if (elapsed < minSplashDuration) {
           setTimeout(() => {
             setIsInitialLoad(false);
           }, minSplashDuration - elapsed);
         } else {
           setIsInitialLoad(false);
         }
       }
    };
    
    initialLoad();

    // Đồng bộ tức thì ngay khi người dùng chuyển lại tab ứng dụng
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        pollForChanges();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Chu kỳ kiểm tra định kỳ 10 giây (tiết kiệm 50% tài nguyên mạng so với 5s)
    const intervalId = setInterval(pollForChanges, 10000);
    
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
       document.removeEventListener('visibilitychange', handleVisibilityChange);
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

        // KIỂM TRA MẠNG: NẾU NGOẠI TUYẾN (MẤT SÓNG 4G/WIFI) -> LƯU HÀNG ĐỢI OFFLINE
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          saveAttendanceToOfflineQueue({ upsert, remove: deletedIds });
          return;
        }

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
        console.error('Error syncing attendance to PostgreSQL, retrying in 3s:', err);
        // Tự động retry lại sau 3s nếu nghẽn mạng
        setTimeout(async () => {
          try {
            await fetch('/api/attendance/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ upsert: updatedAttendance, remove: [] })
            });
          } catch (retryErr) {
            console.error('Retry sync attendance failed:', retryErr);
          }
        }, 3000);
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
        const deletedIds = prevIds.filter(id => !nextIds.includes(id)).filter(id => {
          const item = prevStateArray.find(x => x.id === id);
          return currentUser?.role === 'admin' || (item && item.teacherId === currentUser?.teacherId);
        });
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

  const handleUpdateSchoolCancellations = (updated: any[]) => {
    setState(prev => {
      const nextState = { ...prev, schoolCancellations: updated };
      saveStoredData(nextState);
      return nextState;
    });

    fetch('/api/school-cancellations/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upsert: updated })
    }).catch(e => console.error('Failed to sync school cancellations to backend:', e));
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

    // Show native device notification if permissions granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const isTargetedToMe = !targetTeacherId || targetTeacherId === currentUser?.teacherId;
      if (isTargetedToMe) {
        try {
          new Notification(title, {
            body: message,
            icon: '/logo_cauvong.jpg'
          });
        } catch (e) {
          console.warn('Failed to trigger native notification:', e);
        }
      }
    }

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
      <div className="min-h-screen bg-gradient-to-br from-[#fefcf9] via-white to-[#f0f4ff] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Rainbow top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 cv-rainbow-bar"></div>
        
        {/* Soft decorative blurs */}
        <div className="absolute top-20 -left-32 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 -right-32 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-6 animate-slide-up">
          {/* Logo with gold ring */}
          <div className="cv-logo-ring">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-white shadow-lg">
              <img 
                src="/logo_cauvong.jpg" 
                alt="Cầu Vồng Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Welcome text */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f] tracking-tight leading-tight font-display">
              Chào Mừng Bạn Đến Với
            </h2>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a5f] via-[#2563eb] to-[#1e3a5f] font-display">
              Cầu Vồng ETMS
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Trung Tâm Nghệ Thuật Aerobic Cầu Vồng
            </p>
          </div>

          {/* Progress bar - rainbow gradient */}
          <div className="w-52 h-1.5 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute top-0 bottom-0 left-0 cv-rainbow-bar w-1/2 rounded-full animate-progress-loading"></div>
          </div>
          <p className="text-xs text-[#1e3a5f]/60 font-semibold tracking-wide">
            Đang khởi động hệ thống...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fefcf9] via-white to-[#f0f4ff] flex flex-col items-center justify-center p-4 lg:p-8 font-sans select-none relative overflow-hidden" id="login_root">
        {/* Rainbow top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 cv-rainbow-bar z-20"></div>

        {/* Decorative floating orbs */}
        <div className="absolute top-16 left-8 w-48 h-48 bg-blue-100/40 rounded-full blur-3xl pointer-events-none animate-float"></div>
        <div className="absolute bottom-16 right-8 w-56 h-56 bg-amber-100/40 rounded-full blur-3xl pointer-events-none animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-rose-100/30 rounded-full blur-3xl pointer-events-none animate-float" style={{animationDelay: '4s'}}></div>

        <div className="max-w-md w-full relative z-10 space-y-6 animate-slide-up">
          {/* Logo & Brand */}
          <div className="text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="cv-logo-ring">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white shadow-lg">
                  <img 
                    src="/logo_cauvong.jpg" 
                    alt="Cầu Vồng Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#1e3a5f] tracking-tight font-display">Hệ Thống Quản Lý Cầu Vồng</h2>
              <p className="text-sm text-slate-500 mt-1.5 font-medium">Trung Tâm Nghệ Thuật Aerobic Cầu Vồng</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-7 border border-slate-200/80 shadow-xl shadow-slate-200/50 space-y-5">
            <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-widest text-center border-b border-slate-100 pb-3 font-display">ĐĂNG NHẬP HỆ THỐNG</h3>

            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs py-2.5 px-3.5 rounded-xl font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLoginSubmit(e, 'legacy')} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tài khoản (Mã GV hoặc Số ĐT)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-800 focus:outline-hidden focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 placeholder-slate-400 transition font-medium"
                    placeholder="Nhập Mã GV (GV_..., GV001) hoặc Số điện thoại..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Mật khẩu (Password)</label>
                  <span className="text-[10px] text-slate-400 font-mono">Mặc định: 123456789</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-11 text-sm text-slate-800 focus:outline-hidden focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 placeholder-slate-400 transition font-medium"
                    placeholder="Nhập mật khẩu (Mặc định: 123456789)..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1e3a5f] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a5d9f] hover:from-[#2a4d7a] hover:to-[#3b82f6] disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#1e3a5f]/20 cursor-pointer mt-2 font-display tracking-wide"
              >
                {isLoggingIn ? 'Đang xác thực bảo mật...' : 'ĐĂNG NHẬP HỆ THỐNG'}
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-widest">HOẶC</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleLoginSubmit(undefined, 'google')}
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2.5 border border-slate-200 hover:border-slate-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập bằng Google'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-medium">© 2026 Trung Tâm Nghệ Thuật Aerobic Cầu Vồng • Hệ thống phân quyền 3 cấp độc lập</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-hidden text-neutral-900" id="main_root">
      
      {/* RAINBOW TOP STRIPE — Signature brand element */}
      <div className="h-1 cv-rainbow-bar shrink-0 btn-no-print"></div>

      {/* GLOBAL BRAND STICKY BAR HEADER */}
      <nav className="bg-white text-slate-800 border-b border-slate-200 py-3 px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 z-50 shrink-0 select-none btn-no-print shadow-sm">
        
        {/* Logo and meta details */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full relative overflow-hidden flex items-center justify-center bg-white border-2 border-[#d4a843]/40 shadow-md shrink-0 select-none p-0.5">
            <img src="/logo_cauvong.jpg" alt="Logo Cầu Vồng" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#1e3a5f] font-display flex items-center gap-2 leading-none">
              Cầu Vồng ETMS
              <span className="text-[9px] bg-emerald-50 text-emerald-600 font-mono px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">v3.1.5</span>
              <button 
                onClick={async () => {
                  try {
                    localStorage.removeItem('etms_is_wiped');
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const k of keys) await caches.delete(k);
                    }
                  } catch (e) {}
                  const url = new URL(window.location.href);
                  url.searchParams.set('v', new Date().getTime().toString());
                  window.location.href = url.toString();
                }}
                className="text-[9px] bg-rose-50 text-rose-500 font-mono px-1.5 py-0.5 rounded-full font-bold hover:bg-rose-100 cursor-pointer border border-rose-200 transition"
                title="Bấm để làm mới toàn bộ dữ liệu mới nhất"
              >
                LÀM MỚI BẢN CẬP NHẬT
              </button>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1">Hệ thống quản lý giáo viên, lịch dạy, tính lương tự động & Chống gian lận AI GPS</p>
          </div>
        </div>

        {/* View Mode Switching Tabs and User Account Status */}
        <div className="flex items-center flex-wrap gap-3 select-none">
          
          {checkAdminAccess(currentUser) && (
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none ${
                  viewMode === 'admin' 
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a5d9f] text-white shadow-sm' 
                    : 'text-slate-500 hover:text-[#1e3a5f] hover:bg-white'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Web Admin</span>
              </button>

              <button
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer select-none ${
                  viewMode === 'teacher' 
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a5d9f] text-white shadow-sm' 
                    : 'text-slate-500 hover:text-[#1e3a5f] hover:bg-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile Giáo Viên</span>
              </button>
            </div>
          )}

          {/* User Sign-In Info & Logout badge */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-200 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white flex items-center justify-center font-bold text-xs tracking-wide shadow-sm">
              {currentUser?.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>{currentUser?.username}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {currentUser?.role === 'admin' ? '🔥 Admin' : currentUser?.role === 'manager' ? '⚡ Quản lý' : currentUser?.role === 'hr' ? '👥 Nhân sự' : currentUser?.role === 'training' ? '🎓 Đào tạo' : currentUser?.role === 'accounting' ? '💰 Kế toán' : '🍀 Giáo viên'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer ml-1 border border-transparent hover:border-rose-200"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

        </div>
      </nav>

      {/* RENDER BODY CONTAINER BY VIEW MODE */}
      <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
        
        {/* VIEWMODE 2: ONLY ADMIN WORKSPACE */}
        {viewMode === 'admin' && (
          <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            <React.Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#fefcf9] via-white to-[#f0f4ff] text-[#1e3a5f] min-h-[500px] select-none relative overflow-hidden">
                <div className="cv-logo-ring mb-5">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-lg">
                    <img 
                      src="/logo_cauvong.jpg" 
                      alt="Cầu Vồng Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-[#1e3a5f] tracking-tight font-display">
                  Đang tải không gian làm việc Quản Trị...
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 animate-pulse">
                  Đang tối ưu nạp các module quản lý
                </p>
                <div className="w-36 h-1 bg-slate-100 rounded-full overflow-hidden relative mt-4">
                  <div className="absolute top-0 bottom-0 left-0 cv-rainbow-bar w-1/2 rounded-full animate-progress-loading"></div>
                </div>
              </div>
            }>
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
                schoolCancellations={state.schoolCancellations}
                onUpdateSchoolCancellations={handleUpdateSchoolCancellations}
              />
            </React.Suspense>
          </div>
        )}

        {/* VIEWMODE 3: ONLY TEACHER DEVICE SIMULATOR */}
        {viewMode === 'teacher' && (
          <div className="w-full h-full flex flex-col overflow-y-auto bg-slate-50">
            {state.teachers.length === 0 ? (
              <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Đang đồng bộ hồ sơ giáo viên...</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Hệ thống đang tải dữ liệu thời khóa biểu mới nhất từ máy chủ.</p>
              </div>
            ) : (
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
                quickAnnouncement={state.quickAnnouncement}
                schoolCancellations={state.schoolCancellations}
                onUpdateSchoolCancellations={handleUpdateSchoolCancellations}
              />
            )}
          </div>
        )}

      </div>

    </div>
  );
}
