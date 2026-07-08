const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace fetchLatestState and the interval logic
const targetStart = `  // Startup useEffect: Fetch PostgreSQL state on initialization & poll for updates to keep frontend in perfect sync with the DB
  useEffect(() => {
    let currentServerVersion: string | null = null;`;

const targetEnd = `    // Set up real-time polling every 5 seconds (auto-refresh cross-device)
    const intervalId = setInterval(fetchLatestState, 5000);`;

// Wait, I can't easily match multiple lines without being precise. Let's write a targeted replace.

const replacement = `  // Startup useEffect: Fetch PostgreSQL state on initialization & poll for updates to keep frontend in perfect sync with the DB
  useEffect(() => {
    let currentServerVersion: string | null = null;
    let lastKnownTimestamp = 0;

    const fetchLatestState = async () => {
      try {
        const response = await fetch('/api/state', { 
          cache: 'no-store',
          headers: { 'x-app-version': '2' }
        });
        if (response.ok) {
          const dbState = await response.json();
          if (dbState && dbState.teachers) {
            if (dbState.users && Array.isArray(dbState.users)) {
              dbState.users = dbState.users.map((u: any) => {
                let parsed = [];
                try {
                  parsed = typeof u.permissions === 'string' ? JSON.parse(u.permissions || '[]') : u.permissions;
                  if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                  }
                } catch (e) {
                  console.error('Failed to parse permissions for user', u.id, e);
                  parsed = [];
                }
                return { ...u, permissions: parsed };
              });
            }
            
            setState(dbState);
            saveStoredData(dbState);
          }
        }
      } catch (err) {
        console.error('Failed to fetch state from API', err);
      }
    };

    const pollForChanges = async () => {
      try {
        const res = await fetch('/api/state/timestamp', { cache: 'no-store' });
        if (res.ok) {
           const { timestamp, version } = await res.json();
           if (!currentServerVersion) {
              currentServerVersion = version;
           } else if (currentServerVersion !== version) {
              console.log('New version detected, reloading...');
              window.location.reload();
              return;
           }

           if (timestamp !== lastKnownTimestamp) {
              lastKnownTimestamp = timestamp;
              await fetchLatestState();
           }
        }
      } catch (err) {
        // ignore
      }
    };

    const initialLoad = async () => {
       setIsInitialLoad(true);
       try {
         const hasData = await checkDatabaseHealth();
         if (hasData) {
            await pollForChanges();
         } else {
            setState(getStoredData());
         }
       } catch (err) {
         setState(getStoredData());
       } finally {
         setIsInitialLoad(false);
       }
    };
    
    initialLoad();

    // Set up real-time polling every 5 seconds using lightweight timestamp endpoint
    const intervalId = setInterval(pollForChanges, 5000);`;

// I need to use regex or string methods carefully.
