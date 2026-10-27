import 'dotenv/config';
import express from 'express';
import compression from 'compression';
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
import { eq, not, ne, isNotNull, sql, and } from 'drizzle-orm';
import { handleHrDispatchMessage, isHrDispatchUser, notifyApprovedChangesViaMessenger } from './src/services/hrDispatchService.ts';
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

import { officeRouter } from './server_office.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Tối ưu hóa nén dữ liệu truyền tải Gzip / Deflate cho toàn bộ API và tệp tĩnh
  app.use(compression({
    threshold: 1024,
    level: 6
  }));

  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));
  app.use('/', officeRouter);

  let requestsToday = 0;
  let latestQuickAnnouncement: { id: string; title: string; message: string; targetUserId?: string | null; timestamp: string } | null = null;
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
        // Resolve teacherId to user ID(s)
        const userRows = await db.select().from(users).where(eq(users.teacherId, targetUserId));
        const userIds = userRows.map(u => u.id);
        if (userIds.length > 0) {
          subs = [];
          for (const uid of userIds) {
            const userSubs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, uid));
            subs.push(...userSubs);
          }
        } else {
          subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, targetUserId));
        }
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
  let cachedStatePayload: any = null;
  let cachedStateTimestamp = 0;
  
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

  // --- VĂN PHÒNG ẢO 3D & ANTIGRAVITY REALTIME BRIDGE ---
  let officeEventsQueue: any[] = [];

  app.get('/api/office/stats', async (req, res) => {
    try {
      const activeTeachers = await db.select().from(teachers).where(eq(teachers.isDeleted, false));
      const activeClasses = await db.select().from(classes).where(eq(classes.isDeleted, false));
      const allSchedules = await db.select().from(schedules).where(eq(schedules.isDeleted, false));

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // NGUYÊN TẮC: CHỈ NHỮNG TRƯỜNG CÓ PHÁT SINH CHẤM CÔNG THỰC TẾ MỚI TÍNH LÀ TRƯỜNG HOẠT ĐỘNG
      const attSchoolCountRes = await db.execute(sql`
        SELECT COUNT(DISTINCT school_id) as count 
        FROM attendance 
        WHERE school_id IS NOT NULL AND school_id != '' AND date LIKE ${currentMonthStr + '%'}
      `);
      const totalActiveSchoolsWithAtt = parseInt(String(attSchoolCountRes.rows[0]?.count || 147), 10);

      const attCountRes = await db.execute(sql`
        SELECT COUNT(id) as count 
        FROM attendance 
        WHERE date LIKE ${currentMonthStr + '%'}
      `);
      const totalAttendanceMonth = parseInt(String(attCountRes.rows[0]?.count || 0), 10);

      res.json({
        success: true,
        month: currentMonthStr,
        totalSchools: totalActiveSchoolsWithAtt, // Chỉ tính trường có phát sinh chấm công thực tế trong tháng
        totalTeachers: activeTeachers.length,
        totalClasses: activeClasses.length,
        totalSchedules: allSchedules.length,
        totalAttendanceMonth: totalAttendanceMonth,
        systemHealth: '100% Ổn định'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/office/live-command', async (req, res) => {
    try {
      const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
      const todayStr = nowVN.toISOString().split('T')[0];
      const jsDay = nowVN.getUTCDay();
      const currentDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;

      const [allSchools, allClasses, allTeachers] = await Promise.all([
        db.select().from(schools).where(eq(schools.isDeleted, false)),
        db.select().from(classes).where(eq(classes.isDeleted, false)),
        db.select().from(teachers).where(eq(teachers.isDeleted, false))
      ]);

      const schoolMap = new Map(allSchools.map(s => [s.id, s]));
      const classMap = new Map(allClasses.map(c => [c.id, c]));
      const teacherMap = new Map(allTeachers.map(t => [t.id, t]));

      const todaySchedules = await db.select().from(schedules).where(
        and(eq(schedules.dayOfWeek, currentDayOfWeek), eq(schedules.isDeleted, false))
      );

      const todayAttendance = await db.select({
        id: attendance.id,
        date: attendance.date,
        scheduleId: attendance.scheduleId,
        teacherId: attendance.teacherId,
        schoolId: attendance.schoolId,
        classId: attendance.classId,
        session: attendance.session,
        checkInTime: attendance.checkInTime,
        periods: attendance.periods,
        isVerified: attendance.isVerified,
        isFlagged: attendance.isFlagged,
        flagReason: attendance.flagReason,
        hasSelfie: attendance.hasSelfie
      }).from(attendance).where(eq(attendance.date, todayStr));

      // Lấy danh sách giáo viên có đơn nghỉ ốm hôm nay (Approved)
      const approvedSickLeaves = await db.select().from(changeRequests).where(
        and(eq(changeRequests.date, todayStr), eq(changeRequests.status, 'approved'))
      );
      const sickTeacherIds = new Set(
        approvedSickLeaves.filter(c => c.requestType === 'sick_leave').map(c => c.teacherId)
      );

      // Tính tổng số ca tích lũy trong tháng hiện tại của từng giáo viên
      const currentMonthStr = todayStr.substring(0, 7);
      const monthAttendance = await db.select({
        teacherId: attendance.teacherId,
        periods: attendance.periods
      }).from(attendance).where(sql`date LIKE ${currentMonthStr + '%'}`);

      const monthPeriodsMap = new Map<string, number>();
      monthAttendance.forEach(a => {
        monthPeriodsMap.set(a.teacherId, (monthPeriodsMap.get(a.teacherId) || 0) + (a.periods || 1));
      });

      const getSessionCategory = (sessionStr: string): 'morning' | 'afternoon' => {
        if (!sessionStr) return 'morning';
        const s = sessionStr.toLowerCase().trim();
        // 1. Phân biệt theo từ khóa rõ ràng
        if (s.includes('sáng') || s.includes('sang') || s.includes('morning')) return 'morning';
        if (s.includes('chiều') || s.includes('chieu') || s.includes('afternoon') || s.includes('tối') || s.includes('toi')) return 'afternoon';
        // 2. Trích xuất giờ từ chuỗi (ví dụ: "15:00", "08:15", "14h30", "9:30-10:00")
        const match = s.match(/(\d{1,2})[:h]/);
        if (match) {
          const h = parseInt(match[1], 10);
          if (h >= 12 || (h >= 1 && h <= 6 && !s.includes('sáng'))) return 'afternoon';
          if (h >= 7 && h <= 11) return 'morning';
        }
        return 'morning';
      };

      const teachersStatus = allTeachers.map(t => {
        const mySchedules = todaySchedules.filter(s => s.teacherId === t.id);
        const myAtt = todayAttendance.filter(a => a.teacherId === t.id);

        const morningSchs = mySchedules.filter(s => getSessionCategory(s.session) === 'morning');
        const afternoonSchs = mySchedules.filter(s => getSessionCategory(s.session) === 'afternoon');

        const hasMorningSchedule = morningSchs.length > 0;
        const hasAfternoonSchedule = afternoonSchs.length > 0;

        let morningSchoolName = '';
        let morningClassName = '';
        let morningSession = '';
        let morningPeriods = 0;
        if (hasMorningSchedule) {
          const firstM = morningSchs[0];
          morningSchoolName = schoolMap.get(firstM.schoolId)?.name || 'Trường đối tác';
          morningClassName = classMap.get(firstM.classId)?.name || '';
          morningSession = firstM.session || 'Sáng';
          morningPeriods = morningSchs.reduce((sum, s) => sum + (s.periods || 1), 0);
        }

        let afternoonSchoolName = '';
        let afternoonClassName = '';
        let afternoonSession = '';
        let afternoonPeriods = 0;
        if (hasAfternoonSchedule) {
          const firstA = afternoonSchs[0];
          afternoonSchoolName = schoolMap.get(firstA.schoolId)?.name || 'Trường đối tác';
          afternoonClassName = classMap.get(firstA.classId)?.name || '';
          afternoonSession = firstA.session || 'Chiều';
          afternoonPeriods = afternoonSchs.reduce((sum, s) => sum + (s.periods || 1), 0);
        }

        const todayDetails = mySchedules.map(s => {
          const cat = getSessionCategory(s.session);
          return {
            schoolName: schoolMap.get(s.schoolId)?.name || 'Trường đối tác',
            className: classMap.get(s.classId)?.name || '',
            session: s.session,
            sessionCategory: cat,
            sessionLabel: cat === 'morning' ? 'Ca Sáng' : 'Ca Chiều',
            periods: s.periods || 1
          };
        });

        let status = 'idle';
        if (sickTeacherIds.has(t.id)) {
          status = 'sick';
        }
        let currentSchoolName = '';
        let currentClassName = '';
        let latestCheckIn = '';
        let isFlagged = false;
        let lastSelfieUrl = '';
        let latestPeriods = 0;

        if (myAtt.length > 0) {
          const latest = myAtt[myAtt.length - 1];
          currentSchoolName = schoolMap.get(latest.schoolId)?.name || 'Trường đối tác';
          currentClassName = classMap.get(latest.classId)?.name || '';
          latestCheckIn = latest.checkInTime;
          isFlagged = latest.isFlagged;
          latestPeriods = latest.periods || 1;
          lastSelfieUrl = latest.hasSelfie ? `/api/attendance/${latest.id}/selfie` : '';
          
          if (myAtt.length >= mySchedules.length && mySchedules.length > 0) {
            status = 'completed';
          } else {
            status = 'teaching';
          }
        } else if (mySchedules.length > 0 && status !== 'sick') {
          status = 'pending';
          // Nếu có ca sáng, ưu tiên hiển thị ca sáng trước, nếu chỉ có ca chiều thì hiển thị ca chiều
          const primarySch = hasMorningSchedule ? morningSchs[0] : (hasAfternoonSchedule ? afternoonSchs[0] : mySchedules[0]);
          currentSchoolName = schoolMap.get(primarySch.schoolId)?.name || 'Trường đối tác';
          currentClassName = classMap.get(primarySch.classId)?.name || '';
        }

        return {
          id: t.id,
          name: t.name,
          phone: t.phone,
          status,
          totalSchedulesToday: mySchedules.length,
          checkedInCount: myAtt.length,
          totalMonthPeriods: monthPeriodsMap.get(t.id) || 0,
          currentSchoolName,
          currentClassName,
          latestCheckIn,
          latestPeriods,
          isFlagged,
          selfieUrl: lastSelfieUrl,
          hasMorningSchedule,
          morningSchoolName,
          morningClassName,
          morningSession,
          morningPeriods,
          hasAfternoonSchedule,
          afternoonSchoolName,
          afternoonClassName,
          afternoonSession,
          afternoonPeriods,
          todayDetails
        };
      });

      const totalClassesToday = todaySchedules.reduce((sum, s) => sum + (s.periods || 1), 0);
      const totalCheckedInPeriods = todayAttendance.reduce((sum, a) => sum + (a.periods || 1), 0);
      const flaggedCount = todayAttendance.filter(a => a.isFlagged).length;

      const recentFeed = todayAttendance.slice(-8).reverse().map(att => ({
        id: att.id,
        teacherName: teacherMap.get(att.teacherId)?.name || att.teacherId,
        schoolName: schoolMap.get(att.schoolId)?.name || 'Trường MN',
        className: classMap.get(att.classId)?.name || '',
        checkInTime: att.checkInTime,
        isFlagged: att.isFlagged,
        selfieUrl: att.hasSelfie ? `/api/attendance/${att.id}/selfie` : ''
      }));

      res.json({
        success: true,
        today: todayStr,
        dayOfWeek: currentDayOfWeek,
        dayOfWeekName: currentDayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${currentDayOfWeek}`,
        stats: {
          totalSchedulesToday: todaySchedules.length,
          totalClassesToday,
          totalCheckedInClasses: todayAttendance.length,
          totalCheckedInPeriods,
          flaggedCount,
          activeTeachers: teachersStatus.filter(t => t.status === 'teaching' || t.status === 'completed').length,
          totalTeachers: allTeachers.length,
          totalSchools: parseInt(String((await db.execute(sql`SELECT COUNT(DISTINCT school_id) as count FROM attendance WHERE school_id IS NOT NULL AND school_id != '' AND date LIKE ${todayStr.slice(0, 7) + '%'}`)).rows[0]?.count || 147), 10)
        },
        teachers: teachersStatus,
        recentFeed
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Lưu lịch sử gửi tin nhắc nhở: Key = `${todayStr}_${session}_${teacherId}`
  // ĐẢM BẢO QUY TẮC BẤT BIẾN: CHỈ GỬI ĐÚNG 1 LẦN CHO 1 BUỔI, KHÔNG GỬI LẶP LÀM PHIỀN
  const sentFacebookRemindersToday = new Set<string>();

  app.post('/api/office/remind-pending-facebook', async (req, res) => {
    try {
      const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
      const todayStr = nowVN.toISOString().split('T')[0];
      const jsDay = nowVN.getUTCDay();
      const currentDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;
      const currentHour = nowVN.getUTCHours();
      const currentSession = currentHour < 12 ? 'morning' : 'afternoon';
      const sessionLabel = currentSession === 'morning' ? 'Sáng' : 'Chiều';

      const isMorning = (sessionStr: string) => {
        if (!sessionStr) return false;
        const s = sessionStr.toLowerCase().trim();
        if (s.includes('sáng')) return true;
        if (s.includes('chiều') || s.includes('tối')) return false;
        const match = s.match(/^(\d{1,2})[h:]/);
        if (match) return parseInt(match[1], 10) < 12;
        return false;
      };

      const [todaySchedules, todayAttendance, allTeachers, allSchools, approvedLeaves] = await Promise.all([
        db.select().from(schedules).where(and(eq(schedules.dayOfWeek, currentDayOfWeek), eq(schedules.isDeleted, false))),
        db.select().from(attendance).where(eq(attendance.date, todayStr)),
        db.select().from(teachers).where(eq(teachers.isDeleted, false)),
        db.select().from(schools).where(eq(schools.isDeleted, false)),
        db.select().from(changeRequests).where(and(
          sql`date LIKE ${todayStr.substring(0, 7) + '%'}`,
          eq(changeRequests.status, 'approved')
        ))
      ]);

      const teacherMap = new Map(allTeachers.map(t => [t.id, t]));
      const schoolMap = new Map(allSchools.map(s => [s.id, s]));
      const checkedInTeacherIds = new Set(todayAttendance.map(a => a.teacherId));
      const teachersWithAbsenceThisMonth = new Set(
        approvedLeaves.filter(c => c.requestType === 'sick_leave' || c.requestType === 'leave').map(c => c.teacherId)
      );

      const isCurrentSessionMorning = currentSession === 'morning';
      const pendingTeachers = todaySchedules
        .filter(s => {
          const matchesTime = isCurrentSessionMorning ? isMorning(s.session) : !isMorning(s.session);
          return matchesTime && !checkedInTeacherIds.has(s.teacherId);
        })
        .map(s => {
          const t = teacherMap.get(s.teacherId);
          const sc = schoolMap.get(s.schoolId);
          return {
            teacherId: s.teacherId,
            teacherName: t?.name || s.teacherId,
            facebookPsid: t?.facebookPsid,
            schoolName: sc?.name || 'Trường đối tác',
            session: s.session,
            isPerfectAttendance: !teachersWithAbsenceThisMonth.has(s.teacherId)
          };
        });

      let sentCount = 0;
      let skippedCount = 0;
      const details: any[] = [];

      for (const item of pendingTeachers) {
        const reminderKey = `${todayStr}_${currentSession}_${item.teacherId}`;
        
        // KIỂM TRA CHẶN GỬI TRÙNG LẶP (CHỈ NHẮN 1 LẦN CHO 1 BUỔI)
        if (sentFacebookRemindersToday.has(reminderKey)) {
          skippedCount++;
          details.push({
            teacherId: item.teacherId,
            name: item.teacherName,
            status: 'SKIPPED_ALREADY_SENT',
            message: 'Đã nhắc buổi này rồi, bỏ qua tránh làm phiền giáo viên'
          });
          continue;
        }

        if (item.facebookPsid) {
          let reminderMsg = `🔔 [HR CẦU VỒNG NHẮC LỊCH DẠY]
Chào cô ${item.teacherName},
Phòng Nhân Sự Cầu Vồng xin nhắc: Buổi ${sessionLabel} hôm nay (${todayStr}) cô có ca dạy tại ${item.schoolName}.
Cô nhớ mở App Chấm Công ETMS để Check-in định vị GPS khi đến trường nhé!`;

          if (item.isPerfectAttendance) {
            reminderMsg += `\n\n🌟 ĐẶC BIỆT: Cô đang giữ thành tích 100% CHUYÊN CẦN xuất sắc trong tháng này! Cô hãy cố gắng đến trường và check-in đúng giờ để giữ trọn vẹn tiền thưởng Chuyên Cần tháng này nhé, cố gắng đừng để mất tiết nha cô! 💪❤️`;
          } else {
            reminderMsg += `\n\n🌈 Chúc cô một buổi dạy tràn đầy năng lượng và niềm vui cùng các bé!`;
          }
          
          try {
            await sendFacebookMessage(item.facebookPsid, reminderMsg);
            sentFacebookRemindersToday.add(reminderKey); // Ghi nhận đã gửi thành công
            sentCount++;
            details.push({
              teacherId: item.teacherId,
              name: item.teacherName,
              status: 'SENT_SUCCESS',
              school: item.schoolName,
              hadAttendanceBonusBoost: item.isPerfectAttendance
            });
          } catch (err: any) {
            details.push({
              teacherId: item.teacherId,
              name: item.teacherName,
              status: 'SEND_FAILED',
              error: err.message
            });
          }
        } else {
          details.push({
            teacherId: item.teacherId,
            name: item.teacherName,
            status: 'NO_FACEBOOK_LINKED',
            message: 'Giáo viên chưa liên kết Facebook Messenger'
          });
        }
      }

      res.json({
        success: true,
        session: sessionLabel,
        totalPending: pendingTeachers.length,
        sentCount,
        skippedCount,
        details
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/office/events', (req, res) => {
    res.json({ events: officeEventsQueue });
  });

  app.post('/api/office/event', (req, res) => {
    try {
      const { agent, action, text, reportText } = req.body;
      const newEvent = {
        id: Date.now(),
        agent: agent || 'antigravity',
        action: action || 'WORKING',
        text: text || '',
        reportText: reportText || '',
        timestamp: new Date().toISOString()
      };
      officeEventsQueue.push(newEvent);
      if (officeEventsQueue.length > 50) officeEventsQueue.shift();
      res.json({ success: true, event: newEvent });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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
      dbMaxMb: 5000,
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

  // API to archive Acceptance Document & Form 08a directly to D:\Aerobic\Hợp Đồng 2023-2026
  app.post('/api/admin/save-acceptance-docs', async (req, res) => {
    try {
      const { schoolName, reportMonth, acceptanceBase64, form08aBase64, acceptanceText, files } = req.body;
      
      const sanitizeFilename = (name: string) => (name || 'Truong').replace(/[\\/:*?"<>|]/g, '_').trim();
      const safeSchoolName = sanitizeFilename(schoolName);
      const safeMonth = (reportMonth || '2026-07').trim();

      // Check target base path: D:\Aerobic\Hợp Đồng 2023-2026
      let targetBasePath = 'D:\\Aerobic\\Hợp Đồng 2023-2026';
      if (!fs.existsSync('D:\\Aerobic')) {
        targetBasePath = path.join(process.cwd(), 'saved_acceptance_docs');
      }

      // School subfolder: D:\Aerobic\Hợp Đồng 2023-2026\Bảng Nghiệm Thu & 8a\[Tên_Trường]\
      const schoolDir = path.join(targetBasePath, 'Bảng Nghiệm Thu & 8a', safeSchoolName);
      const monthDir = path.join(targetBasePath, 'Bảng Nghiệm Thu & 8a', `Tháng ${safeMonth}`);

      fs.mkdirSync(schoolDir, { recursive: true });
      fs.mkdirSync(monthDir, { recursive: true });

      const savedPaths: string[] = [];

      // Save files array if provided
      if (Array.isArray(files)) {
        for (const file of files) {
          if (file.filename && file.base64) {
            const buf = Buffer.from(file.base64, 'base64');
            const file1 = path.join(schoolDir, file.filename);
            const file2 = path.join(monthDir, `${safeSchoolName}_${file.filename}`);
            fs.writeFileSync(file1, buf);
            fs.writeFileSync(file2, buf);
            savedPaths.push(file1);
          }
        }
      }

      // Save acceptance docx
      if (acceptanceBase64) {
        const name1 = `BBNT_Thang_${safeMonth}_${safeSchoolName}.docx`;
        const buf = Buffer.from(acceptanceBase64, 'base64');
        const p1 = path.join(schoolDir, name1);
        const p2 = path.join(monthDir, name1);
        fs.writeFileSync(p1, buf);
        fs.writeFileSync(p2, buf);
        savedPaths.push(p1);
      }

      // Save Form 08a docx
      if (form08aBase64) {
        const name2 = `Mau08a_Thang_${safeMonth}_${safeSchoolName}.docx`;
        const buf = Buffer.from(form08aBase64, 'base64');
        const p1 = path.join(schoolDir, name2);
        const p2 = path.join(monthDir, name2);
        fs.writeFileSync(p1, buf);
        fs.writeFileSync(p2, buf);
        savedPaths.push(p1);
      }

      // Save raw text file
      if (acceptanceText) {
        const name3 = `BBNT_Thang_${safeMonth}_${safeSchoolName}.txt`;
        const p1 = path.join(schoolDir, name3);
        fs.writeFileSync(p1, acceptanceText, 'utf-8');
        savedPaths.push(p1);
      }

      res.json({
        status: 'success',
        message: `Đã lưu thành công vào D:\\Aerobic\\Hợp Đồng 2023-2026\\Bảng Nghiệm Thu & 8a\\${safeSchoolName}\\`,
        savedPaths,
        targetDir: schoolDir
      });
    } catch (err: any) {
      console.error('Failed to save acceptance docs:', err);
      res.status(500).json({ error: 'Failed to save acceptance docs', details: err.message });
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

  const getLightweightAttendanceList = async () => {
    const rawAttList = await db.select({
      id: attendance.id,
      date: attendance.date,
      scheduleId: attendance.scheduleId,
      teacherId: attendance.teacherId,
      schoolId: attendance.schoolId,
      classId: attendance.classId,
      session: attendance.session,
      checkInTime: attendance.checkInTime,
      periods: attendance.periods,
      lat: attendance.lat,
      lng: attendance.lng,
      distanceMeter: attendance.distanceMeter,
      verificationMethod: attendance.verificationMethod,
      isVerified: attendance.isVerified,
      isFlagged: attendance.isFlagged,
      flagReason: attendance.flagReason,
      confirmedByAdmin: attendance.confirmedByAdmin,
      hasSelfie: sql<boolean>`coalesce(has_selfie, false)`
    }).from(attendance);

    return rawAttList.map(att => {
      const { hasSelfie, ...rest } = att;
      return {
        ...rest,
        selfieImage: hasSelfie ? `/api/attendance/${att.id}/selfie` : ''
      };
    });
  };

  // Get All State (convenience endpoint)
  app.get('/api/state', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Trả về cache siêu tốc nếu state chưa thay đổi
    if (cachedStatePayload && cachedStateTimestamp === lastStateUpdate) {
      return res.json(cachedStatePayload);
    }

    // Force old clients to clear their cache and reload by detecting absence of new version header
    if (req.headers['x-app-version'] !== '2') {
      res.setHeader('Clear-Site-Data', '"cache", "executionContexts"');
    }

    try {
      const teachList = (await db.select().from(teachers).where(eq(teachers.isDeleted, false))).sort((a, b) => a.id.localeCompare(b.id));
      const schList = (await db.select().from(schools).where(eq(schools.isDeleted, false))).sort((a, b) => a.id.localeCompare(b.id));
      const clsList = (await db.select().from(classes).where(eq(classes.isDeleted, false))).sort((a, b) => a.id.localeCompare(b.id));
      const skdList = (await db.select().from(schedules).where(eq(schedules.isDeleted, false))).sort((a, b) => a.id.localeCompare(b.id));
      const attList = (await getLightweightAttendanceList()).sort((a, b) => a.id.localeCompare(b.id));
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

      const statePayload = {
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
      };
      cachedStatePayload = statePayload;
      cachedStateTimestamp = lastStateUpdate;
      res.json(statePayload);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve system state', details: err.message });
    }
  });

  app.post('/api/notifications/quick-broadcast', (req, res) => {
    try {
      const { title, message, targetUserId } = req.body;
      latestQuickAnnouncement = {
        id: `QA_${Date.now()}`,
        title: title || 'Thông báo từ Ban Giám Đốc',
        message: message || '',
        targetUserId: targetUserId || null,
        timestamp: new Date().toISOString()
      };
      
      sendPushNotification(targetUserId || null, {
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

  app.post('/api/school-cancellations/bulk', async (req, res) => {
    try {
      const { upsert = [], remove: delIds = [] } = req.body;
      if (delIds && delIds.length > 0) {
        for (const id of delIds) {
          await db.delete(schoolCancellations).where(eq(schoolCancellations.id, id));
        }
      }
      if (upsert && upsert.length > 0) {
        for (const item of upsert) {
          const payload = {
            id: item.id || `CAN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: String(item.date),
            scheduleId: item.scheduleId || null,
            teacherId: String(item.teacherId),
            schoolId: String(item.schoolId),
            classId: String(item.classId),
            session: String(item.session || 'morning'),
            cancellationType: String(item.cancellationType || 'notified'),
            periodsCredited: Number(item.periodsCredited) || 0.0,
            reason: String(item.reason || ''),
            createdAt: item.createdAt || new Date().toISOString()
          };
          await db.insert(schoolCancellations).values(payload).onConflictDoUpdate({
            target: schoolCancellations.id,
            set: payload
          });
        }
      }
      lastStateUpdate = Date.now();
      res.json({ success: true, count: upsert.length });
    } catch (err: any) {
      console.error('Error in bulk school cancellations:', err);
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
      const tList = await db.select().from(teachers).where(eq(teachers.isDeleted, false));
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

  // --- LEGAL PAGES FOR FACEBOOK APP REVIEW ---
  app.get('/privacy', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Chính sách quyền riêng tư - Cầu Vồng</title></head><body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; padding: 0 20px;"><h2>Chính Sách Quyền Riêng Tư - Trung Tâm Năng Khiếu Aerobic Cầu Vồng</h2><p>Hệ thống ETMS Chấm công Cầu Vồng cam kết bảo vệ thông tin cá nhân của giáo viên và người dùng. Chúng tôi chỉ thu thập số điện thoại và mã giáo viên để phục vụ mục đích thông báo lịch dạy và nhắc nhở điểm danh hàng ngày.</p><p>Hotline hỗ trợ: 0785 909 929 - Trung Tâm Năng Khiếu Aerobic Cầu Vồng.</p></body></html>`);
  });

  app.get('/terms', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Điều khoản dịch vụ - Cầu Vồng</title></head><body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; padding: 0 20px;"><h2>Điều Khoản Dịch Vụ - Trung Tâm Năng Khiếu Aerobic Cầu Vồng</h2><p>Dịch vụ hỗ trợ thông báo lịch dạy và nhắc việc chấm công cho đội ngũ giáo viên Trung tâm Cầu Vồng.</p></body></html>`);
  });

  // --- FACEBOOK MESSENGER WEBHOOK & REMINDER SERVICE ---

  async function getFacebookSettings() {
    try {
      const s = await db.select().from(appSettings).limit(1);
      const row = s[0] || {} as any;
      return {
        pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || row.fbPageAccessToken || '',
        verifyToken: process.env.FB_VERIFY_TOKEN || row.fbVerifyToken || 'CAUVONG_FB_SECRET_VERIFY_TOKEN_2026',
        pageUrl: process.env.FB_PAGE_URL || row.fbPageUrl || 'm.me/trungtamcauvong',
        autoReminder: row.fbAutoReminderEnabled !== false
      };
    } catch (e) {
      return {
        pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
        verifyToken: process.env.FB_VERIFY_TOKEN || 'CAUVONG_FB_SECRET_VERIFY_TOKEN_2026',
        pageUrl: process.env.FB_PAGE_URL || 'm.me/trungtamcauvong',
        autoReminder: true
      };
    }
  }

  
  async function sendNotificationOptInCard(psid: string) {
    const fb = await getFacebookSettings();
    if (!fb.pageAccessToken) return { success: false, error: 'Chưa cấu hình Page Access Token' };
    try {
      const resp = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${fb.pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: psid },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'notification_messages',
                title: 'Nhận thông báo nhắc lịch dạy Cầu Vồng',
                payload: 'OPTIN_DAILY_ATTENDANCE'
              }
            }
          }
        })
      });
      const data = await resp.json();
      return { success: !data.error, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async function sendFacebookMessage(psid: string, text: string) {
    const fb = await getFacebookSettings();
    if (!fb.pageAccessToken) {
      console.warn('[FB] Không có FB_PAGE_ACCESS_TOKEN để gửi tin');
      return { success: false, error: 'Chưa cấu hình Page Access Token' };
    }
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${fb.pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: psid },
          message: { text }
        })
      });
      const resData = await resp.json();
      if (resData.error) {
        return { success: false, error: resData.error.message, code: resData.error.code, subcode: resData.error.error_subcode, data: resData };
      }
      return { success: true, data: resData };
    } catch (err: any) {
      console.error('[FB Send Error]:', err);
      return { success: false, error: err.message };
    }
  }

  function getTeacherSalutation(teacher: { id?: string; name: string }) {
    const name = teacher.name || '';
    const id = teacher.id || '';
    const isMale = id.includes('MR') || id.includes('GV001') || id.includes('GĐ_MR') || 
                   name.toLowerCase().includes('mr') || name.toLowerCase().includes('thầy') ||
                   name.toLowerCase().includes('bảo') || name.toLowerCase().includes('tuấn') || 
                   name.toLowerCase().includes('danh') || name.toLowerCase().includes('thanh an');

    const cleanName = name
      .replace(/^(Mr\.|Ms\.|Mr|Ms|MS|Thầy|Cô)\s*/i, '')
      .trim();

    if (isMale) {
      return {
        title: 'thầy',
        Title: 'Thầy',
        greeting: `thầy ${cleanName}`
      };
    } else {
      return {
        title: 'cô',
        Title: 'Cô',
        greeting: `cô ${cleanName}`
      };
    }
  }

  async function handleFacebookTeacherEvent(senderPsid: string, ref?: string, messageText?: string) {
    try {
      const teachList = await db.select().from(teachers).where(eq(teachers.isDeleted, false));
      let matchedTeacher: any = null;

      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        matchedTeacher = teachList.find(t => t.id.toUpperCase() === cleanRef || cleanRef.includes(t.id.toUpperCase()));
      }

      if (!matchedTeacher && messageText) {
        const cleanDigits = messageText.replace(/[^0-9]/g, '');
        if (cleanDigits.length >= 9) {
          matchedTeacher = teachList.find(t => {
            const tPhone = (t.phone || '').replace(/[^0-9]/g, '');
            return tPhone.length >= 9 && (tPhone === cleanDigits || tPhone.endsWith(cleanDigits) || cleanDigits.endsWith(tPhone));
          });
        }
      }

      if (!matchedTeacher && messageText) {
        const upperMsg = messageText.trim().toUpperCase();
        matchedTeacher = teachList.find(t => t.id.toUpperCase() === upperMsg || (upperMsg.length >= 4 && t.id.toUpperCase().includes(upperMsg)));
      }

      // ĐẶC QUYỀN RIÊNG DÀNH CHO CÔ CHÂU (HR SẮP LỊCH & ĐIỀU PHỐI GIÁO VIÊN):
      const linkedTeacher = teachList.find(t => t.facebookPsid === senderPsid);
      const isChauHR = isHrDispatchUser(senderPsid, linkedTeacher, matchedTeacher);

      if (isChauHR) {
        // Cập nhật PSID cho cô Châu nếu chưa lưu
        const chauTeacher = linkedTeacher || matchedTeacher || teachList.find(t => t.id === 'GV_MSCHAU');
        if (chauTeacher && chauTeacher.facebookPsid !== senderPsid) {
          await db.update(teachers).set({
            facebookPsid: senderPsid,
            facebookConnectedAt: new Date().toISOString()
          }).where(eq(teachers.id, chauTeacher.id));
        }

        // Xử lý tin nhắn điều phối của HR Cô Châu
        if (messageText) {
          console.log(`[HR Dispatch] Nhận tin nhắn điều phối từ HR Cô Châu (PSID: ${senderPsid}): "${messageText}"`);
          const handled = await handleHrDispatchMessage({
            senderPsid,
            messageText,
            teachList,
            db,
            sendFacebookMessage,
            sendPushNotification,
            onStateUpdated: () => { lastStateUpdate = Date.now(); }
          });
          if (handled) return;
        }
      }

      if (matchedTeacher) {
        const isAlreadyLinked = matchedTeacher.facebookPsid === senderPsid;
        if (isAlreadyLinked) {
          // Nếu giáo viên bấm vào link kích hoạt thông báo (hoặc gửi tin kích hoạt)
          if (ref && (ref.includes('BAT_THONG_BAO') || ref.includes('THONG_BAO'))) {
            const salute = getTeacherSalutation(matchedTeacher);
            await sendFacebookMessage(senderPsid, `Chào ${salute.greeting}! Hãy bấm nút [BẬT THÔNG BÁO] ngay bên dưới để kích hoạt chuông báo nhắc lịch dạy tự động qua Messenger nhé:`);
            await sendNotificationOptInCard(senderPsid);
            return;
          }
          // Bất kỳ tin nhắn nào khác: cũng gửi kèm Thẻ Bật Thông Báo để giáo viên bật nếu chưa có token
          if (!matchedTeacher.notificationToken) {
            await sendNotificationOptInCard(senderPsid);
          }
          return;
        }

        // Lần đầu giáo viên gửi đúng SĐT -> Lưu PSID và gửi đúng 1 tin nhắn xác nhận duy nhất!
        let fbUserName = '';
        try {
          const fb = await getFacebookSettings();
          if (fb.pageAccessToken) {
            const profileResp = await fetch(`https://graph.facebook.com/v19.0/${senderPsid}?fields=first_name,last_name,name&access_token=${fb.pageAccessToken}`);
            const profileData = await profileResp.json();
            if (profileData.name) fbUserName = profileData.name;
          }
        } catch (e) {}

        await db.update(teachers).set({
          facebookPsid: senderPsid,
          facebookName: fbUserName || matchedTeacher.facebookName || '',
          facebookConnectedAt: new Date().toISOString()
        }).where(eq(teachers.id, matchedTeacher.id));

        lastStateUpdate = Date.now();

        const salute = getTeacherSalutation(matchedTeacher);
        const welcomeText = `🎉 Chào mừng ${salute.greeting}!\n\n` +
          `✅ Hệ thống Chấm công Cầu Vồng đã liên kết thành công tài khoản Facebook Messenger của ${salute.title} (Mã: ${matchedTeacher.id}).\n\n` +
          `Từ nay, hệ thống sẽ tự động nhắc nhở lịch dạy và chấm công hàng ngày qua đây để ${salute.title} không bị sót ca nhé! Chúc ${salute.title} có những buổi dạy thật vui vẻ và tràn đầy năng lượng! ❤️`;

        await sendFacebookMessage(senderPsid, welcomeText);
        console.log(`[FB Linked] Giáo viên ${matchedTeacher.name} (${matchedTeacher.id}) đã kết nối PSID: ${senderPsid}`);
        return;
      }

      // NẾU KHÔNG PHẢI GIÁO VIÊN TRONG HỆ THỐNG:
      // Đây là khách hàng nhắn tin hỏi tư vấn, phụ huynh hỏi lớp, hoặc tin nhắn thông thường.
      // Bot TUYỆT ĐỐI KHÔNG CAN THIỆP / KHÔNG TRẢ LỜI để Admin trực tiếp tư vấn trả lời khách hàng!
      return;
    } catch (err: any) {
      console.error('[FB Handler Error]:', err);
    }
  }

  // Webhook Verification (Meta kiểm tra khi kết nối Webhook vào Fanpage App)
  app.get('/api/webhook/facebook', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const fb = await getFacebookSettings();

    if (mode && token) {
      if (mode === 'subscribe' && token === fb.verifyToken) {
        console.log('[FB Webhook] Xác thực Webhook thành công!');
        return res.status(200).send(challenge);
      } else {
        console.warn('[FB Webhook] Sai verify token:', token);
        return res.sendStatus(403);
      }
    }
    res.sendStatus(400);
  });

  // Webhook Event Receiver (Nhận tin nhắn, postback, referral)
  app.post('/api/webhook/facebook', async (req, res) => {
    const body = req.body;
    if (body.object === 'page') {
      res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry || []) {
        for (const webhookEvent of entry.messaging || []) {
          const senderPsid = webhookEvent.sender?.id;
          if (!senderPsid) continue;

          let ref = webhookEvent.referral?.ref ||
                    webhookEvent.postback?.referral?.ref ||
                    webhookEvent.postback?.payload ||
                    webhookEvent.optin?.ref;

          const messageText = webhookEvent.message?.text?.trim();

          // Xử lý sự kiện giáo viên bấm nút [BẬT THÔNG BÁO] (Opt-in Token của Meta)
          if (webhookEvent.optin?.notification_messages_token) {
            const notifToken = webhookEvent.optin.notification_messages_token;
            const expiry = webhookEvent.optin.token_expiry_timestamp;
            try {
              await db.update(teachers).set({
                notificationToken: notifToken,
                notificationTokenExpires: String(expiry || '')
              }).where(eq(teachers.facebookPsid, senderPsid));
              console.log(`[Optin Success] Đã lưu notification_token cho PSID: ${senderPsid}`);
              await sendFacebookMessage(senderPsid, '🎉 Tuyệt vời! Thầy/Cô đã bật thông báo thành công.\n\nTừ nay, hệ thống Chấm công Cầu Vồng sẽ tự động gửi tin nhắn chuông báo nhắc việc qua Messenger hàng ngày mà không bao giờ lo bị trễ ca hay mất chuyên cần nhé! ❤️');
            } catch (err: any) {
              console.error('[Optin Token Save Error]:', err.message);
            }
          }

          // Nếu có referral ref BAT_THONG_BAO mà chưa có matchedTeacher trong event thì tìm theo senderPsid
          if (ref && ref.includes('BAT_THONG_BAO')) {
            const teachList = await db.select().from(teachers).where(eq(teachers.isDeleted, false));
            const existingT = teachList.find(t => t.facebookPsid === senderPsid);
            if (existingT) {
              await db.update(teachers).set({
                notificationToken: 'ACTIVATED_20261026'
              }).where(eq(teachers.id, existingT.id));
              const salute = getTeacherSalutation(existingT);
              await sendFacebookMessage(senderPsid, `Chào ${salute.greeting}! Hãy bấm nút [BẬT THÔNG BÁO] ngay bên dưới để kích hoạt chuông báo nhắc lịch dạy tự động qua Messenger nhé:`);
              await sendNotificationOptInCard(senderPsid);
              continue;
            }
          }

          await handleFacebookTeacherEvent(senderPsid, ref, messageText);
        }
      }
    } else {
      res.sendStatus(404);
    }
  });

  // API đánh dấu giáo viên đã tham gia bật thông báo
  app.post('/api/teachers/:id/joined-notification', async (req, res) => {
    try {
      const { id } = req.params;
      await db.update(teachers).set({
        notificationToken: 'ACTIVATED_20261026'
      }).where(eq(teachers.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API kiểm tra trạng thái Facebook & Test gửi tin
  app.get('/api/facebook/status', async (req, res) => {
    try {
      const fb = await getFacebookSettings();
      const linkedTeachers = await db.select().from(teachers).where(and(eq(teachers.isDeleted, false), ne(teachers.facebookPsid, '')));
      res.json({
        hasToken: !!fb.pageAccessToken,
        pageUrl: fb.pageUrl,
        verifyToken: fb.verifyToken,
        webhookUrl: 'https://vudoancauvong.duckdns.org/api/webhook/facebook',
        linkedCount: linkedTeachers.length,
        linkedTeachers: linkedTeachers.map(t => ({ id: t.id, name: t.name, fbName: t.facebookName, connectedAt: t.facebookConnectedAt }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/facebook/test-send', async (req, res) => {
    try {
      const { teacherId, text } = req.body;
      const t = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
      if (t.length === 0) return res.status(404).json({ error: 'Không tìm thấy giáo viên' });
      if (!t[0].facebookPsid) return res.status(400).json({ error: 'Giáo viên này chưa kết nối Messenger' });

      const msg = text || `🔔 Thử nghiệm gửi tin nhắn từ Hệ thống Cầu Vồng tới cô ${t[0].name} thành công!`;
      const result = await sendFacebookMessage(t[0].facebookPsid, msg);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/facebook/unlink/:teacherId', async (req, res) => {
    try {
      const { teacherId } = req.params;
      await db.update(teachers).set({
        facebookPsid: '',
        facebookName: '',
        facebookConnectedAt: ''
      }).where(eq(teachers.id, teacherId));
      lastStateUpdate = Date.now();
      res.json({ success: true, message: 'Đã hủy liên kết Facebook của giáo viên' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  // SECURE SCHOOL PAYROLL API FOR ADMIN
  app.post('/api/admin/school-payroll', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Thiếu thông tin đăng nhập xác thực!' });
      }

      // Verify admin credentials
      const match = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (match.length === 0 || match[0].password !== password || match[0].role !== 'admin' || match[0].isDeleted) {
        return res.status(403).json({ error: 'Truy cập bị từ chối: Chỉ Admin mới có quyền xem thông tin này.' });
      }

      const fs = await import('fs');
      const csvPath = 'D:\\Aerobic\\Bang Luong Cty nam 2016-2017-2018\\2026\\2026.csv';

      if (!fs.existsSync(csvPath)) {
        return res.json({ success: true, localFileExists: false, data: [] });
      }

      const fileContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = fileContent.split(/\r?\n/);
      const parsedData: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split on comma except when inside quotes
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length < 3) continue;

        const schoolName = cols[0].replace(/^"|"$/g, '').trim();
        if (!schoolName) continue;

        const classesCountStr = cols[1].replace(/^"|"$/g, '').trim();
        const hourlyRateStr = cols[2].replace(/^"|"$/g, '').trim();
        const totalFeeStr = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : '';
        const notes = cols[4] ? cols[4].replace(/^"|"$/g, '').trim() : '';

        parsedData.push({
          schoolName,
          classesCount: parseFloat(classesCountStr) || 0,
          rawHourlyRate: hourlyRateStr,
          totalFee: parseFloat(totalFeeStr) || 0,
          notes
        });
      }

      res.json({ success: true, localFileExists: true, data: parsedData });
    } catch (err: any) {
      console.error('Error reading school payroll file:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // SECURE API TO SAVE SCHOOL RATES & PAYROLL DETAILS
  app.post('/api/admin/save-school-rates', async (req, res) => {
    try {
      const { username, password, schoolRates } = req.body;
      if (!username) {
        return res.status(400).json({ error: 'Thiếu thông tin đăng nhập xác thực!' });
      }

      // Verify admin credentials
      const match = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (match.length === 0 || match[0].role !== 'admin' || match[0].isDeleted) {
        return res.status(403).json({ error: 'Truy cập bị từ chối: Chỉ Admin mới có quyền lưu thông tin này.' });
      }
      if (password && match[0].password !== password) {
        return res.status(403).json({ error: 'Mật khẩu không đúng!' });
      }

      if (!Array.isArray(schoolRates)) {
        return res.status(400).json({ error: 'Dữ liệu không đúng định dạng!' });
      }

      // Update schools in database
      for (const rate of schoolRates) {
        const { schoolId, tuitionRate, isInvoice, classesCount } = rate;
        if (!schoolId) continue;
        
        await db.update(schools)
          .set({
            tuitionRate: tuitionRate || '',
            isInvoice: !!isInvoice,
            classesCount: parseFloat(classesCount) || 0
          })
          .where(eq(schools.id, schoolId));
      }

      // Fetch updated schools to return
      const updatedSchools = await db.select().from(schools).where(eq(schools.isDeleted, false));
      res.json({ success: true, schools: updatedSchools });
    } catch (err: any) {
      console.error('Error saving school rates:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // SECURE API TO MERGE TWO SCHOOLS TOGETHER
  app.post('/api/admin/merge-schools', async (req, res) => {
    try {
      const { username, password, sourceSchoolId, targetSchoolId } = req.body;
      if (!username || !sourceSchoolId || !targetSchoolId) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc!' });
      }

      // Verify admin credentials
      const match = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (match.length === 0 || match[0].role !== 'admin' || match[0].isDeleted) {
        return res.status(403).json({ error: 'Truy cập bị từ chối: Chỉ Admin mới có quyền thực hiện chức năng này.' });
      }
      if (password && match[0].password !== password) {
        return res.status(403).json({ error: 'Mật khẩu không đúng!' });
      }

      // 1. Update schedules: schoolId = targetSchoolId WHERE schoolId = sourceSchoolId
      await db.update(schedules)
        .set({ schoolId: targetSchoolId })
        .where(eq(schedules.schoolId, sourceSchoolId));

      // 2. Update classes: schoolId = targetSchoolId WHERE schoolId = sourceSchoolId
      await db.update(classes)
        .set({ schoolId: targetSchoolId })
        .where(eq(classes.schoolId, sourceSchoolId));

      // 3. Update attendance: schoolId = targetSchoolId WHERE schoolId = sourceSchoolId
      await db.update(attendance)
        .set({ schoolId: targetSchoolId })
        .where(eq(attendance.schoolId, sourceSchoolId));

      // 4. Mark source school as deleted
      await db.update(schools)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date().toISOString() 
        })
        .where(eq(schools.id, sourceSchoolId));

      // Fetch and return the updated lists to keep parent state in sync
      const updatedSchools = await db.select().from(schools).where(eq(schools.isDeleted, false));
      const updatedClasses = await db.select().from(classes).where(eq(classes.isDeleted, false));
      const updatedSchedules = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
      const updatedAttendance = await getLightweightAttendanceList();

      res.json({ 
        success: true, 
        schools: updatedSchools, 
        classes: updatedClasses, 
        schedules: updatedSchedules,
        attendance: updatedAttendance
      });
    } catch (err: any) {
      console.error('Error merging schools:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // TEACHERS API
  app.get('/api/teachers', async (req, res) => {
    try {
      const resList = await db.select().from(teachers).where(eq(teachers.isDeleted, false));
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

      if (data && data.status === 'approved') {
        triggerFacebookMessengerChangeNotifications([data]);
      }
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

      if (data && data.status === 'approved') {
        triggerFacebookMessengerChangeNotifications([{ id, ...data }]);
      }
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
      const resList = await db.select().from(schools).where(eq(schools.isDeleted, false));
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
      const resList = await db.select().from(classes).where(eq(classes.isDeleted, false));
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

      // Fetch all schedules for both source and target classes
      const sourceSchedulesList = await db.select().from(schedules).where(eq(schedules.classId, sourceClassId));
      const targetSchedulesList = await db.select().from(schedules).where(eq(schedules.classId, targetClassId));

      const activeSourceSchedules = sourceSchedulesList.filter(s => !s.isDeleted);
      const activeTargetSchedules = targetSchedulesList.filter(s => !s.isDeleted);

      for (const sc of activeSourceSchedules) {
        const tc = activeTargetSchedules.find(t => 
          t.dayOfWeek === sc.dayOfWeek && 
          t.session === sc.session && 
          t.teacherId === sc.teacherId && 
          t.schoolId === sc.schoolId
        );

        if (tc) {
          // Re-link attendance to target schedule and soft delete source schedule
          await db.update(attendance).set({ scheduleId: tc.id, classId: targetClassId }).where(eq(attendance.scheduleId, sc.id));
          await db.update(schedules).set({ 
            isDeleted: true, 
            deletedAt: new Date().toISOString() 
          }).where(eq(schedules.id, sc.id));
        } else {
          // No duplicate. Just update classId to targetClassId
          await db.update(schedules).set({ classId: targetClassId }).where(eq(schedules.id, sc.id));
        }
      }

      // Also update any remaining attendance records
      await db.update(attendance).set({ classId: targetClassId }).where(eq(attendance.classId, sourceClassId));

      // Update school cancellations
      await db.update(schoolCancellations).set({ classId: targetClassId }).where(eq(schoolCancellations.classId, sourceClassId));

      // Delete source class
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
      const resList = await db.select().from(schedules).where(eq(schedules.isDeleted, false));
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
      const resList = await getLightweightAttendanceList();
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


  async function triggerFacebookMessengerChangeNotifications(items: any[]) {
    try {
      if (!items || items.length === 0) return;
      const approvedItems = items.filter(i => i && i.status === 'approved');
      if (approvedItems.length === 0) return;

      const [teachList, allSchools, allClasses, allSchedules] = await Promise.all([
        db.select().from(teachers).where(eq(teachers.isDeleted, false)),
        db.select().from(schools).where(eq(schools.isDeleted, false)),
        db.select().from(classes).where(eq(classes.isDeleted, false)),
        db.select().from(schedules).where(eq(schedules.isDeleted, false))
      ]);

      await notifyApprovedChangesViaMessenger({
        changes: approvedItems,
        teachList,
        allSchools,
        allClasses,
        allSchedules,
        sendFacebookMessage
      });
    } catch (e: any) {
      console.error('[FB Change Notify Error]:', e.message);
    }
  }

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

        // Tự động gửi tin nhắn Facebook Messenger cho cả Giáo viên nghỉ và Giáo viên dạy thay
        triggerFacebookMessengerChangeNotifications(upsert);
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

  // EVENT POLLS API (20/11 & Special Events)
  app.get('/api/polls/:pollId', async (req, res) => {
    try {
      const { pollId } = req.params;

      if (pollId === 'party_20_11_2026') {
        const votesRes = await db.execute(sql`
          SELECT id, poll_id, teacher_id, teacher_name, option_id, option_title, 
                 COALESCE(guest_count, 0) as guest_count, COALESCE(note, '') as note, 
                 created_at, updated_at 
          FROM event_polls 
          WHERE poll_id = ${pollId}
          ORDER BY created_at DESC
        `);
        const rows = (votesRes as any).rows || [];
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

        rows.forEach((r: any) => {
          counts[r.option_id] = (counts[r.option_id] || 0) + 1;
        });

        const attendingCount = counts[1] || 0;
        const notAttendingCount = counts[2] || 0;
        const notSureCount = counts[3] || 0;
        const totalSeats = attendingCount; // Mỗi giáo viên tham gia = 1 suất ghế phòng VIP

        return res.json({
          pollId,
          eventTitle: 'Tiệc Họp Mặt & Tri Ân Ngày Nhà Giáo Việt Nam 20/11',
          eventTime: '18:00 Thứ Bảy, 14/11/2026',
          deadline: '2026-11-05T23:59:59+07:00',
          isClosed: false,
          totalVotes: rows.length,
          counts,
          attendingCount,
          totalSeats,
          notAttendingCount,
          notSureCount,
          votes: rows
        });
      }

      // Poll giai đoạn 1 (đã đóng)
      const votesRes = await db.execute(sql`
        SELECT id, poll_id, teacher_id, teacher_name, option_id, option_title, created_at 
        FROM event_polls 
        WHERE poll_id = ${pollId}
        ORDER BY created_at DESC
      `);
      const rows = (votesRes as any).rows || [];
      const counts: Record<number, number> = {};
      rows.forEach((r: any) => {
        counts[r.option_id] = (counts[r.option_id] || 0) + 1;
      });
      res.json({
        pollId,
        isClosed: true,
        winningOptionId: 2,
        winningOptionTitle: 'Đi ăn nhà hàng có máy chiếu và hát karaoke',
        totalVotes: rows.length,
        counts,
        votes: rows
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/polls/:pollId/vote', async (req, res) => {
    try {
      const { pollId } = req.params;

      if (pollId === 'party_20_11_2026') {
        const { teacher_id, teacher_name, option_id, option_title, guest_count, note } = req.body;

        if (!teacher_id || !option_id) {
          return res.status(400).json({ error: 'Thiếu thông tin giáo viên hoặc lựa chọn bình chọn' });
        }

        const nowIso = new Date().toISOString();
        const safeGuestCount = 0; // Thầy An chỉ đạo đi 1 mình, không kèm người thân
        const safeNote = String(note || '').trim();

        // Kiểm tra xem giáo viên đã bình chọn trong poll này chưa
        const existingVote = await db.execute(sql`
          SELECT id FROM event_polls 
          WHERE poll_id = ${pollId} AND teacher_id = ${teacher_id} 
          LIMIT 1
        `);
        const existingRows = (existingVote as any).rows || [];

        if (existingRows.length > 0) {
          const voteId = existingRows[0].id;
          await db.execute(sql`
            UPDATE event_polls 
            SET option_id = ${option_id}, 
                option_title = ${option_title || ''}, 
                guest_count = ${safeGuestCount}, 
                note = ${safeNote}, 
                teacher_name = ${teacher_name || ''}, 
                updated_at = ${nowIso}
            WHERE id = ${voteId}
          `);
        } else {
          const newId = `rsvp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          await db.execute(sql`
            INSERT INTO event_polls (id, poll_id, teacher_id, teacher_name, option_id, option_title, guest_count, note, created_at, updated_at)
            VALUES (${newId}, ${pollId}, ${teacher_id}, ${teacher_name || ''}, ${option_id}, ${option_title || ''}, ${safeGuestCount}, ${safeNote}, ${nowIso}, ${nowIso})
          `);
        }

        return res.json({ 
          success: true, 
          message: 'Bình chọn tham gia tiệc 20/11 thành công! Cảm ơn Thầy/Cô.' 
        });
      }

      return res.status(403).json({ 
        error: 'Bình chọn sự kiện này đã chính thức khép lại. Cảm ơn quý Thầy/Cô đã tham gia!' 
      });
    } catch (err: any) {
      console.error('[Poll Vote Error]', err);
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
        } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
    // Static assets will serve sw.js from distPath automatically
    
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // TỰ ĐỘNG PHÁT HIỆN & CẢNH BÁO GIÁO VIÊN ĐI TRỄ QUA MESSENGER
  // NGUYÊN TẮC: TUYỆT ĐỐI KHÔNG NHẮC TRƯỚC GIỜ HỌC. CHỈ KHI NÀO QUÁ GIỜ VÀO LỚP MÀ CHƯA CHECK-IN MỚI CẢNH BÁO!
  const sentLateWarningsToday = new Set<string>();
  let lastScanDateStr = "";

  function parseScheduleStartTime(sessionStr: string) {
    if (!sessionStr) return null;
    const clean = String(sessionStr).toLowerCase().trim();
    
    // Kiểm tra từ khoá chỉ buổi
    const hasMorningWord = clean.includes("sáng") || clean.includes("sang") || clean.includes("morning") || clean.includes("am");
    const hasAfternoonWord = clean.includes("chiều") || clean.includes("chieu") || clean.includes("tối") || clean.includes("toi") || clean.includes("pm");

    // Bắt giờ dạng 8:15, 08:15, 8h30, 8h, 14:00, 14h, v.v.
    const timeMatch = clean.match(/(\d{1,2})[:h](\d{2})?/) || clean.match(/(\d{1,2})\s*h/);
    if (!timeMatch) return null;

    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

    // Chuẩn hoá giờ theo đặc thù dạy mầm non:
    if (hasAfternoonWord) {
      if (hour < 12) hour += 12; // Chiều 2h -> 14h, Chiều 3h30 -> 15h30
    } else if (hasMorningWord) {
      // Giữ nguyên buổi sáng (< 12)
    } else {
      // Không ghi rõ sáng/chiều:
      // Giờ từ 1 -> 6 mặc định là buổi chiều (13h -> 18h)
      // Giờ từ 7 -> 12 mặc định là buổi sáng (07:00 -> 12:00)
      if (hour >= 1 && hour <= 6) {
        hour += 12;
      }
    }

    return { hour, minute, totalMinutes: hour * 60 + minute };
  }

  async function autoScanAndWarnLateTeachers() {
    try {
      const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
      const currentHour = nowVN.getUTCHours();
      const currentMinute = nowVN.getUTCMinutes();
      const currentTotalMin = currentHour * 60 + currentMinute;
      const todayStr = nowVN.toISOString().split("T")[0];
      const jsDay = nowVN.getUTCDay();
      const currentDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;

      // Tự động dọn dẹp cache cảnh báo khi sang ngày mới
      if (lastScanDateStr !== todayStr) {
        sentLateWarningsToday.clear();
        lastScanDateStr = todayStr;
      }

      // Kiểm tra cấu hình Facebook nhắc nhở
      const fbSettings = await getFacebookSettings();
      if (fbSettings.autoReminder === false) return;

      // Khung giờ dạy: Sáng từ 07:30 -> 11:45 và Chiều từ 13:30 -> 17:30
      const isTeachingHours = (currentTotalMin >= 7 * 60 + 30 && currentTotalMin <= 11 * 60 + 45) ||
                              (currentTotalMin >= 13 * 60 + 30 && currentTotalMin <= 17 * 60 + 30);
      if (!isTeachingHours) return;

      const [todaySchedules, todayAttendance, allTeachers, allSchools, allClasses, todayCancellations, todayRequests] = await Promise.all([
        db.select().from(schedules).where(and(eq(schedules.dayOfWeek, currentDayOfWeek), eq(schedules.isDeleted, false))),
        db.select().from(attendance).where(eq(attendance.date, todayStr)),
        db.select().from(teachers).where(eq(teachers.isDeleted, false)),
        db.select().from(schools).where(eq(schools.isDeleted, false)),
        db.select().from(classes).where(eq(classes.isDeleted, false)),
        db.select().from(schoolCancellations).where(eq(schoolCancellations.date, todayStr)),
        db.select().from(changeRequests).where(eq(changeRequests.date, todayStr))
      ]);

      const teacherMap = new Map(allTeachers.map(t => [t.id, t]));
      const schoolMap = new Map(allSchools.map(s => [s.id, s]));
      const classMap = new Map(allClasses.map(c => [c.id, c]));

      // 1. Nhóm các ca đã check-in hôm nay
      const checkedSet = new Set<string>();
      todayAttendance.forEach(a => {
        checkedSet.add(`${a.teacherId}_${a.schoolId}_${a.classId}`);
        if (a.scheduleId) checkedSet.add(`${a.teacherId}_${a.scheduleId}`);
      });

      // 2. Nhóm các ca trường báo nghỉ hôm nay
      const cancelledScheduleIds = new Set<string>();
      const cancelledClassKeys = new Set<string>();
      todayCancellations.forEach(c => {
        if (c.scheduleId) cancelledScheduleIds.add(c.scheduleId);
        cancelledClassKeys.add(`${c.schoolId}_${c.classId}`);
      });

      // 3. Nhóm các đơn xin nghỉ / dạy thay đã duyệt
      const approvedLeaveScheduleIds = new Set<string>();
      const substituteMap = new Map<string, string>(); // scheduleId -> substituteTeacherId
      todayRequests.forEach(r => {
        if (r.status === 'approved') {
          const targetIds = r.targetScheduleId ? r.targetScheduleId.split(',').map(id => id.trim()).filter(Boolean) : [];
          targetIds.forEach(scId => {
            approvedLeaveScheduleIds.add(scId);
            if (r.targetTeacherId) {
              substituteMap.set(scId, r.targetTeacherId);
            }
          });
        }
      });

      for (const s of todaySchedules) {
        // Bỏ qua nếu ca này thuộc trường/lớp đã báo nghỉ
        if (cancelledScheduleIds.has(s.id) || cancelledClassKeys.has(`${s.schoolId}_${s.classId}`)) continue;

        const timeInfo = parseScheduleStartTime(s.session);
        if (!timeInfo) continue;

        // CHỈ CẢNH BÁO KHI ĐÃ QUÁ GIỜ VÀO LỚP TỪ 3 PHÚT TRỞ LÊN (VÀ KHÔNG QUÁ 40 PHÚT)
        const delayMin = currentTotalMin - timeInfo.totalMinutes;
        if (delayMin < 3 || delayMin > 40) continue;

        // Xác định giáo viên chịu trách nhiệm ca này (ưu tiên giáo viên dạy thay nếu có đơn duyệt)
        let actualTeacherId = s.teacherId;
        if (approvedLeaveScheduleIds.has(s.id)) {
          const subId = substituteMap.get(s.id);
          if (subId) {
            actualTeacherId = subId; // Chuyển sang nhắc giáo viên dạy thay
          } else {
            continue; // Giáo viên nghỉ phép hợp lệ và không có người dạy thay -> không nhắc
          }
        }

        // Kiểm tra xem giáo viên chịu trách nhiệm đã check-in ca này chưa
        const checkKey1 = `${actualTeacherId}_${s.schoolId}_${s.classId}`;
        const checkKey2 = `${actualTeacherId}_${s.id}`;
        if (checkedSet.has(checkKey1) || checkedSet.has(checkKey2)) continue;

        // Kiểm tra xem đã gửi cảnh báo cho ca này hôm nay chưa (mỗi ca chỉ cảnh báo 1 lần)
        const warnKey = `LATE_WARN_${todayStr}_${s.id}_${actualTeacherId}`;
        if (sentLateWarningsToday.has(warnKey)) continue;

        const t = teacherMap.get(actualTeacherId);
        if (!t || !t.facebookPsid) continue;

        const salute = getTeacherSalutation(t);
        const sName = schoolMap.get(s.schoolId)?.name || "Trường đối tác";
        const cName = classMap.get(s.classId)?.name || "Lớp mầm non";
        const startStr = `${timeInfo.hour.toString().padStart(2, "0")}:${timeInfo.minute.toString().padStart(2, "0")}`;

        const isSubMsg = actualTeacherId !== s.teacherId ? " (Ca dạy thay)" : "";
        const lateMsg = `⚠️ [CẢNH BÁO ĐIỂM DANH TRỄ]\nChào ${salute.Title} ${t.name}!\n\nCa dạy của ${salute.Title}${isSubMsg} quy định bắt đầu lúc ${startStr} (${s.session}):\n🏫 Trường: ${sName}\n👶 Lớp: ${cName}\n\nHiện tại đã quá giờ vào lớp ${delayMin} phút nhưng hệ thống chưa ghi nhận lượt check-in của ${salute.Title}.\n${salute.Title} vui lòng mở App Chấm Công ETMS để Check-in ngay để không bị hệ thống ghi nhận vi phạm chuyên cần nhé!`;

        try {
          const res = await sendFacebookMessage(t.facebookPsid, lateMsg);
          if (res.success) {
            sentLateWarningsToday.add(warnKey);
            console.log(`[Late-Warning] Đã gửi cảnh báo đi trễ ${delayMin}p cho ${salute.Title} ${t.name} (Ca ${s.session} tại ${sName} - ${cName})`);
          } else {
            console.warn(`[Late-Warning FB Notice] Facebook chưa gửi được tới ${salute.Title} ${t.name} (${res.error || 'Cần tương tác lại'}), đã kích hoạt thông báo App.`);
          }

          // Bảo đảm kép: Luôn gửi thông báo khẩn cấp vào App ETMS của giáo viên
          await db.insert(systemNotifications).values({
            id: `WARN_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            targetTeacherId: actualTeacherId,
            type: 'warning',
            title: '⚠️ CẢNH BÁO ĐIỂM DANH TRỄ',
            message: `Ca dạy ${s.session} tại ${sName} (${cName}) đã quá giờ ${delayMin} phút nhưng hệ thống chưa ghi nhận lượt check-in. Vui lòng mở App Check-in ngay!`,
            timestamp: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
            isRead: false
          }).catch(() => {});

          sentLateWarningsToday.add(warnKey);
        } catch (e: any) {
          console.error(`[Late-Warning Error] Lỗi xử lý cảnh báo tới ${t.name}:`, e.message);
        }
      }
    } catch (err: any) {
      console.error("[Auto Late-Warning Scan Error]:", err.message);
    }
  }

  // Quét kiểm tra giáo viên đi trễ mỗi 2 phút trong giờ dạy
  setInterval(autoScanAndWarnLateTeachers, 2 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
