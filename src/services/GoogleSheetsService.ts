import { Teacher, School, ClassInfo, Schedule, AttendanceLog, ChangeRequest, AuditLog } from '../types';

/**
 * Settings configuration for the Google Sheets Apps Script Web App
 */
export interface SheetsConfig {
  webAppUrl: string;       // Google Apps Script Web App URL
  spreadsheetId: string;   // Active spreadsheet ID
}

const CONFIG_KEY = 'etms_sheets_config_v1';

// Save and Load settings
export function saveSheetsConfig(config: SheetsConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getSheetsConfig(): SheetsConfig {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing sheets config', e);
    }
  }
  return {
    webAppUrl: '',
    spreadsheetId: ''
  };
}

/**
 * Generic Fetch client helper for Apps Script Web App interaction
 */
async function callAppsScript(action: string, data?: any, id?: string): Promise<any> {
  const config = getSheetsConfig();
  if (!config.webAppUrl || !config.spreadsheetId) {
    console.warn(`[ETMS Live] Google Apps Script URL or Spreadsheet ID not configured yet. Falling back to local replication.`);
    return { status: "local_only", message: "Config missing" };
  }

  // Google Apps Script Web App receives POST for writes
  try {
    const response = await fetch(config.webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Content-Type for gas bypass Preflight CORS
      },
      body: JSON.stringify({
        action,
        sheetId: config.spreadsheetId,
        data,
        id
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const payload = await response.json();
    if (payload.status === 'error') {
      throw new Error(payload.message || 'Unknown Apps Script error');
    }
    return payload;
  } catch (error) {
    console.error(`[ETMS Apps Script Error] Action: ${action} Failed:`, error);
    throw error;
  }
}

/**
 * A. TEACHER SERVICE
 */
export const TeacherService = {
  async getTeachers(): Promise<Teacher[]> {
    const config = getSheetsConfig();
    if (!config.webAppUrl || !config.spreadsheetId) {
      return JSON.parse(localStorage.getItem('etms_teachers_v1') || '[]');
    }

    try {
      const url = `${config.webAppUrl}?action=getTeachers&sheetId=${encodeURIComponent(config.spreadsheetId)}`;
      const res = await fetch(url, { mode: 'cors' });
      const payload = await res.json();
      if (payload.status === 'success') {
        console.log('SYNC_SUCCESS: Loaded teachers from Google Sheets');
        return payload.data as Teacher[];
      }
      return [];
    } catch (error) {
      console.error('Failed to get teachers from Google Sheets:', error);
      return JSON.parse(localStorage.getItem('etms_teachers_v1') || '[]');
    }
  },

  async addTeacher(teacher: Teacher): Promise<boolean> {
    try {
      const res = await callAppsScript('addTeacher', teacher);
      console.log('ADD_TEACHER_SUCCESS', teacher);
      return true;
    } catch (error) {
      console.error('Failed to add teacher to Sheets:', error);
      return false; // local fallback will happen in calling component
    }
  },

  async updateTeacher(teacher: Teacher): Promise<boolean> {
    try {
      const res = await callAppsScript('updateTeacher', teacher);
      console.log('UPDATE_TEACHER_SUCCESS', teacher);
      return true;
    } catch (error) {
      console.error('Failed to update teacher in Sheets:', error);
      return false;
    }
  },

  async deleteTeacher(id: string): Promise<boolean> {
    try {
      const res = await callAppsScript('deleteTeacher', undefined, id);
      console.log('DELETE_TEACHER_SUCCESS', id);
      return true;
    } catch (error) {
      console.error('Failed to delete teacher from Sheets:', error);
      return false;
    }
  }
};

/**
 * B. ATTENDANCE SERVICE
 */
export const AttendanceService = {
  async getAttendance(): Promise<AttendanceLog[]> {
    const config = getSheetsConfig();
    if (!config.webAppUrl || !config.spreadsheetId) {
      return JSON.parse(localStorage.getItem('etms_attendance_v1') || '[]');
    }

    try {
      const url = `${config.webAppUrl}?action=getAttendance&sheetId=${encodeURIComponent(config.spreadsheetId)}`;
      const res = await fetch(url, { mode: 'cors' });
      const payload = await res.json();
      if (payload.status === 'success') {
        return payload.data as AttendanceLog[];
      }
      return [];
    } catch (error) {
      console.error('Failed to get attendance from Google Sheets', error);
      return JSON.parse(localStorage.getItem('etms_attendance_v1') || '[]');
    }
  },

  async addAttendance(log: AttendanceLog): Promise<boolean> {
    try {
      await callAppsScript('addAttendance', log);
      console.log('ADD_ATTENDANCE_SUCCESS', log);
      return true;
    } catch (error) {
      console.error('Failed to save attendance trace to Google Sheets', error);
      return false;
    }
  }
};

/**
 * C. SCHOOL SERVICE
 */
export const SchoolService = {
  async getSchools(): Promise<School[]> {
    const config = getSheetsConfig();
    if (!config.webAppUrl || !config.spreadsheetId) {
      return JSON.parse(localStorage.getItem('etms_schools_v1') || '[]');
    }

    try {
      const url = `${config.webAppUrl}?action=getSchools&sheetId=${encodeURIComponent(config.spreadsheetId)}`;
      const res = await fetch(url, { mode: 'cors' });
      const payload = await res.json();
      if (payload.status === 'success') {
        return payload.data as School[];
      }
      return [];
    } catch (error) {
      console.error('Failed to get schools from Google Sheets', error);
      return JSON.parse(localStorage.getItem('etms_schools_v1') || '[]');
    }
  },

  async addSchool(school: School): Promise<boolean> {
    try {
      await callAppsScript('addSchool', school);
      console.log('ADD_SCHOOL_SUCCESS', school);
      return true;
    } catch (error) {
      console.error('Failed to add school to Google Sheets', error);
      return false;
    }
  },

  async updateSchool(school: School): Promise<boolean> {
    try {
      await callAppsScript('updateSchool', school);
      console.log('UPDATE_SCHOOL_SUCCESS', school);
      return true;
    } catch (error) {
      console.error('Failed to update school in Google Sheets', error);
      return false;
    }
  }
};

/**
 * D. CLASS SERVICE
 */
export const ClassService = {
  async getClasses(): Promise<ClassInfo[]> {
    const config = getSheetsConfig();
    if (!config.webAppUrl || !config.spreadsheetId) {
      return JSON.parse(localStorage.getItem('etms_classes_v1') || '[]');
    }

    try {
      const url = `${config.webAppUrl}?action=getClasses&sheetId=${encodeURIComponent(config.spreadsheetId)}`;
      const res = await fetch(url, { mode: 'cors' });
      const payload = await res.json();
      if (payload.status === 'success') {
        return payload.data as ClassInfo[];
      }
      return [];
    } catch (error) {
      console.error('Failed to get classes from Google Sheets', error);
      return JSON.parse(localStorage.getItem('etms_classes_v1') || '[]');
    }
  },

  async addClass(cls: ClassInfo): Promise<boolean> {
    try {
      await callAppsScript('addClass', cls);
      console.log('ADD_CLASS_SUCCESS', cls);
      return true;
    } catch (error) {
      console.error('Failed to add class to Google Sheets', error);
      return false;
    }
  },

  async updateClass(cls: ClassInfo): Promise<boolean> {
    try {
      await callAppsScript('updateClass', cls);
      console.log('UPDATE_CLASS_SUCCESS', cls);
      return true;
    } catch (error) {
      console.error('Failed to update class in Google Sheets', error);
      return false;
    }
  }
};

/**
 * E. PAYROLL SERVICE
 */
export const PayrollService = {
  calculateTeacherPayroll(teacher: Teacher, attendanceList: AttendanceLog[]) {
    // Filter check-ins with verified sign-off
    const teacherLogs = attendanceList.filter(log => log.teacherId === teacher.id && log.isVerified);
    
    // Sum total periods
    let totalPeriods = 0;
    teacherLogs.forEach(log => {
      totalPeriods += log.periods || 1; // default to 1 period if not specified
    });

    const hourlySalary = totalPeriods * (teacher.hourlyRate || 50000);
    const allowance = teacher.monthlyAllowance || 0;
    const bonus = teacher.bonus || 0;
    const deduction = teacher.deduction || 0;
    
    const grossSalary = hourlySalary + allowance + bonus - deduction;

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      totalHours: totalPeriods,
      hourlyRate: teacher.hourlyRate || 50000,
      baseSalary: Math.round(hourlySalary),
      allowance,
      bonus,
      deduction,
      grossSalary: Math.max(0, Math.round(grossSalary)),
      sessionsCount: teacherLogs.length
    };
  }
};

/**
 * Bulk fully replaces state in Apps Script Spreadsheet
 */
export async function bulkSyncToSheets(state: {
  teachers: Teacher[];
  schools: School[];
  classes: ClassInfo[];
  schedules: Schedule[];
  attendance: AttendanceLog[];
}): Promise<boolean> {
  try {
    const config = getSheetsConfig();
    const res = await callAppsScript('bulkSync', state);
    console.log('SYNC_SUCCESS: Uploaded state database dump of all schemas to Google Sheets!');
    return true;
  } catch (error) {
    console.error('Bulk Sync failed:', error);
    return false;
  }
}

/**
 * Bulk loads complete active state from Google Apps Script Web App
 */
export async function bulkLoadFromSheets(): Promise<any> {
  const config = getSheetsConfig();
  if (!config.webAppUrl || !config.spreadsheetId) {
    throw new Error('Google Apps Script URL hoặc Spreadsheet ID chưa được thiết lập.');
  }

  try {
    const url = `${config.webAppUrl}?sheetId=${encodeURIComponent(config.spreadsheetId)}`;
    const res = await fetch(url, { mode: 'cors' });
    const payload = await res.json();
    
    if (payload.status === 'success') {
      console.log('SYNC_SUCCESS', payload);
      return payload;
    } else {
      throw new Error(payload.message || 'Apps Script returned error status');
    }
  } catch (err: any) {
    console.error('Failed to bulk sync & reload from Google Sheets API', err);
    throw err;
  }
}
