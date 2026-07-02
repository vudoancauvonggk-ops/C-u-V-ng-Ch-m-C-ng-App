import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const targetStr = `            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-72 shrink-0">
                <SearchBar 
                  value={searchTerm} 
                  onChange={setSearchTerm} 
                  placeholder="Tìm kiếm tài khoản..."
                  onClear={() => setSearchTerm('')}
                />
              </div>
              
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
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/15 shrink-0 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>TẠO TÀI KHOẢN MỚI</span>
              </button>
            </div>`;

const replacementStr = `            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-72 shrink-0">
                <SearchBar 
                  value={searchTerm} 
                  onChange={setSearchTerm} 
                  placeholder="Tìm kiếm tài khoản..."
                  onClear={() => setSearchTerm('')}
                />
              </div>
              
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => {
                    const newUsers = [...users];
                    let addedCount = 0;
                    
                    rawTeachers.filter((t: any) => !t.isDeleted).forEach((teacher: any) => {
                      // Check if a user already exists for this teacher
                      const exists = newUsers.some(u => u.teacherId === teacher.id || u.username === teacher.id);
                      if (!exists) {
                        newUsers.push({
                          id: \`usr_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
                          username: teacher.id,
                          password: teacher.id.toLowerCase() + '123',
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
                      onAddAuditLog('Đồng bộ hệ thống', currentUser?.username || 'Admin', \`Đã tự động tạo \${addedCount} tài khoản cho giáo viên\`);
                      alert(\`Đã đồng bộ và tạo tự động \${addedCount} tài khoản cho giáo viên. (Mật khẩu mặc định: Tên đăng nhập + '123', ví dụ gv_123)\`);
                    } else {
                      alert('Tất cả giáo viên đã có tài khoản trên hệ thống!');
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
            </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/AdminDashboard.tsx', content);
  console.log('Successfully patched accounts section.');
} else {
  console.log('Could not find target string.');
}
