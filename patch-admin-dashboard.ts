import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// 1. Fix User Saving (Auto un-delete on save + handle recreating soft-deleted user)
content = content.replace(
  `      if (users.some(u => u.username.toLowerCase() === uData.username.toLowerCase())) {
        customAlert('Trùng tài khoản ⚠️', \`Tên đăng nhập "\${uData.username}" đã tồn tại!\`);
        return;
      }`,
  `      const existing = users.find(u => u.username.toLowerCase() === uData.username.toLowerCase());
      if (existing) {
        if (existing.isDeleted) {
          // Restore
          const updated = users.map(u => u.id === existing.id ? { ...uData, id: existing.id, isDeleted: false } : u);
          onUpdateUsers(updated);
          onAddAuditLog('Khôi phục tài khoản', currentUser?.username || 'Admin', \`Đã khôi phục tài khoản bị vô hiệu hoá \${uData.username}\`);
          setEditingUser(null);
          setShowUserModal(false);
          return;
        }
        customAlert('Trùng tài khoản ⚠️', \`Tên đăng nhập "\${uData.username}" đã tồn tại!\`);
        return;
      }`
);

// 2. Fix User Saving always setting isDeleted to false
content = content.replace(
  `isDeleted: typeof editingUser.isDeleted === 'boolean' ? editingUser.isDeleted : false`,
  `isDeleted: false // Always reactive on save`
);

// 3. Fix Teacher Saving
content = content.replace(
  `      if (teachers.some(t => t.id === finalId)) {
        customAlert('Trùng Mã Giáo Viên ⚠️', \`Mã số giáo viên "\${finalId}" đã bị trùng! Vui lòng chọn mã số khác.\`);
        return;
      }`,
  `      const existing = teachers.find(t => t.id === finalId);
      if (existing) {
        if (existing.isDeleted) {
          customAlert('Nằm trong thùng rác ⚠️', \`Mã số "\${finalId}" đang nằm trong Thùng Rác! Vào mục Thùng Rác để Khôi Phục.\`);
        } else {
          customAlert('Trùng Mã Giáo Viên ⚠️', \`Mã số giáo viên "\${finalId}" đã bị trùng! Vui lòng chọn mã số khác.\`);
        }
        return;
      }`
);

// 4. Add UI indicator for soft-deleted users in the list
content = content.replace(
  `{u.username}`,
  `{u.username}
        {u.isDeleted && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-500 uppercase tracking-widest border border-rose-200" title="Tài khoản này đang bị vô hiệu hoá">Vô hiệu hoá</span>}`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patched AdminDashboard.tsx');
