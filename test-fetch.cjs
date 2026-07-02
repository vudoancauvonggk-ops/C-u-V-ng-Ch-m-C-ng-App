const fs = require('fs');

(async () => {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = 'https://script.google.com/macros/s/AKfycbz_9eJ1B4M1C9N8bX0F-PzB5P39w-81n-8B3c_LhG-X8Z0X8y8/exec?action=getSchedules&sheetId=1yBngJ6-9V2vM-vO2v9Qf16u2k8B1fXQ4qgX4mNnU2E4';
    const response = await fetch(url);
    const data = await response.json();
    fs.writeFileSync('sheet_data.json', JSON.stringify({ schedules: data.schedules.slice(0, 5) }, null, 2));
    console.log('Saved 5 schedules');
  } catch(e) { console.error(e) }
})();
