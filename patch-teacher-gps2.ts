import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// Replace the GPS Check-in update button to use fresh GPS
const newGPSUpdateBtn = `{true && (
                                <button
                                    type="button"
                                    onClick={() => {
                                      if (navigator.geolocation) {
                                         alert('Đang làm mới toạ độ GPS...');
                                         navigator.geolocation.getCurrentPosition(pos => {
                                            if (window.confirm(\`Xác nhận lưu vị trí GPS cho trường \${targetSchool.name}?\\n\\nVĩ độ: \${pos.coords.latitude}\\nKinh độ: \${pos.coords.longitude}\`)) {
                                               const updatedSchools = schools.map(s => {
                                                 if (s.id === targetSchool.id) return { ...s, lat: pos.coords.latitude, lng: pos.coords.longitude };
                                                 return s;
                                               });
                                               // If school is missing from the global list, add it
                                               if (!schools.find(s => s.id === targetSchool.id)) {
                                                 updatedSchools.push({...targetSchool, lat: pos.coords.latitude, lng: pos.coords.longitude});
                                               }
                                               onUpdateSchools(updatedSchools);
                                               alert('Đã cập nhật toạ độ trường thành công!');
                                            }
                                         }, err => alert('Lỗi lấy định vị: ' + err.message), { enableHighAccuracy: true });
                                      } else {
                                        alert('Trình duyệt không hỗ trợ GPS');
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[9px] hover:bg-emerald-700 transition self-end whitespace-nowrap"
                                >
                                    LƯU ĐỊA ĐIỂM TRƯỜNG TRÊN GPS
                                </button>
                              )}`;

content = content.replace(/\{settings\?\.allowTeacherUpdateSchoolLocation && \([\s\S]*?<\/button>\s*\n\s*\)\}/, newGPSUpdateBtn);


// And we also need to add state for `editingSchool` and `editSchoolData` in TeacherDashboard
const stateInjection = `
  const [editingSchool, setEditingSchool] = useState<string | null | undefined>(undefined);
  const [editSchoolData, setEditSchoolData] = useState<any>({});
  
  const handleSaveSchoolEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchool) {
      const updated = schools.map(s => s.id === editingSchool ? { ...s, ...editSchoolData } : s);
      onUpdateSchools(updated);
    } else {
      const newSch = { ...editSchoolData, id: 'SCH_' + Date.now() };
      onUpdateSchools([...schools, newSch]);
    }
    setEditingSchool(undefined);
    alert('Đã lưu thông tin trường!');
  };
`;
if (!content.includes('const [editingSchool, setEditingSchool]')) {
  content = content.replace('const [showMakeupForm, setShowMakeupForm] = useState(false);', 'const [showMakeupForm, setShowMakeupForm] = useState(false);' + stateInjection);
}

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Fixed GPS and Edit');
