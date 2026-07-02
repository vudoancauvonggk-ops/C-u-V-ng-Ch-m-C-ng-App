import fs from 'fs';
import path from 'process';

async function run() {
  const payload = {
    teachers: [{ id: "GV_1", name: "Teacher 1", isDeleted: false, status: "active", hourlyRate: 50000, monthlyAllowance: 0, bonus: 0, deduction: 0, socialInsurance: 0, advanceSalary: 0, bonusPeriodsJSON: "{}" }],
    schools: [{ id: "SCH_1", name: "School 1", isDeleted: false, lat: 0, lng: 0 }],
    classes: [{ id: "CLS_1", name: "Class 1", schoolId: "SCH_1", isDeleted: false, studentCount: 0, standardPeriods: 1 }],
    schedules: [{ id: "SKD_1", teacherId: "GV_1", schoolId: "SCH_1", classId: "CLS_1", dayOfWeek: 2, session: "morning", periods: 1, isDeleted: false }]
  };
  
  const res = await fetch('http://localhost:3000/api/sync-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(res.status, await res.text());
}
run();
