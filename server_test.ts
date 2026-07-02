import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
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
  users
} from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { 
  INITIAL_TEACHERS, 
  INITIAL_SCHOOLS, 
  INITIAL_CLASSES, 
  INITIAL_SCHEDULES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS 
} from './src/data/mockData.ts';

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json({ limit: '50mb' }));

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
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'PostgreSQL Cloud SQL' });
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

      const markerFile = path.join(process.cwd(), '.db_seeded');
      fs.writeFileSync(markerFile, 'true');

      res.json({ status: 'success', message: 'Database wiped successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to wipe database', details: err.message });
    }
  });

  // Bulk Sync to/from Google Sheets or initial state overwrites
  app.post('/api/sync-bulk', async (req, res) => {
    try {
      const { teachers: teachList, schools: schList, classes: clsList, schedules: skdList, attendance: attList } = req.body;
      
      console.log('Received bulk sync payload...');

      if (teachList && Array.isArray(teachList)) {
        for (const t of teachList) {
          await db.insert(teachers).values(t).onConflictDoUpdate({
            target: teachers.id,
            set: t
          });
        }
      }

      if (schList && Array.isArray(schList)) {
        for (const s of schList) {
          await db.insert(schools).values(s).onConflictDoUpdate({
            target: schools.id,
            set: s
          });
        }
      }

      if (clsList && Array.isArray(clsList)) {
        for (const c of clsList) {
          await db.insert(classes).values(c).onConflictDoUpdate({
            target: classes.id,
            set: c
          });
        }
      }

      if (skdList && Array.isArray(skdList)) {
        for (const skd of skdList) {
          await db.insert(schedules).values(skd).onConflictDoUpdate({
            target: schedules.id,
            set: skd
          });
        }
      }

      if (attList && Array.isArray(attList)) {
        for (const att of attList) {
          await db.insert(attendance).values(att).onConflictDoUpdate({
            target: attendance.id,
            set: att
          });
        }
      }

      res.json({ status: 'success', message: 'Bulk synchronisation completed beautifully!' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to bulk-sync', details: err.message });
    }
  });

  // Get All State (convenience endpoint)
  app.get('/api/state', async (req, res) => {
    try {
      const teachList = await db.select().from(teachers);
      const schList = await db.select().from(schools);
      const clsList = await db.select().from(classes);
      const skdList = await db.select().from(schedules);
      const attList = await db.select().from(attendance);
      const changeList = await db.select().from(changeRequests);
      const notList = await db.select().from(systemNotifications);
      const logList = await db.select().from(auditLogs);
      const userList = await db.select().from(users);

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
        users: userList
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve system state', details: err.message });
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

      res.json({
        success: true,
        user: {
          id: userUnit.id,
          username: userUnit.username,
          role: userUnit.role,
          teacherId: userUnit.teacherId,
          permissions: JSON.parse(userUnit.permissions || '[]')
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

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true, message: `User ${id} deleted permanent successfully` });
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
      const resList = await db.select().from(attendance);
      res.json(resList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/attendance', async (req, res) => {
    try {
      const data = req.body;
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
      const data = req.body;
      await db.update(attendance).set(data).where(eq(attendance.id, id));
      res.json({ id, ...data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  // CHANGE REQUESTS API
  app.get('/api/changes', async (req, res) => {
    try {
      const resList = await db.select().from(changeRequests);
      res.json(resList);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
