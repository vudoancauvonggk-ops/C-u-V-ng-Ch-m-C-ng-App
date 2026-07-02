import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

// Modify the SortableReportRow props
content = content.replace(
  `const SortableReportRow = ({ teacher, totalPeriods, formatVND, baseLessonsSalary, allowance, hasApprovedLeave, attendanceBonus, potentialBonus, socialInsurance, advanceSalary, deduction, finalWage }: any) => {`,
  `const SortableReportRow = ({ teacher, totalPeriods, formatVND, baseLessonsSalary, allowance, hasApprovedLeave, attendanceBonus, potentialBonus, artPerformanceBonus, socialInsurance, advanceSalary, deduction, finalWage }: any) => {`
);

// Modify the attendance bonus display cell
content = content.replace(
  `      <td className="p-3 text-right font-mono text-emerald-600">
        {attendanceBonus > 0 ? \`+\${formatVND(attendanceBonus)}\` : <span className="text-red-500 text-[10px] block line-through">{\`+\${formatVND(potentialBonus)}\`}</span>}
        {attendanceBonus === 0 && <span className="block text-[9px] text-red-500 italic">Mất chuyên cần do xin phép</span>}
      </td>`,
  `      <td className="p-3 text-right font-mono text-emerald-600">
        <div className="flex flex-col items-end">
          {hasApprovedLeave ? (
            <span className="text-red-500 text-[10px] line-through">{\`+\${formatVND(potentialBonus)}\`}</span>
          ) : (
            <span>{\`+\${formatVND(potentialBonus)}\`}</span>
          )}
          {artPerformanceBonus > 0 && (
            <span className="text-[10px] text-blue-600 font-bold">{\`+ \${formatVND(artPerformanceBonus)} (Văn nghệ)\`}</span>
          )}
          {hasApprovedLeave && <span className="text-[9px] text-red-500 italic">Mất C.Cần do xin phép</span>}
        </div>
      </td>`
);

// We need to make sure artPerformanceBonus is passed to SortableReportRow
content = content.replace(
  `                              potentialBonus={potentialBonus}`,
  `                              potentialBonus={potentialBonus}
                              artPerformanceBonus={artPerformanceBonus}`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Patched SortableReportRow in AdminDashboard.tsx!');
