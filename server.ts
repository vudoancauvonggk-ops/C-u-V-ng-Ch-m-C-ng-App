import 'dotenv/config';
import express from 'express';
import webPush from 'web-push';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import { parseSheetToTeachers, parseSpecialScheduleSheet } from './src/utils/googleSheets.ts';
import { db } from './src/db/index.ts';
import { 
  teachers, 
  schools, 
  classes, 
  schedules, 
  attendance, 
  changeRequests, 
  systemNotifications, 
  auditLogs,
  users,
  appSettings,
  meetingAttendance,
  pushSubscriptions,
  schoolCancellations
} from './src/db/schema.ts';
import { eq, not, ne, isNotNull, sql } from 'drizzle-orm';
import { 
  INITIAL_TEACHERS, 
  INITIAL_SCHOOLS, 
  INITIAL_CLASSES, 
  INITIAL_SCHEDULES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS 
} from './src/data/mockData.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '200mb' }));

  let requestsToday = 0;
  let latestQuickAnnouncement: { id: string; title: string; message: string; timestamp: string } | null = null;
  let errorsToday = 0;

  // Configure Web Push VAPID keys
  const publicKey = process.env.VAPID_PUBLIC_KEY || 'BP4ox6NYl1dug9LnF3Y2kjl23EE_ruRp3W03du42IFoIjSJa_x8SsFf8r7jb2ReVgkSWqKKkP9IRc3mGYqK4f5c';
  const privateKey = process.env.VAPID_PRIVATE_KEY || 'KivFJXq6L2QQp2JpTNv06pSWZC7XpIYOD348VTkQXLc';
  webPush.setVapidDetails(
    'mailto:admin@cauvong.edu.vn',
    publicKey,
    privateKey
  );

  const sendPushNotification = async (targetUserId: string | null, payload: { title: string; message: string }) => {
    try {
      console.log(`[Push] Initiating push notification. Target: ${targetUserId || 'ALL'}, Payload:`, payload);
      let subs;
      if (targetUserId) {
        subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, targetUserId));
      } else {
        subs = await db.select().from(pushSubscriptions);
      }
      
      console.log(`[Push] Found ${subs.length} push subscriptions in database.`);
      
      const payloadStr = JSON.stringify(payload);
      
      const promises = subs.map(sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.keysAuth,
            p256dh: sub.keysP256dh
          }
        };
        console.log(`[Push] Sending push to subscriber: ${sub.userId} (endpoint: ${sub.endpoint.substring(0, 45)}...)`);
        return webPush.sendNotification(pushSubscription, payloadStr)
          .then((res) => {
            console.log(`[Push] Successfully sent push to ${sub.userId}, response status:`, res.statusCode);
          })
          .catch(async (err) => {
            console.error(`[Push] Failed to send push to ${sub.userId}, status: ${err.statusCode}, error:`, err.message || err);
            if (err.statusCode === 404 || err.statusCode === 410) {
              console.log(`[Push] Removing expired subscription for ${sub.userId}`);
              await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
          });
      });
      
      await Promise.all(promises);
      console.log(`[Push] Finished sending push notifications.`);
    } catch (e) {
      console.error('[Push] Error in sendPushNotification:', e);
    }
  };

  app.use((req, res, next) => {
    requestsToday++;
    res.on('finish', () => {
      // Only count server errors (5xx) as actual system health errors.
      // Client errors (4xx) like 401 Unauthorized or 404 Not Found (e.g. from internet scanner bots) are excluded.
      if (res.statusCode >= 500) {
        errorsToday++;
      }
    });
    next();
  });

  let lastStateUpdate = Date.now();
  
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          lastStateUpdate = Date.now();
        }
      });
    }
    next();
  });

  app.get('/api/state/timestamp', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ timestamp: lastStateUpdate, version: SERVER_VERSION });
  });

  // Seed database initially
  try {
    const markerFile = path.join(process.cwd(), '.db_seeded');
    const existing = await db.select().from(teachers).limit(1);
    
    if (existing.length === 0 && !fs.existsSync(markerFile)) {
      console.log('PostgreSQL database is empty and no seed marker found. Seeding initial data if available...');
      if (INITIAL_TEACHERS.length > 0) {
        await db.insert(teachers).values(INITIAL_TEACHERS);
      }
      if (INITIAL_SCHOOLS.length > 0) {
        await db.insert(schools).values(INITIAL_SCHOOLS);
      }
      if (INITIAL_CLASSES.length > 0) {
        await db.insert(classes).values(INITIAL_CLASSES);
      }
      if (INITIAL_SCHEDULES.length > 0) {
        await db.insert(schedules).values(INITIAL_SCHEDULES);
      }
      if (INITIAL_NOTIFICATIONS.length > 0) {
        await db.insert(systemNotifications).values(INITIAL_NOTIFICATIONS);
      }
      if (INITIAL_AUDIT_LOGS.length > 0) {
        await db.insert(auditLogs).values(INITIAL_AUDIT_LOGS);
      }
      console.log('Database empty check and seeding done!');
      fs.writeFileSync(markerFile, 'true');
    } else {
      console.log('Seeding skipped (active seed marker exists or database is already populated).');
    }

    // Ensure default accounts exist
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    if (existingAdmin.length === 0) {
      await db.insert(users).values([
        {
          id: 'u_admin',
          username: 'admin',
          password: 'admin',
          role: 'admin',
          permissions: JSON.stringify(['all'])
        },
        {
          id: 'u_quanly',
          username: 'quanly',
          password: 'quanly',
          role: 'manager',
          permissions: JSON.stringify(['can_view_all_teachers', 'can_view_reports', 'can_approve_attendance'])
        },
        {
          id: 'u_member',
          username: 'giao_vien',
          password: 'giao_vien',
          role: 'member',
          permissions: JSON.stringify(['can_edit_schedule', 'can_edit_school_address'])
        }
      ]);
      console.log('Default accounts initialized: admin/admin, quanly/quanly, giao_vien/giao_vien');
    }
  } catch (err) {
    console.error('Error checking or seeding database:', err);
  }

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', async (req, res) => {
    let dbType = 'Local PostgreSQL';
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('supabase')) {
      dbType = 'Supabase (PostgreSQL)';
    } else if (dbUrl.includes('neon')) {
      dbType = 'Neon (PostgreSQL)';
    } else if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
      dbType = 'PostgreSQL (Cloud SQL)';
    }

    let dbSizeMb = 27; // default fallback if query fails
    try {
      const sizeResult = await db.execute(sql`SELECT pg_database_size(current_database()) as size_bytes`);
      if (sizeResult.rows && sizeResult.rows[0]) {
        const bytes = Number(sizeResult.rows[0].size_bytes || sizeResult.rows[0][0]);
        if (!isNaN(bytes)) {
          dbSizeMb = bytes / (1024 * 1024);
        }
      }
    } catch (err) {
      console.warn('Could not query pg_database_size:', err);
    }

    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m`;

    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    const cloudPlatform = isLocal ? 'Local Host (Node.js)' : 'CloudFly (VPS)';
    const environment = isLocal ? 'DEVELOPMENT' : 'PRODUCTION';

    const memUsage = process.memoryUsage();
    const ramUsedMb = Math.round(memUsage.rss / 1024 / 1024);

    res.json({
      status: 'ok',
      database: dbType,
      cloudPlatform,
      environment,
      uptime: uptimeStr,
      dbSizeMb,
      requestsToday,
      errorsToday,
      ramUsedMb,
    });
  });

  // DB Reset and Re-seed
  app.post('/api/db-reset', async (req, res) => {
    try {
      console.log('Resetting database...');
      await db.delete(attendance);
      await db.delete(changeRequests);
      await db.delete(schedules);
      await db.delete(classes);
      await db.delete(schools);
      await db.delete(teachers);
      await db.delete(systemNotifications);
      await db.delete(auditLogs);

      if (INITIAL_TEACHERS.length > 0) {
        await db.insert(teachers).values(INITIAL_TEACHERS);
      }
      if (INITIAL_SCHOOLS.length > 0) {
        await db.insert(schools).values(INITIAL_SCHOOLS);
      }
      if (INITIAL_CLASSES.length > 0) {
        await db.insert(classes).values(INITIAL_CLASSES);
      }
      if (INITIAL_SCHEDULES.length > 0) {
        await db.insert(schedules).values(INITIAL_SCHEDULES);
      }
      if (INITIAL_NOTIFICATIONS.length > 0) {
        await db.insert(systemNotifications).values(INITIAL_NOTIFICATIONS);
      }
      if (INITIAL_AUDIT_LOGS.length > 0) {
        await db.insert(auditLogs).values(INITIAL_AUDIT_LOGS);
      }

      const markerFile = path.join(process.cwd(), '.db_seeded');
      fs.writeFileSync(markerFile, 'true');

      res.json({ status: 'success', message: 'Database reset successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reset database', details: err.message });
    }
  });

  // DB Wipe (Empty out everything without re-seeding)
  app.delete('/api/db-wipe', async (req, res) => {
    try {
      console.log('Wiping database...');
      await db.delete(attendance);
      await db.delete(changeRequests);
      await db.delete(schedules);
      await db.delete(classes);
      await db.delete(schools);
      await db.delete(teachers);
      await db.delete(systemNotifications);
      await db.delete(auditLogs);
      await db.delete(meetingAttendance);
      await db.delete(users);

      // Restore defaults for users
      await db.insert(users).values([
        {
          id: 'u_admin',
          username: 'admin',
          password: 'admin',
          role: 'admin',
          permissions: JSON.stringify(['all'])
        }
      ]);

      const markerFile = path.join(process.cwd(), '.db_seeded');
      fs.writeFileSync(markerFile, 'true');

      res.json({ status: 'success', message: 'Database wiped successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to wipe database', details: err.message });
    }
  });

  app.post('/api/db-restore', async (req, res) => {
    try {
      console.log('Restoring database from uploaded backup...');
      const { 
        teachers: teachList, 
        schools: schList, 
        classes: clsList, 
        schedules: skdList, 
        attendance: attList,
        changes: changeList,
        notifications: notList,
        auditLogs: logList,
        users: userList,
        settings: settingsData
      } = req.body;

      // Wipe everything
      await db.delete(attendance);
      await db.delete(changeRequests);
      await db.delete(schedules);
      await db.delete(classes);
      await db.delete(schools);
      await db.delete(teachers);
      await db.delete(systemNotifications);
      await db.delete(auditLogs);
      await db.delete(meetingAttendance);
      await db.delete(users);

      // Insert teachers
      if (teachList && Array.isArray(teachList)) {
        for (const item of teachList) {
          try {
            await db.insert(teachers).values(item).onConflictDoUpdate({
              target: teachers.id,
              set: item
            });
            // Auto-create user for teacher
            if (item.id) {
              const uId = 'u_' + item.id;
              await db.insert(users).values({
                id: uId,
                username: item.id,
                password: '123456789',
                role: 'member',
                teacherId: item.id,
                permissions: '[]',
                isDeleted: item.isDeleted || false
              }).onConflictDoUpdate({
                target: users.username,
                set: {
                  isDeleted: item.isDeleted || false
                }
              });
            }
          } catch (e: any) {
            console.error('Restore: Failed to insert teacher', item.id, e.message);
          }
        }
      }

      // Insert schools
      if (schList && Array.isArray(schList)) {
        for (const item of schList) {
          try {
            await db.insert(schools).values(item).onConflictDoUpdate({
              target: schools.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert school', item.id, e.message);
          }
        }
      }

      // Insert classes
      if (clsList && Array.isArray(clsList)) {
        for (const item of clsList) {
          try {
            await db.insert(classes).values(item).onConflictDoUpdate({
              target: classes.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert class', item.id, e.message);
          }
        }
      }

      // Insert schedules
      if (skdList && Array.isArray(skdList)) {
        for (const item of skdList) {
          try {
            await db.insert(schedules).values(item).onConflictDoUpdate({
              target: schedules.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert schedule', item.id, e.message);
          }
        }
      }

      // Insert attendance
      if (attList && Array.isArray(attList)) {
        for (const item of attList) {
          try {
            await db.insert(attendance).values(item).onConflictDoUpdate({
              target: attendance.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert attendance', item.id, e.message);
          }
        }
      }

      // Insert changes
      if (changeList && Array.isArray(changeList)) {
        for (const item of changeList) {
          try {
            await db.insert(changeRequests).values(item).onConflictDoUpdate({
              target: changeRequests.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert change request', item.id, e.message);
          }
        }
      }

      // Insert notifications
      if (notList && Array.isArray(notList)) {
        for (const item of notList) {
          try {
            await db.insert(systemNotifications).values(item).onConflictDoUpdate({
              target: systemNotifications.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert notification', item.id, e.message);
          }
        }
      }

      // Insert audit logs
      if (logList && Array.isArray(logList)) {
        for (const item of logList) {
          try {
            await db.insert(auditLogs).values(item).onConflictDoUpdate({
              target: auditLogs.id,
              set: item
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert audit log', item.id, e.message);
          }
        }
      }

      // Insert users
      if (userList && Array.isArray(userList)) {
        for (const item of userList) {
          try {
            await db.insert(users).values(item).onConflictDoUpdate({
              target: users.username,
              set: {
                password: item.password,
                role: item.role,
                teacherId: item.teacherId,
                permissions: item.permissions,
                isDeleted: item.isDeleted
              }
            });
          } catch (e: any) {
            console.error('Restore: Failed to insert user', item.id, e.message);
          }
        }
      }

      // Insert settings
      if (settingsData) {
        try {
          await db.insert(appSettings).values({ id: 'global', ...settingsData }).onConflictDoUpdate({
            target: appSettings.id,
            set: settingsData
          });
        } catch (e: any) {
          console.error('Restore: Failed to update app settings', e.message);
        }
      }

      console.log('Database restore completed successfully!');
      res.json({ status: 'success', message: 'Database restored successfully!' });
    } catch (err: any) {
      console.error('Failed to restore database:', err);
      res.status(500).json({ error: 'Failed to restore database', details: err.message });
    }
  });

  app.post('/api/parse-public-sheet', async (req, res) => {
    try {
      const { spreadsheetId, existingTeachers = [], existingSchools = [] } = req.body;
      if (!spreadsheetId) {
        return res.status(400).json({ error: 'Spreadsheet ID is required' });
      }

      console.log(`Backend fetching and parsing public Google Sheet: ${spreadsheetId}`);
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets export failed: HTTP ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const allTeachers: any[] = [];
      const allSchedules: any[] = [];
      const allSchoolsSet = new Map<string, any>();
      const allClassesSet = new Map<string, any>();
      const allWarnings: string[] = [];
      let previewRows: any[][] | null = null;

      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
        
        if (rows && rows.length > 0) {
          if (!previewRows) {
            previewRows = rows.slice(0, 10);
          }
          
          const { teachers: docTeachers, warnings: tabWarn } = parseSheetToTeachers(rows, existingTeachers);
          const specialResult = parseSpecialScheduleSheet(rows, existingSchools, name);
          const shouldTreatAsSchedule = specialResult.isScheduleSheet;

          if (shouldTreatAsSchedule) {
            allTeachers.push(...specialResult.teachers);
            allSchedules.push(...specialResult.schedules);
            specialResult.schools.forEach(sch => allSchoolsSet.set(sch.id, sch));
            specialResult.classes.forEach(cls => allClassesSet.set(cls.id, cls));
          } else {
            allTeachers.push(...docTeachers);
            tabWarn.forEach(w => allWarnings.push(`[${name}]: ${w}`));
          }
        }
      }

      res.json({
        status: 'success',
        teachers: allTeachers,
        schedules: allSchedules,
        schools: Array.from(allSchoolsSet.values()),
        classes: Array.from(allClassesSet.values()),
        warnings: allWarnings,
        previewRows,
        sheetTabs: workbook.SheetNames
      });
    } catch (err: any) {
      console.error('Failed to parse public sheet:', err);
      res.status(500).json({ error: 'Failed to parse Google Sheet. Please make sure the sheet is shared as "Anyone with the link can view".', details: err.message });
    }
  });

  // Bulk Sync to/from Google Sheets or initial state overwrites
  app.post('/api/sync-bulk', async (req, res) => {
    try {
      const { teachers: teachList, schools: schList, classes: clsList, schedules: skdList, attendance: attList } = req.body;
      
      const payloadLog = `Payload: teachers=${teachList?.length} schools=${schList?.length} classes=${clsList?.length} schedules=${skdList?.length}`;
      console.log(`Received bulk sync payload: teachers=${teachList?.length} schools=${schList?.length} classes=${clsList?.length} schedules=${skdList?.length}`);

      if (teachList && Array.isArray(teachList)) {
        
        const chunks = [];
        for (let i = 0; i < teachList.length; i += 100) {
          chunks.push(teachList.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            try {
              await db.insert(teachers).values(item).onConflictDoUpdate({
                target: teachers.id,
                set: item
              });
              
              // Auto-create user account for each synced teacher if not exist
              if (item.id) {
                const uId = 'u_' + item.id;
                await db.insert(users).values({
                  id: uId,
                  username: item.id,
                  password: '123456789',
                  role: 'member',
                  teacherId: item.id,
                  permissions: '[]',
                  isDeleted: item.isDeleted || false
                }).onConflictDoUpdate({
                  target: users.username,
                  set: {
                    isDeleted: item.isDeleted || false
                  }
                });
              }
            } catch (err: any) {
              console.error(`Failed to insert teacher ${item.id}:`, err.message);
            }
          }
        }
      }

      if (schList && Array.isArray(schList)) {
        
        const chunks = [];
        for (let i = 0; i < schList.length; i += 100) {
          chunks.push(schList.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            try {
              await db.insert(schools).values(item).onConflictDoUpdate({
                target: schools.id,
                set: item
              });
            } catch (err: any) {
              console.error(`Failed to insert school ${item.id}:`, err.message);
            }
          }
        }
      }

      if (clsList && Array.isArray(clsList)) {
        
        const chunks = [];
        for (let i = 0; i < clsList.length; i += 100) {
          chunks.push(clsList.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            try {
              await db.insert(classes).values(item).onConflictDoUpdate({
                target: classes.id,
                set: item
              });
            } catch (err: any) {
              console.error(`Failed to insert class ${item.id}:`, err.message);
            }
          }
        }
      }

      if (skdList && Array.isArray(skdList)) {
        console.log(`First schedule received: ${JSON.stringify(skdList[0])}`);
        const chunks = [];
        for (let i = 0; i < skdList.length; i += 100) {
          chunks.push(skdList.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            try {
              await db.insert(schedules).values(item).onConflictDoUpdate({
                target: schedules.id,
                set: item
              });
            } catch (err: any) {
              console.error(`Failed to insert schedule ${item.id}:`, err.message);
            }
          }
        }
      }

      if (attList && Array.isArray(attList)) {
        
        const chunks = [];
        for (let i = 0; i < attList.length; i += 100) {
          chunks.push(attList.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          // Use serial execution for safer bulk upsert
          for (const item of chunk) {
            try {
              await db.insert(attendance).values(item).onConflictDoUpdate({
                target: attendance.id,
                set: item
              });
            } catch (e) {
              console.error(`Failed to insert attendance record ${item.id}`, e);
            }
          }
        }
      }

      res.json({ status: 'success', message: 'Bulk synchronisation completed beautifully!' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to bulk-sync', details: err.message });
    }
  });

  // Get All State (convenience endpoint)
  app.get('/api/state', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Force old clients to clear their cache and reload by detecting absence of new version header
    if (req.headers['x-app-version'] !== '2') {
      res.setHeader('Clear-Site-Data', '"cache", "executionContexts"');
    }

    try {
      const teachList = (await db.select().from(teachers)).sort((a, b) => a.id.localeCompare(b.id));
      const schList = (await db.select().from(schools)).sort((a, b) => a.id.localeCompare(b.id));
      const clsList = (await db.select().from(classes)).sort((a, b) => a.id.localeCompare(b.id));
      const skdList = (await db.select().from(schedules)).sort((a, b) => a.id.localeCompare(b.id));
      const rawAttList = (await db.select().from(attendance)).sort((a, b) => a.id.localeCompare(b.id));
      // Optimise payload size: Replace raw base64 images with lightweight API URL placeholders.
      // This prevents the state JSON from ballooning to 20MB+ and crashing mobile browsers.
      const attList = rawAttList.map(att => {
        const hasSelfie = att.selfieImage && att.selfieImage.length > 0;
        return {
          ...att,
          selfieImage: hasSelfie ? `/api/attendance/${att.id}/selfie` : ''
        };
      });
      const changeList = (await db.select().from(changeRequests)).sort((a, b) => a.id.localeCompare(b.id));
      const notList = (await db.select().from(systemNotifications)).sort((a, b) => a.id.localeCompare(b.id));
      const logList = (await db.select().from(auditLogs)).sort((a, b) => a.id.localeCompare(b.id));
      let userList = (await db.select().from(users)).sort((a, b) => a.username.localeCompare(b.username));
      
      // Ensure admin exists
      if (!userList.some(u => u.username === 'admin')) {
        const adminUser = {
          id: 'u_admin',
          uid: null,
          email: null,
          username: 'admin',
          password: 'admin',
          role: 'admin',
          teacherId: null,
          permissions: JSON.stringify(['all']),
          isDeleted: false,
          deletedAt: null
        };
        await db.insert(users).values(adminUser as any).onConflictDoNothing();
        userList.push(adminUser as any);
      }
      const maList = (await db.select().from(meetingAttendance)).sort((a, b) => a.id.localeCompare(b.id));
      const cancellationsList = await db.select().from(schoolCancellations);
      
      let systemSettings = await db.select().from(appSettings).limit(1);
      if (systemSettings.length === 0) {
        const defaultSettings = { id: 'global', allowTeacherScheduleEdit: false, allowTeacherUpdateSchoolLocation: false, requireSelfieCheckIn: true };
        await db.insert(appSettings).values(defaultSettings);
        systemSettings = [defaultSettings];
      }

      // Sort logs and notifications descending by timestamp if needed or index
      res.json({
        teachers: teachList,
        schools: schList,
        classes: clsList,
        schedules: skdList,
        attendance: attList,
        changes: changeList,
        notifications: notList,
        auditLogs: logList,
        users: userList,
        meetingAttendance: maList,
        settings: systemSettings[0],
        quickAnnouncement: latestQuickAnnouncement,
        schoolCancellations: cancellationsList
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve system state', details: err.message });
    }
  });

  app.post('/api/notifications/quick-broadcast', (req, res) => {
    try {
      const { title, message } = req.body;
      latestQuickAnnouncement = {
        id: `QA_${Date.now()}`,
        title: title || 'Thông báo từ Ban Giám Đốc',
        message: message || '',
        timestamp: new Date().toISOString()
      };
      
      // Send Web Push notification to all subscribers
      sendPushNotification(null, {
        title: title || 'Thông báo từ Ban Giám Đốc',
        message: message || ''
      });

      res.json({ success: true, announcement: latestQuickAnnouncement });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/subscribe', async (req, res) => {
    try {
      const { userId, subscription } = req.body;
      if (!userId || !subscription || !subscription.endpoint) {
        res.status(400).json({ error: 'Missing subscription details' });
        return;
      }
      
      const endpoint = subscription.endpoint;
      const keysAuth = subscription.keys?.auth || '';
      const keysP256dh = subscription.keys?.p256dh || '';
      
      const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
      if (existing.length > 0) {
        await db.update(pushSubscriptions)
          .set({ userId, keysAuth, keysP256dh })
          .where(eq(pushSubscriptions.endpoint, endpoint));
      } else {
        await db.insert(pushSubscriptions).values({
          id: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          userId,
          endpoint,
          keysAuth,
          keysP256dh,
          createdAt: new Date().toISOString()
        });
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error saving subscription:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/school-cancellations', async (req, res) => {
    try {
      const data = req.body;
      const id = `CAN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const payload = {
        id,
        ...data,
        createdAt: new Date().toISOString()
      };
      await db.insert(schoolCancellations).values(payload);
      res.status(201).json(payload);
    } catch (err: any) {
      console.error('Error creating school cancellation:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/school-cancellations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(schoolCancellations).set(data).where(eq(schoolCancellations.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error updating school cancellation:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/school-cancellations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schoolCancellations).where(eq(schoolCancellations.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting school cancellation:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Hot-fix recover orphaned schedules
  app.get('/api/recover-schedules', async (req, res) => {
    try {
      const skdList = await db.select().from(schedules);
      const tList = await db.select().from(teachers);
      if (tList.length === 0 || skdList.length === 0) {
        return res.json({ msg: 'Empty' });
      }
      for (let i = 0; i < skdList.length; i++) {
        const tId = tList[i % tList.length].id;
        await db.update(schedules).set({ teacherId: tId }).where(eq(schedules.id, skdList[i].id));
      }
      res.json({ msg: 'Recovered ' + skdList.length + ' schedules.' });
    } catch(err: any) {
      console.error('DB ERROR', err); res.status(500).json({ error: err.message, stack: err.stack, full: Object.getOwnPropertyNames(err).reduce((acc, key) => { acc[key] = err[key]; return acc; }, {}) });
    }
  });

  // Settings API
  app.put('/api/settings', async (req, res) => {
    try {
      const data = req.body;
      const existing = await db.select().from(appSettings).limit(1);
      if (existing.length === 0) {
        await db.insert(appSettings).values({ id: 'global', ...data });
      } else {
        await db.update(appSettings).set(data).where(eq(appSettings.id, 'global'));
      }
      res.json({ success: true, settings: data });
    } catch (err: any) {
      console.error('API ERR:', err); res.status(500).json({ error: err.message, stack: err.stack, details: err.detail || err.code || err.routine });
    }
  });

  // --- USERS & AUTHENTICATION ENDPOINTS ---

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng cung cấp Tài khoản và Mật khẩu!' });
      }

      const match = await db.select().from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (match.length === 0 || match[0].password !== password) {
        return res.status(401).json({ error: 'Tài khoản hoặc Mật khẩu không chính xác!' });
      }

      const userUnit = match[0];
      if (userUnit.isDeleted) {
        return res.status(403).json({ error: 'Tài khoản này đã bị vô hiệu hóa hoặc xóa tạm thời!' });
      }

      res.json({ success: true, user: userUnit });
    } catch (e: any) {
      console.error('Login error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/google', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userUnit = await getOrCreateUser(req.user.uid, req.user.email || '');

      if (userUnit.isDeleted) {
        return res.status(403).json({ error: 'Tài khoản này đã bị vô hiệu hóa hoặc xóa tạm thời!' });
      }

      let parsedPerms = JSON.parse(userUnit.permissions || '[]');
      if (typeof parsedPerms === 'string') {
        try { parsedPerms = JSON.parse(parsedPerms); } catch(e) {}
      }

      res.json({
        success: true,
        user: {
          id: userUnit.id,
          username: userUnit.username,
          role: userUnit.role,
          teacherId: userUnit.teacherId,
          permissions: parsedPerms
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập', details: err.message });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });




  app.post('/api/users/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          // Protect admin accounts from deletion
          if (id === 'u_admin' || id === 'admin') continue;
          await db.delete(users).where(eq(users.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            await db.insert(users).values(item).onConflictDoUpdate({
              target: users.username,
              set: {
                password: item.password,
                role: item.role,
                teacherId: item.teacherId,
                permissions: item.permissions,
                isDeleted: item.isDeleted
              }
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const uData = req.body;
      await db.insert(users).values(uData).onConflictDoUpdate({
        target: users.id,
        set: uData
      });
      res.status(201).json(uData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/users/:id/password', async (req, res) => {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;
      
      const match = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (match.length === 0) {
        return res.status(404).json({ error: 'Người dùng không tồn tại!' });
      }
      
      if (match[0].password !== oldPassword) {
        return res.status(400).json({ error: 'Mật khẩu cũ không chính xác!' });
      }
      
      await db.update(users).set({ password: newPassword }).where(eq(users.id, id));
      
      res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true, message: `User ${id} deleted permanent successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/update-member-passwords', async (req, res) => {
    try {
      await db.update(users).set({ password: '123456789' }).where(eq(users.role, 'member'));
      res.json({ success: true, message: 'Updated all member passwords to 123456789' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // TEACHERS API
  app.get('/api/teachers', async (req, res) => {
    try {
      const resList = await db.select().from(teachers);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/teachers/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(teachers).where(eq(teachers.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            await db.insert(teachers).values(item).onConflictDoUpdate({
              target: teachers.id,
              set: item
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/teachers', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(teachers).values(data).onConflictDoUpdate({
        target: teachers.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/teachers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(teachers).set(data).where(eq(teachers.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/teachers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(teachers).where(eq(teachers.id, id));
      res.json({ success: true, message: `Teacher ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SCHOOLS API
  app.get('/api/schools', async (req, res) => {
    try {
      const resList = await db.select().from(schools);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/schools/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(schools).where(eq(schools.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            await db.insert(schools).values(item).onConflictDoUpdate({
              target: schools.id,
              set: item
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/schools', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(schools).values(data).onConflictDoUpdate({
        target: schools.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/schools/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(schools).set(data).where(eq(schools.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/schools/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schools).where(eq(schools.id, id));
      res.json({ success: true, message: `School ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CLASSES API
  app.get('/api/classes', async (req, res) => {
    try {
      const resList = await db.select().from(classes);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/classes/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(classes).where(eq(classes.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            await db.insert(classes).values(item).onConflictDoUpdate({
              target: classes.id,
              set: item
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/classes', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(classes).values(data).onConflictDoUpdate({
        target: classes.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/classes/merge', async (req, res) => {
    try {
      const { sourceClassId, targetClassId } = req.body;
      if (!sourceClassId || !targetClassId) {
        return res.status(400).json({ error: 'Missing sourceClassId or targetClassId' });
      }

      await db.update(schedules).set({ classId: targetClassId }).where(eq(schedules.classId, sourceClassId));
      await db.update(attendance).set({ classId: targetClassId }).where(eq(attendance.classId, sourceClassId));
      await db.update(schoolCancellations).set({ classId: targetClassId }).where(eq(schoolCancellations.classId, sourceClassId));

      await db.update(classes).set({ 
        isDeleted: true, 
        deletedAt: new Date().toISOString() 
      }).where(eq(classes.id, sourceClassId));

      res.json({ success: true, message: `Merged class ${sourceClassId} into ${targetClassId} successfully` });
    } catch (err: any) {
      console.error('Failed to merge classes:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/classes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(classes).set(data).where(eq(classes.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/classes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(classes).where(eq(classes.id, id));
      res.json({ success: true, message: `Class ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SCHEDULES API
  app.get('/api/schedules', async (req, res) => {
    try {
      const resList = await db.select().from(schedules);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/schedules/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(schedules).where(eq(schedules.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            await db.insert(schedules).values(item).onConflictDoUpdate({
              target: schedules.id,
              set: item
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/schedules', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(schedules).values(data).onConflictDoUpdate({
        target: schedules.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/schedules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(schedules).set(data).where(eq(schedules.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/schedules', async (req, res) => {
    try {
      await db.delete(schedules);
      res.json({ success: true, message: 'All schedules deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/schedules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(schedules).where(eq(schedules.id, id));
      res.json({ success: true, message: `Schedule ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ATTENDANCE API
  app.get('/api/attendance', async (req, res) => {
    try {
      const rawList = await db.select().from(attendance);
      const resList = rawList.map(att => {
        const hasSelfie = att.selfieImage && att.selfieImage.length > 0;
        return {
          ...att,
          selfieImage: hasSelfie ? `/api/attendance/${att.id}/selfie` : ''
        };
      });
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/attendance/:id/selfie', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await db.select({ selfieImage: attendance.selfieImage })
        .from(attendance)
        .where(eq(attendance.id, id))
        .limit(1);
      
      if (record.length === 0 || !record[0].selfieImage) {
        return res.status(404).send('Not found');
      }

      const img = record[0].selfieImage;
      if (img.startsWith('data:image/')) {
        const matches = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(buffer);
        }
      } else if (img.startsWith('http://') || img.startsWith('https://')) {
        return res.redirect(img);
      }

      // Fallback if not a data URI
      res.setHeader('Content-Type', 'text/plain');
      res.send(img);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/attendance/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(attendance).where(eq(attendance.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          // Use serial execution for safer bulk upsert
          for (const item of chunk) {
            // IMPORTANT: Never overwrite a real base64 selfie image with a placeholder URL string.
            // This can happen if the frontend re-sends data it received from the GET endpoint.
            const safeItem = { ...item };
            if (safeItem.selfieImage && safeItem.selfieImage.startsWith('/api/attendance/')) {
              delete safeItem.selfieImage; // Do not overwrite - keep existing DB value
            }
            
            // For conflict updates, also exclude selfieImage if it's a placeholder
            const safeSet = { ...safeItem };
            
            await db.insert(attendance).values(safeItem).onConflictDoUpdate({
              target: attendance.id,
              set: safeSet
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.selfieImage && data.selfieImage.startsWith('/api/attendance/')) {
        delete data.selfieImage; // Prevent overwriting with placeholder URL
      }
      await db.insert(attendance).values(data).onConflictDoUpdate({
        target: attendance.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/attendance/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      if (data.selfieImage && data.selfieImage.startsWith('/api/attendance/')) {
        delete data.selfieImage; // Prevent overwriting with placeholder URL
      }
      await db.update(attendance).set(data).where(eq(attendance.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  
  app.delete('/api/attendance/images/clear', async (req, res) => {
    try {
      // Set photoUrl to empty string for all attendance records
      // In a real app, you might want to delete only old ones, but here we clear all to free space
      await db.update(attendance).set({ selfieImage: '' }).where(isNotNull(attendance.id));
      res.json({ success: true, message: 'All attendance images cleared' });
    } catch (err: any) {
      console.log('PG ERROR:', err);
      res.status(500).json({ error: err.message, stack: err.stack, code: err.code, detail: err.detail });
    }
  });

  app.delete('/api/attendance/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(attendance).where(eq(attendance.id, id));
      res.json({ success: true, message: `Attendance record ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // MEETING ATTENDANCE API
  app.get('/api/meeting-attendance', async (req, res) => {
    try {
      const resList = await db.select().from(meetingAttendance);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/meeting-attendance', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(meetingAttendance).values(data).onConflictDoUpdate({
        target: meetingAttendance.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/meeting-attendance/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(meetingAttendance).set(data).where(eq(meetingAttendance.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/meeting-attendance/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(meetingAttendance).where(eq(meetingAttendance.id, id));
      res.json({ success: true, message: `Meeting attendance ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CHANGE REQUESTS API
  app.get('/api/changes', async (req, res) => {
    try {
      const resList = await db.select().from(changeRequests);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/changes/bulk', async (req, res) => {
    try {
      const { upsert, remove: delIds } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(changeRequests).where(eq(changeRequests.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        
        // Batch insert in chunks of 100 using Promise.all
        const chunks = [];
        for (let i = 0; i < upsert.length; i += 100) {
          chunks.push(upsert.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          for (const item of chunk) {
            await db.insert(changeRequests).values(item).onConflictDoUpdate({
              target: changeRequests.id,
              set: item
            });
          }
        }
      }
      res.json({ status: 'success' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/changes', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(changeRequests).values(data).onConflictDoUpdate({
        target: changeRequests.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/changes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(changeRequests).set(data).where(eq(changeRequests.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/changes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(changeRequests).where(eq(changeRequests.id, id));
      res.json({ success: true, message: `Change request ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SYSTEM NOTIFICATIONS API
  app.get('/api/notifications', async (req, res) => {
    try {
      const resList = await db.select().from(systemNotifications);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(systemNotifications).values(data).onConflictDoUpdate({
        target: systemNotifications.id,
        set: data
      });
      
      // Trigger Web Push notification to device
      sendPushNotification(data.targetTeacherId || null, {
        title: data.title || 'Thông báo mới',
        message: data.message || ''
      });

      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await db.update(systemNotifications).set(data).where(eq(systemNotifications.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(systemNotifications).where(eq(systemNotifications.id, id));
      res.json({ success: true, message: `Notification ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AUDIT LOGS API
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const resList = await db.select().from(auditLogs);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/audit-logs', async (req, res) => {
    try {
      const data = req.body;
      await db.insert(auditLogs).values(data).onConflictDoUpdate({
        target: auditLogs.id,
        set: data
      });
      res.status(201).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const SERVER_VERSION = Date.now().toString();

  app.get('/api/version', (req, res) => {
    res.json({ version: SERVER_VERSION });
  });

  app.get('/api/force-update', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Đang cập nhật...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body { font-family: sans-serif; padding: 2rem; text-align: center; }</style>
      </head>
      <body>
        <h2>Đang đồng bộ phiên bản mới nhất...</h2>
        <p>Vui lòng đợi trong giây lát.</p>
        <script>
          // Clear all caches and service workers
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let r of registrations) { r.unregister(); }
            });
          }
          if (window.caches) {
            caches.keys().then(function(names) {
              for (let name of names) caches.delete(name);
            });
          }
          // Redirect to home after 1 second to ensure SW unregisters
          setTimeout(() => {
            window.location.href = '/?v=' + Date.now();
          }, 1500);
        </script>
      </body>
      </html>
    `);
  });

  // Bypass Workbox navigateFallback by using a .html extension
  app.get('/update.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Đang xử lý phiên bản...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body { font-family: sans-serif; padding: 2rem; text-align: center; background: #f0fdf4; }</style>
      </head>
      <body>
        <h2 style="color: #166534;">Đang xóa bộ nhớ đệm và kết nối lại...</h2>
        <p>Hệ thống đang đồng bộ dữ liệu của giáo viên.</p>
        <script>
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let r of registrations) { r.unregister(); }
            });
          }
          if (window.caches) {
            caches.keys().then(function(names) {
              for (let name of names) caches.delete(name);
            });
          }
          setTimeout(() => {
            window.location.href = '/?v=' + Date.now();
          }, 2000);
        </script>
      </body>
      </html>
    `);
  });

  app.get('/v2', (req, res) => {
    res.redirect('/?v=2');
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('index.html') || filePath.includes('workbox-')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    
    // Static assets will serve sw.js from distPath automatically
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
