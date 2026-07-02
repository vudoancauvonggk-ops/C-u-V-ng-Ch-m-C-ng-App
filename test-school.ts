import { db } from './src/db/index.ts';
import { schools } from './src/db/schema.ts';

async function test() {
  const sData = {
      id: "SCH_TEST",
      name: 'Test School',
      address: '123 Test St',
      contactPerson: '',
      phone: '',
      lat: 10.774,
      lng: 106.702,
      qrCodeData: 'ETMS_QR_VERIFY_SCH_TEST'
  };
  
  try {
    await db.insert(schools).values(sData).onConflictDoUpdate({
        target: schools.id,
        set: sData
    });
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
test();
