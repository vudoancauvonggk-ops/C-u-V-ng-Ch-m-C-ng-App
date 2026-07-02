import { pgTable, text, integer, boolean, doublePrecision } from 'drizzle-orm/pg-core';

export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  dob: text('dob').default(''),
  phone: text('phone').default(''),
  email: text('email').default(''),
  address: text('address').default(''),
  status: text('status').default('active').notNull(), // 'active' | 'inactive'
  hourlyRate: integer('hourly_rate').default(50000).notNull(),
  monthlyAllowance: integer('monthly_allowance').default(0).notNull(),
  bonus: integer('bonus').default(0).notNull(),
  deduction: integer('deduction').default(0).notNull(), // Phạt vi phạm (Khấu trừ cũ)
  socialInsurance: integer('social_insurance').default(0).notNull(), // BHXH
  advanceSalary: integer('advance_salary').default(0).notNull(), // Ứng lương
  bonusPeriodsJSON: text('bonus_periods_json').default('{}').notNull(),
  notes: text('notes').default(''),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: text('deleted_at'),
});

export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').default(''),
  contactPerson: text('contact_person').default(''),
  phone: text('phone').default(''),
  lat: doublePrecision('lat').default(0.0).notNull(),
  lng: doublePrecision('lng').default(0.0).notNull(),
  qrCodeData: text('qr_code_data').default(''),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: text('deleted_at'),
});

export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
  studentCount: integer('student_count').default(0).notNull(),
  standardPeriods: integer('standard_periods').default(1).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: text('deleted_at'),
});

export const schedules = pgTable('schedules', {
  id: text('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(),
  session: text('session').notNull(), // 'morning' | 'afternoon'
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
  classId: text('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  periods: integer('periods').default(1).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: text('deleted_at'),
});

export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  scheduleId: text('schedule_id'),
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
  classId: text('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  session: text('session').notNull(),
  checkInTime: text('check_in_time').notNull(),
  periods: integer('periods').default(1).notNull(),
  lat: doublePrecision('lat').default(0.0).notNull(),
  lng: doublePrecision('lng').default(0.0).notNull(),
  distanceMeter: doublePrecision('distance_meter').default(0.0).notNull(),
  selfieImage: text('selfie_image').default(''),
  verificationMethod: text('verification_method').default('GPS').notNull(), // 'GPS' | 'QR' | 'BOTH'
  isVerified: boolean('is_verified').default(false).notNull(),
  isFlagged: boolean('is_flagged').default(false).notNull(),
  flagReason: text('flag_reason').default(''),
  confirmedByAdmin: boolean('confirmed_by_admin').default(false).notNull(),
});

export const changeRequests = pgTable('change_requests', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  requestType: text('request_type').notNull(), // 'sick_leave' | 'swap_shift' | 'substitute_teacher'
  date: text('date').notNull(),
  session: text('session').notNull(),
  originalTeacherId: text('original_teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  targetTeacherId: text('target_teacher_id'),
  targetScheduleId: text('target_schedule_id'),
  reason: text('reason').default(''),
  status: text('status').default('pending').notNull(), // 'pending' | 'approved' | 'rejected'
  createdAt: text('created_at').notNull(),
  adminNotes: text('admin_notes').default(''),
});

export const systemNotifications = pgTable('system_notifications', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info').notNull(), // 'info' | 'warning' | 'alert' | 'success'
  timestamp: text('timestamp').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  targetTeacherId: text('target_teacher_id'),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  timestamp: text('timestamp').notNull(),
  details: text('details').default(''),
});

export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey(), // We'll just use one row with id = 'global'
  allowTeacherScheduleEdit: boolean('allow_teacher_schedule_edit').default(false).notNull(),
  allowTeacherUpdateSchoolLocation: boolean('allow_teacher_update_school_location').default(false).notNull(),
});

export const meetingAttendance = pgTable('meeting_attendance', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'training' | 'meeting'
  status: text('status').notNull(), // 'present' | 'absent_excused' | 'absent_unexcused'
  note: text('note').default(''),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID
  email: text('email'),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('member').notNull(), // 'admin' | 'manager' | 'member'
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  permissions: text('permissions').default('[]').notNull(), // JSON array of custom permissions for roles
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: text('deleted_at'),
});
