import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        upsert: [{
          id: 'ATT_TEST_123',
          date: '2026-06-29',
          scheduleId: 'SCHED_1',
          teacherId: 'GV_MRDANH',
          schoolId: 'SCH_1',
          classId: 'CLASS_1',
          session: 'morning',
          checkInTime: '08:00',
          periods: 1,
          lat: 10,
          lng: 106,
          distanceMeter: 0,
          selfieImage: '',
          verificationMethod: 'GPS',
          isVerified: true,
          isFlagged: false,
          flagReason: '',
          confirmedByAdmin: true
        }], 
        remove: [] 
      })
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}
run();
