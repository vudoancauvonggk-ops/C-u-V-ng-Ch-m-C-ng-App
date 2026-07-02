import { db } from './src/db/index.ts';
import { schedules, attendance } from './src/db/schema.ts';
import fetch from 'node-fetch';

async function run() {
  const scheds = await db.select().from(schedules);
  const s = scheds[0];
  const item = {
        id: 'ATT_TEST_' + Date.now(),
        date: '2026-06-29',
        scheduleId: s.id,
        teacherId: s.teacherId,
        schoolId: s.schoolId,
        schoolName: 'Some Fake School Name',
        classId: s.classId,
        session: s.session,
        checkInTime: '08:00',
        periods: s.periods,
        lat: 10,
        lng: 106,
        distanceMeter: 0,
        selfieImage: '',
        verificationMethod: 'GPS',
        isVerified: true,
        isFlagged: false,
        flagReason: '',
        confirmedByAdmin: true
      };
      
  const res = await fetch('http://localhost:3000/api/attendance/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upsert: [item], remove: [] })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
  process.exit(0);
}
run();
