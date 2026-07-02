import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf-8');

// 1. Add artPerformanceCount state
content = content.replace(
  `  const [reqSession, setReqSession] = useState<string>('morning');
  const [reqReason, setReqReason] = useState<string>('');`,
  `  const [reqSession, setReqSession] = useState<string>('morning');
  const [reqReason, setReqReason] = useState<string>('');
  const [artCount, setArtCount] = useState<number>(1);`
);

// 2. Modify handleSubmit to include it in the reason
content = content.replace(
  `    const newRequest: ChangeRequest = {
      id: newReqId,
      teacherId: currentTeacher.id,
      requestType: reqType,
      date: reqDate,
      session: reqSession,
      originalTeacherId: currentTeacher.id,
      targetTeacherId: undefined, // Admin will assign this later
      reason: reqReason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };`,
  `    const finalReason = reqType === 'art_performance' ? \`[Số lượng: \${artCount}] - \${reqReason}\` : reqReason;
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
    };`
);

// 3. Add the input to the form
content = content.replace(
  `                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Lý do chi tiết * (Ghi rõ số lượng và tên trường nếu coi diễn)</label>`,
  `                  {reqType === 'art_performance' && (
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
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Lý do / Tên trường chi tiết *</label>`
);

fs.writeFileSync('src/components/TeacherDashboard.tsx', content);
console.log('Patched TeacherDashboard.tsx with art count!');
