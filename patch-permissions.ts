import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// 1. Remove role-based bypass from hasPermission
content = content.replace(
  `  const hasPermission = (perm: string) => {
    if (currentUser?.role === 'admin') return true;
    if (!currentUser) return false;
    
    // Role-based presets
    if (currentUser.role === 'manager') {
      return true; // Managers get all permissions by default except what's explicitly hidden
    }
    if (currentUser.role === 'hr') {
      if (['can_view_all_teachers', 'can_approve_attendance', 'can_approve_changes'].includes(perm)) return true;
    }
    if (currentUser.role === 'training') {
      if (['can_edit_schedule', 'can_view_schools', 'can_view_all_teachers'].includes(perm)) return true;
    }
    if (currentUser.role === 'accounting') {
      if (['can_view_reports', 'can_approve_attendance'].includes(perm)) return true;
    }

    // Defensive parsing in case the user model stored permissions as a string in cache
    const perms = typeof currentUser.permissions === 'string' 
      ? (() => { try { return JSON.parse(currentUser.permissions || '[]'); } catch { return []; } })() 
      : (currentUser.permissions || []);
      
    return perms.includes(perm);
  };`,
  `  const hasPermission = (perm: string) => {
    if (currentUser?.role === 'admin') return true;
    if (!currentUser) return false;
    
    // Defensive parsing in case the user model stored permissions as a string in cache
    const perms = typeof currentUser.permissions === 'string' 
      ? (() => { try { return JSON.parse(currentUser.permissions || '[]'); } catch { return []; } })() 
      : (currentUser.permissions || []);
      
    return perms.includes(perm);
  };`
);

// 2. Fix canViewAllTeachers and canViewAllSchedules
content = content.replace(
  `  const canViewAllTeachers = currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager' || currentUser?.role === 'training' || userPermsArray.includes('can_view_all_teachers');
  const canViewAllSchedules = currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager' || currentUser?.role === 'training' || userPermsArray.includes('can_view_all_schedules') || userPermsArray.includes('can_edit_schedule');`,
  `  const canViewAllTeachers = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_teachers');
  const canViewAllSchedules = currentUser?.role === 'admin' || userPermsArray.includes('can_view_all_schedules') || userPermsArray.includes('can_edit_schedule');`
);

// 3. Fix tabs
content = content.replace(
  `          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'hr' || currentUser?.role === 'training' || hasPermission('can_view_all_schedules') || hasPermission('can_edit_schedule')) ? { id: 'schedules', label: 'Lịch Giảng Dạy', icon: Calendar } : null,
          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'hr' || currentUser?.role === 'training' || hasPermission('can_view_all_teachers')) ? { id: 'teachers', label: 'Hồ Sơ & Thù Lao', icon: Users } : null,
          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'training' || hasPermission('can_view_schools')) ? { id: 'schools', label: 'Trường & Lớp Học', icon: Building } : null,
          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'hr' || currentUser?.role === 'accounting' || hasPermission('can_approve_attendance')) ? { id: 'attendance', label: 'Duyệt Chấm Công', icon: Clock, count: flaggedCount } : null,
          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'hr' || currentUser?.role === 'training' || hasPermission('can_manage_meeting_attendance')) ? { id: 'meeting_attendance', label: 'Họp & Chuyên Môn', icon: CheckCircle2 } : null,
          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'hr' || hasPermission('can_approve_changes')) ? { id: 'changes', label: 'Thay Ca & Phép', icon: ArrowLeftRight, count: pendingChanges } : null,
          (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'accounting' || hasPermission('can_view_reports')) ? { id: 'reports', label: 'Bảng Lương & Chi Phí', icon: DollarSign } : null,`,
  `          (currentUser?.role === 'admin' || hasPermission('can_view_all_schedules') || hasPermission('can_edit_schedule')) ? { id: 'schedules', label: 'Lịch Giảng Dạy', icon: Calendar } : null,
          (currentUser?.role === 'admin' || hasPermission('can_view_all_teachers')) ? { id: 'teachers', label: 'Hồ Sơ & Thù Lao', icon: Users } : null,
          (currentUser?.role === 'admin' || hasPermission('can_edit_school_address')) ? { id: 'schools', label: 'Trường & Lớp Học', icon: Building } : null,
          (currentUser?.role === 'admin' || hasPermission('can_approve_attendance')) ? { id: 'attendance', label: 'Duyệt Chấm Công', icon: Clock, count: flaggedCount } : null,
          (currentUser?.role === 'admin' || hasPermission('can_manage_meeting_attendance')) ? { id: 'meeting_attendance', label: 'Họp & Chuyên Môn', icon: CheckCircle2 } : null,
          (currentUser?.role === 'admin' || hasPermission('can_approve_changes')) ? { id: 'changes', label: 'Thay Ca & Phép', icon: ArrowLeftRight, count: pendingChanges } : null,
          (currentUser?.role === 'admin' || hasPermission('can_view_reports')) ? { id: 'reports', label: 'Bảng Lương & Chi Phí', icon: DollarSign } : null,`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patched AdminDashboard.tsx for precise permissions!');
