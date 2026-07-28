import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Copy, Check, X, Calendar, 
  Building, User, FileSpreadsheet, Sparkles, CheckCircle2, RefreshCw, HardDrive 
} from 'lucide-react';
import { School, ClassInfo, AttendanceLog } from '../types';
import { 
  AcceptanceDocOptions, ClassBreakdownItem, 
  generateAcceptanceDocx, generateForm08aDocx, downloadBlob, 
  copyAcceptanceTextToClipboard, numberToVietnameseWords, formatVNDNumber 
} from '../utils/acceptanceDocUtils';

interface AcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  allSchools?: School[];
  calculatedRows?: any[];
  classes: ClassInfo[];
  attendance: AttendanceLog[];
  reportMonth: string; // YYYY-MM
  unitPrice: number;
  isPerPeriod?: boolean;
  rawHourlyRate?: string;
  totalCalculatedAmount: number;
  actualPeriods: number;
  onAddAuditLog?: (action: string, actor: string, details: string) => void;
  currentUser?: any;
}

const normalizeStr = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

const PRESET_CONTRACTS: Array<{ keys: string[]; [key: string]: any }> = [
  {
    keys: ["195", "19/5", "19-5", "19.5"],
    contractNo: "17/-HĐAEROBICMN",
    contractDate: "2025-10-01",
    schoolNameCustom: "TRƯỜNG MẦM NON 19-5",
    schoolAddress: "Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh",
    schoolPhone: "028.3727.195",
    schoolTaxCode: "1071625",
    representativeName: "Nguyễn Thị Kim Thanh",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Giảng dạy Thể dục Nhịp điệu",
    form08aCode: "MN19/5"
  },
  {
    keys: ["bantayvang", "bàn tay vàng"],
    contractNo: "01/2026/HĐGD",
    contractDate: "2026-01-01",
    schoolNameCustom: "TRƯỜNG MẦM NON BÀN TAY VÀNG",
    schoolAddress: "Số 12 Đường 34, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "0903.694.345",
    schoolTaxCode: "0318738398",
    representativeName: "Bùi Thị Mến",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["vitcon", "vịt con"],
    contractNo: "02/2026/HĐGD",
    contractDate: "2026-01-01",
    schoolNameCustom: "TRƯỜNG MẦM NON VỊT CON",
    schoolAddress: "Số 17 Đường số 14, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "0903.694.345",
    schoolTaxCode: "0319310415",
    representativeName: "Nguyễn Thị Tường Vy",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["1thang6", "1 tháng 6"],
    contractNo: "04/2026/HĐGD",
    contractDate: "2026-03-02",
    schoolNameCustom: "CÔNG TY TNHH ĐẦU TƯ VÀ PHÁT TRIỂN GIÁO DỤC CHẤT LƯỢNG CAO 1 THÁNG 6",
    schoolAddress: "Số 12 Đường 26, KP7, Phường Cát Lái, TP. Hồ Chí Minh",
    schoolPhone: "0986 218 089",
    schoolTaxCode: "0318743416",
    representativeName: "Phạm Uyên Phương",
    representativePosition: "Giám Đốc",
    subjectName: "Aerobic & Nhảy hiện đại"
  },
  {
    keys: ["sunshine"],
    contractNo: "04/2026/HĐGD",
    contractDate: "2026-03-01",
    schoolNameCustom: "CÔNG TY TNHH ĐẦU TƯ GIÁO DỤC HOÀNG HÀ",
    schoolAddress: "Số 4 Đường N4, KDC Mega Khang Điền, Phường Long Trường, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "0315358208",
    representativeName: "Bùi Mạnh Hà",
    representativePosition: "Giám Đốc",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["nhabeyeu", "nhà bé yêu"],
    contractNo: "6/2026/HĐGD",
    contractDate: "2026-03-02",
    schoolNameCustom: "LỚP MẦM NON NHÀ BÉ YÊU",
    schoolAddress: "103-105 Võ Oanh, P. Thạnh Mỹ Tây (P25 - Bình Thạnh cũ), TP. Hồ Chí Minh",
    schoolPhone: "0908398218",
    schoolTaxCode: "0316513470",
    representativeName: "Nguyễn Thị Thùy Trang",
    representativePosition: "Chủ lớp",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["ngoinhabeyeu", "ngôi nhà bé yêu"],
    contractNo: "7/2026/HĐGD",
    contractDate: "2026-03-02",
    schoolNameCustom: "LỚP MẦM NON NGÔI NHÀ BÉ YÊU",
    schoolAddress: "123 Võ Oanh, P. Thạnh Mỹ Tây (P25 - Bình Thạnh cũ), TP. Hồ Chí Minh",
    schoolPhone: "0919220366",
    schoolTaxCode: "0317685955",
    representativeName: "Tăng Thị Lam Giang",
    representativePosition: "Chủ lớp",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["abc"],
    contractNo: "07/2026/HĐGD",
    contractDate: "2026-03-02",
    schoolNameCustom: "CHI NHÁNH TRƯỜNG MẦM NON ABC TRẺ THƠ – CTY TNHH MTV TRƯỜNG MN GIA ANH",
    schoolAddress: "81/5 Đường Số 3, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "0317903674-001",
    representativeName: "Võ Trần Mai Trinh",
    representativePosition: "Giám Đốc",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["thienmy", "thiện mỹ"],
    contractNo: "08/2026/HĐGD",
    contractDate: "2026-04-01",
    schoolNameCustom: "TRƯỜNG MẦM NON THIỆN MỸ",
    schoolAddress: "46/3C, Trương Hạnh, Phường Long Bình, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "044076010167",
    representativeName: "Nguyễn Thị Tường Vy",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["saovui", "sao vui"],
    contractNo: "10/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON SAO VUI",
    schoolAddress: "Số 20 Đường 12, Phường Cát Lái, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "0318992831",
    representativeName: "Lê Thị Ngọc Bích",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["rangdong", "rạng đông"],
    contractNo: "11/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON TƯ THỤC RẠNG ĐÔNG",
    schoolAddress: "Số 55 Đường N1, Phường Tân Đông Hiệp, TP. Dĩ An, Bình Dương",
    schoolPhone: "",
    schoolTaxCode: "3702819231",
    representativeName: "Trần Thị Hoài",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["ngoinhamouoc", "ngôi nhà mơ ước"],
    contractNo: "12/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON NGÔI NHÀ MƠ ƯỚC",
    schoolAddress: "Số 18 Đường D5, KDC Vietsing, Phường An Phú, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "3702910293",
    representativeName: "Nguyễn Thị Phương",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["boconganh", "bồ công anh"],
    contractNo: "13/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON BỒ CÔNG ANH",
    schoolAddress: "Số 88 Đường 10, Phường Phước Long B, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "0317829102",
    representativeName: "Nguyễn Thị Thu Hà",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["thanhphotretho", "thành phố trẻ thơ"],
    contractNo: "14/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON THÀNH PHỐ TRẺ THƠ",
    schoolAddress: "26 Phan Đình Giót, KP Đông B, Phường Đông Hòa, TP. Dĩ An",
    schoolPhone: "",
    schoolTaxCode: "3702719231",
    representativeName: "Trần Xuân Phúc",
    representativePosition: "Chủ Trường",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["anhcauvong", "ánh cầu vồng"],
    contractNo: "15/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON TƯ THỤC ÁNH CẦU VỒNG",
    schoolAddress: "Số 75, Đường N22, KP Tân Thắng, Phường Tân Đông Hiệp, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "3703274553",
    representativeName: "Trần Thị Kim Yến",
    representativePosition: "Chủ Trường",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["tuoitien", "tuổi tiên"],
    contractNo: "16/2026/HĐGD",
    contractDate: "2026-05-01",
    schoolNameCustom: "TRƯỜNG MẦM NON TƯ THỤC TUỔI TIÊN",
    schoolAddress: "Số 12 Đường N5, KP Thống Nhất, Phường Dĩ An, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "3702619283",
    representativeName: "Phạm Thị Hồng",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["ngoinhaphiadong", "ngôi nhà phía đông"],
    contractNo: "17/2026/HĐGD",
    contractDate: "2026-08-01",
    schoolNameCustom: "CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ PHÁT TRIỂN GIÁO DỤC LEGACY",
    schoolAddress: "1A3/TL/01, Tổ 3, KP Hòa Lân 2, Phường Thuận Giao, TP. Hồ Chí Minh",
    schoolPhone: "0933 696971",
    schoolTaxCode: "3703208039",
    representativeName: "Nguyễn Phương Thuỳ",
    representativePosition: "Chủ Tịch HĐQT",
    subjectName: "Aerobic mầm non"
  },
  {
    keys: ["hoahong", "hoa hồng"],
    contractNo: "26/2025/HĐGD",
    contractDate: "2025-10-01",
    schoolNameCustom: "TRƯỜNG MẦM NON HOA HỒNG",
    schoolAddress: "Số 02 Đường C2, Phường Cát Lái, TP. Hồ Chí Minh",
    schoolPhone: "(028) 38976743",
    schoolTaxCode: "0310432264",
    representativeName: "Nguyễn Thị Út",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Yoga & Aerobic"
  },
  {
    keys: ["iris"],
    contractNo: "24/2025/HĐGD",
    contractDate: "2025-11-01",
    schoolNameCustom: "CÔNG TY TNHH GIÁO DỤC QUỐC TẾ IRIS",
    schoolAddress: "44 Nguyễn Duy Hiệu, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "(028) 7306 6137",
    schoolTaxCode: "0313758698",
    representativeName: "Trần Thị Thu",
    representativePosition: "Phó Giám Đốc",
    subjectName: "Giảng dạy Thể dục Yoga"
  },
  {
    keys: ["inkindy"],
    contractNo: "27/2025/HĐGD",
    contractDate: "2025-09-01",
    schoolNameCustom: "TRƯỜNG MẦM NON INKINDY",
    schoolAddress: "Số 27 Cách mạng tháng 8, Tổ 4, KP 2, Phường Long Khánh, Đồng Nai",
    schoolPhone: "",
    schoolTaxCode: "3603947854",
    representativeName: "Nguyễn Thị Ngọc",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic & Nhảy hiện đại"
  },
  {
    keys: ["ankhanh", "an khánh"],
    contractNo: "18/2025/HĐGD",
    contractDate: "2025-09-01",
    schoolNameCustom: "TRƯỜNG MẦM NON AN KHÁNH",
    schoolAddress: "Đường 34, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "0310928123",
    representativeName: "Nguyễn Thị Thanh",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic & Nhảy hiện đại"
  }
];

export default function AcceptanceModal({
  isOpen,
  onClose,
  school,
  allSchools,
  calculatedRows,
  classes,
  attendance,
  reportMonth,
  unitPrice,
  isPerPeriod,
  rawHourlyRate,
  totalCalculatedAmount,
  actualPeriods,
  onAddAuditLog,
  currentUser
}: AcceptanceModalProps) {
  const isIrisSystem = normalizeStr(school?.name || '').includes('iris');
  const [combineIris, setCombineIris] = useState(isIrisSystem);

  useEffect(() => {
    setCombineIris(isIrisSystem);
  }, [school]);

  const getEffectiveSchoolId = (log: AttendanceLog): string => {
    if (log.schoolId) return log.schoolId;
    const cls = classes.find(c => c.id === log.classId && !c.isDeleted);
    return cls?.schoolId || '';
  };

  // Find all active Iris calculated rows from calculatedRows or fallback from DB
  const irisRowsFromCalc = (calculatedRows || []).filter(r => 
    r && normalizeStr(r.displayName || '').includes('iris') && (r.actualPeriods > 0 || r.calculatedAmount > 0)
  );

  const irisRowsFromDb = (allSchools || [school])
    .filter(s => s && normalizeStr(s.name || '').includes('iris'))
    .map(sch => {
      const schoolClasses = classes.filter(c => c.schoolId === sch.id && !c.isDeleted);
      const schoolClassIds = new Set(schoolClasses.map(c => c.id));
      const schoolLogs = attendance.filter(a => {
        if ((a as any).isDeleted) return false;
        if (!a.date || !a.date.startsWith(reportMonth)) return false;
        if (!a.confirmedByAdmin && !a.isVerified) return false;
        if (a.schoolId === sch.id) return true;
        if (a.classId && schoolClassIds.has(a.classId)) return true;
        if (getEffectiveSchoolId(a) === sch.id) return true;
        return false;
      });
      const actualP = schoolLogs.reduce((acc, curr) => acc + (curr.periods || 0), 0);
      return {
        schoolId: sch.id,
        displayName: sch.name,
        actualPeriods: actualP,
        calculatedAmount: actualP * (unitPrice || 120000)
      };
    }).filter(r => r.actualPeriods > 0);

  const irisRows = irisRowsFromCalc.length > 0 ? irisRowsFromCalc : irisRowsFromDb;

  // Total amount and periods across target schools
  const effectiveTotalAmount = (combineIris && irisRows.length > 0)
    ? irisRows.reduce((sum, r) => sum + (r.calculatedAmount || 0), 0)
    : totalCalculatedAmount;

  const effectiveTotalPeriods = (combineIris && irisRows.length > 0)
    ? irisRows.reduce((sum, r) => sum + (r.actualPeriods || 0), 0)
    : actualPeriods;

  // Calculate default document date (last day of reportMonth)
  const getDefaultDocDate = (monthStr: string) => {
    if (!monthStr) return new Date().toISOString().slice(0, 10);
    const [yyyy, mm] = monthStr.split('-').map(Number);
    const lastDay = new Date(yyyy, mm, 0).getDate();
    const mmStr = String(mm).padStart(2, '0');
    const ddStr = String(lastDay).padStart(2, '0');
    return `${yyyy}-${mmStr}-${ddStr}`;
  };

  const getMatchedPreset = (sName: string): any => {
    if (!sName) return {};
    const norm = normalizeStr(sName);
    for (const item of PRESET_CONTRACTS) {
      for (const k of item.keys) {
        const normK = normalizeStr(k);
        if (norm.includes(normK) || normK.includes(norm)) {
          return item;
        }
      }
    }
    return {};
  };

  // State initialized from localStorage or official contract presets
  const storageKey = `etms_school_acceptance_meta_${school?.id}`;
  const [meta, setMeta] = useState(() => {
    const preset = getMatchedPreset(school?.name || '');
    const defaultMeta = {
      schoolNameCustom: preset.schoolNameCustom || school?.name || '',
      contractNo: preset.contractNo || `26/2025/HĐGD`,
      contractDate: preset.contractDate || `2025-10-01`,
      representativeName: preset.representativeName || school?.contactPerson || '',
      representativePosition: preset.representativePosition || 'Hiệu Trưởng',
      schoolTaxCode: preset.schoolTaxCode || (school as any)?.taxCode || '',
      schoolAddress: preset.schoolAddress || school?.address || '',
      schoolPhone: preset.schoolPhone || school?.phone || '',
      docDate: getDefaultDocDate(reportMonth),
      subjectName: preset.subjectName || (isIrisSystem ? 'Giảng dạy Thể dục Yoga' : 'Aerobic & Nhảy hiện đại'),
      form08aCode: preset.form08aCode || `MN/${school?.id?.slice(-3)?.toUpperCase() || '01'}`,
      form08aNo: reportMonth.split('-')[1] || '01',
      unitCode: '1071625',
      sourceCode: '00',
      contractValue: 95200000
    };

    try {
      const savedStr = localStorage.getItem(storageKey);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        const merged = { ...defaultMeta, ...saved };
        if (preset.contractNo && (merged.contractNo === `26/2025/HĐGD` || !saved.contractNo)) {
          merged.contractNo = preset.contractNo;
        }
        if (preset.contractDate && (merged.contractDate === `2025-10-01` || !saved.contractDate)) {
          merged.contractDate = preset.contractDate;
        }
        if (preset.schoolNameCustom && (!saved.schoolNameCustom || saved.schoolNameCustom === school?.name)) {
          merged.schoolNameCustom = preset.schoolNameCustom;
        }
        if (preset.schoolAddress && !saved.schoolAddress) {
          merged.schoolAddress = preset.schoolAddress;
        }
        if (preset.schoolTaxCode && !saved.schoolTaxCode) {
          merged.schoolTaxCode = preset.schoolTaxCode;
        }
        if (preset.schoolPhone && !saved.schoolPhone) {
          merged.schoolPhone = preset.schoolPhone;
        }
        if (preset.representativeName && (!saved.representativeName || saved.representativeName === 'Đại diện Trường')) {
          merged.representativeName = preset.representativeName;
        }
        if (preset.form08aCode && !saved.form08aCode) {
          merged.form08aCode = preset.form08aCode;
        }
        return merged;
      }
    } catch (e) {}
    return defaultMeta;
  });

  useEffect(() => {
    setMeta((prev: any) => ({
      ...prev,
      docDate: getDefaultDocDate(reportMonth),
      form08aNo: reportMonth.split('-')[1] || '01'
    }));
  }, [reportMonth, school]);

  const updateMetaField = (field: string, value: any) => {
    setMeta((prev: any) => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const [classRows, setClassRows] = useState<ClassBreakdownItem[]>([]);

  useEffect(() => {
    if (combineIris && irisRows.length > 0) {
      let defaultRate = unitPrice || 120000;
      if (!isPerPeriod && effectiveTotalAmount && effectiveTotalPeriods > 0) {
        defaultRate = Math.round(effectiveTotalAmount / effectiveTotalPeriods);
      } else if (isPerPeriod) {
        defaultRate = unitPrice;
      }

      const campusItems: ClassBreakdownItem[] = [];

      irisRows.forEach(row => {
        const campusName = row.displayName
          .replace(/iris/i, '')
          .replace(/yoga/i, '')
          .replace(/[-–]/g, '')
          .trim();
        const labelSuffix = campusName ? ` (${campusName})` : ` (${row.displayName})`;

        const normCampusName = normalizeStr(row.displayName);
        const rowApprovedLogs = attendance.filter(a => {
          if ((a as any).isDeleted) return false;
          if (!a.date || !a.date.startsWith(reportMonth)) return false;
          if (!a.confirmedByAdmin && !a.isVerified) return false;

          if (a.schoolId === row.schoolId) return true;
          if (getEffectiveSchoolId(a) === row.schoolId) return true;

          const logSch = (allSchools || []).find(s => s.id === a.schoolId);
          if (logSch && normalizeStr(logSch.name).includes(normCampusName)) return true;

          const logCls = classes.find(c => c.id === a.classId);
          if (logCls && normalizeStr(logCls.name).includes(normCampusName)) return true;

          return false;
        });

        let sumAddedPeriods = 0;
        const logsByClass: Record<string, { className: string; periods: number }> = {};

        rowApprovedLogs.forEach(log => {
          const logCls = classes.find(c => c.id === log.classId);
          const className = logCls ? logCls.name : ((log as any).className || 'Lớp học');
          const key = log.classId || className;
          if (!logsByClass[key]) {
            logsByClass[key] = { className, periods: 0 };
          }
          logsByClass[key].periods += (log.periods || 0);
        });

        const classKeys = Object.keys(logsByClass);
        if (classKeys.length > 0) {
          classKeys.forEach(key => {
            const item = logsByClass[key];
            if (item.periods > 0) {
              sumAddedPeriods += item.periods;
              campusItems.push({
                id: key,
                name: `Lớp ${item.className}${labelSuffix}`,
                periods: item.periods,
                rate: defaultRate,
                amount: item.periods * defaultRate
              });
            }
          });
        }

        const remainingPeriods = (row.actualPeriods || 0) - sumAddedPeriods;
        if (remainingPeriods > 0) {
          campusItems.push({
            name: sumAddedPeriods > 0 ? `Cơ sở ${row.displayName} (Khác)` : `Cơ sở ${row.displayName}`,
            periods: remainingPeriods,
            rate: defaultRate,
            amount: remainingPeriods * defaultRate
          });
        }
      });

      if (campusItems.length > 0) {
        if (effectiveTotalAmount > 0) {
          const currentSum = campusItems.reduce((s, item) => s + item.amount, 0);
          const diff = effectiveTotalAmount - currentSum;
          if (diff !== 0 && campusItems.length > 0) {
            campusItems[campusItems.length - 1].amount += diff;
          }
        }
        setClassRows(campusItems);
      } else {
        setClassRows([{
          name: `Hệ thống Trường Iris (Tất cả cơ sở)`,
          periods: effectiveTotalPeriods || 0,
          rate: defaultRate,
          amount: effectiveTotalAmount || 0
        }]);
      }
    } else {
      const schoolClasses = classes.filter(c => c.schoolId === school?.id && !c.isDeleted);
      const approvedLogs = attendance.filter(a => 
        !(a as any).isDeleted && 
        a.date && a.date.startsWith(reportMonth) && 
        (a.confirmedByAdmin || a.isVerified) &&
        (a.schoolId === school?.id || schoolClasses.some(c => c.id === a.classId))
      );

      let defaultRate = unitPrice || 120000;
      if (!isPerPeriod && totalCalculatedAmount && actualPeriods > 0) {
        defaultRate = Math.round(totalCalculatedAmount / actualPeriods);
      } else if (isPerPeriod) {
        defaultRate = unitPrice;
      }

      if (schoolClasses.length > 0) {
        const items: ClassBreakdownItem[] = schoolClasses.map(cls => {
          const classLogs = approvedLogs.filter(a => a.classId === cls.id);
          const periods = classLogs.reduce((sum, a) => sum + (a.periods || 0), 0);
          const rate = defaultRate;
          return {
            id: cls.id,
            name: `Lớp ${cls.name}`,
            periods,
            rate,
            amount: periods * rate
          };
        });

        const activeItems = items.filter(i => i.periods > 0);
        const targetItems = activeItems.length > 0 ? activeItems : items;

        if (targetItems.length > 0) {
          if (totalCalculatedAmount > 0) {
            const currentSum = targetItems.reduce((s, item) => s + item.amount, 0);
            const diff = totalCalculatedAmount - currentSum;
            if (diff !== 0 && targetItems.length > 0) {
              targetItems[targetItems.length - 1].amount += diff;
            }
          }
          setClassRows(targetItems);
        } else {
          setClassRows([{
            name: `Toàn trường (${school?.name})`,
            periods: actualPeriods || 0,
            rate: defaultRate,
            amount: totalCalculatedAmount || 0
          }]);
        }
      } else {
        setClassRows([{
          name: `Giảng dạy Thể dục Yoga`,
          periods: actualPeriods || 0,
          rate: defaultRate,
          amount: totalCalculatedAmount || 0
        }]);
      }
    }
  }, [school, classes, attendance, reportMonth, unitPrice, isPerPeriod, effectiveTotalPeriods, effectiveTotalAmount, combineIris, calculatedRows]);

  const updateClassRow = (index: number, field: 'periods' | 'rate' | 'name', value: any) => {
    setClassRows(prev => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };
      if (field === 'periods' || field === 'rate') {
        const p = field === 'periods' ? parseFloat(value) || 0 : target.periods;
        const r = field === 'rate' ? parseFloat(value) || 0 : target.rate;
        target.amount = p * r;
      }
      next[index] = target;
      return next;
    });
  };

  const totalPeriods = classRows.reduce((sum, r) => sum + (r.periods || 0), 0);
  const totalAmount = classRows.reduce((sum, r) => sum + (r.amount || 0), 0);

  const [isDownloadingBBNT, setIsDownloadingBBNT] = useState(false);
  const [isDownloading08a, setIsDownloading08a] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !school) return null;

  const buildDocOptions = (): AcceptanceDocOptions => ({
    schoolName: meta.schoolNameCustom || school.name,
    schoolAddress: meta.schoolAddress || school.address || '',
    schoolPhone: meta.schoolPhone || school.phone || '',
    schoolTaxCode: meta.schoolTaxCode || '',
    representativeName: meta.representativeName || school.contactPerson || 'Đại diện Trường',
    representativePosition: meta.representativePosition || 'Hiệu Trưởng',
    contractNo: meta.contractNo,
    contractDate: meta.contractDate,
    docDate: meta.docDate,
    reportMonth,
    subjectName: meta.subjectName,
    classRows,
    form08aCode: meta.form08aCode,
    form08aNo: meta.form08aNo,
    unitCode: meta.unitCode,
    sourceCode: meta.sourceCode,
    contractValue: meta.contractValue
  });

  const handleSaveToDrive = async () => {
    try {
      setIsSavingToDrive(true);
      setSavedSuccessMsg('');

      const docOpts = buildDocOptions();
      const bbntBlob = await generateAcceptanceDocx(docOpts);
      const m08aBlob = await generateForm08aDocx(docOpts);

      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            resolve(base64data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const acceptanceBase64 = await blobToBase64(bbntBlob);
      const form08aBase64 = await blobToBase64(m08aBlob);

      const res = await fetch('/api/admin/save-acceptance-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: meta.schoolNameCustom || school.name,
          reportMonth,
          acceptanceBase64,
          form08aBase64
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSavedSuccessMsg(data.message || 'Đã lưu kho thành công!');
      } else {
        alert(`❌ Lỗi: ${data.error || 'Vui lòng thử lại'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi khi lưu kho: ${err.message}`);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Helper for standardized clean filenames
  const getCleanSchoolFilename = (prefix: string) => {
    const cleanName = school.name
      .replace(/[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const [yyyy, mm] = reportMonth.split('-');
    return `${prefix}_${cleanName}_Thang_${mm}_${yyyy}.docx`;
  };

  // Handle Download BBNT (.docx)
  const handleDownloadBBNT = async () => {
    setIsDownloadingBBNT(true);
    try {
      const options = buildDocOptions();
      const blob = await generateAcceptanceDocx(options);
      const filename = getCleanSchoolFilename('BBNT');
      downloadBlob(blob, filename);

      if (onAddAuditLog) {
        onAddAuditLog('Tải file Word Biên bản Nghiệm thu', currentUser?.username || 'Admin', `Trường: ${school.name}`);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi sinh file Word Biên bản nghiệm thu!');
    } finally {
      setIsDownloadingBBNT(false);
    }
  };

  // Handle Download Mẫu 08a (.docx)
  const handleDownload08a = async () => {
    setIsDownloading08a(true);
    try {
      const options = buildDocOptions();
      const blob = await generateForm08aDocx(options);
      const filename = getCleanSchoolFilename('Mau_08a');
      downloadBlob(blob, filename);

      if (onAddAuditLog) {
        onAddAuditLog('Tải file Word Mẫu 08a Kho bạc', currentUser?.username || 'Admin', `Trường: ${school.name}`);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi sinh file Word Mẫu 08a!');
    } finally {
      setIsDownloading08a(false);
    }
  };

  // Handle Copy Text
  const handleCopyText = async () => {
    const options = buildDocOptions();
    const success = await copyAcceptanceTextToClipboard(options);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (onAddAuditLog) {
        onAddAuditLog('Sao chép nội dung Biên bản Nghiệm thu', currentUser?.username || 'Admin', `Trường: ${school.name}`);
      }
    } else {
      alert('Không thể sao chép văn bản vào bộ nhớ tạm.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6 my-8 animate-scaleIn max-h-[90vh] flex flex-col justify-between">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bảng Nghiệm Thu & Mẫu 8a In Ấn</h2>
              <p className="text-xs text-slate-500">Tạo file Word (.docx) chuẩn mẫu để in ấn, trình ký gửi Trường & Kho Bạc</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const preset = getMatchedPreset(school?.name || '');
                if (preset.contractNo) {
                  const resetMeta = {
                    schoolNameCustom: preset.schoolNameCustom || school?.name || '',
                    contractNo: preset.contractNo || `26/2025/HĐGD`,
                    contractDate: preset.contractDate || `2025-10-01`,
                    representativeName: preset.representativeName || school?.contactPerson || '',
                    representativePosition: preset.representativePosition || 'Hiệu Trưởng',
                    schoolTaxCode: preset.schoolTaxCode || (school as any)?.taxCode || '',
                    schoolAddress: preset.schoolAddress || school?.address || '',
                    schoolPhone: preset.schoolPhone || school?.phone || '',
                    docDate: getDefaultDocDate(reportMonth),
                    subjectName: preset.subjectName || 'Aerobic & Nhảy hiện đại',
                    form08aCode: preset.form08aCode || `MN/${school?.id?.slice(-3)?.toUpperCase() || '01'}`,
                    form08aNo: reportMonth.split('-')[1] || '01',
                    unitCode: '1071625',
                    sourceCode: '00',
                    contractValue: 95200000
                  };
                  setMeta(resetMeta);
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(resetMeta));
                  } catch (e) {}
                } else {
                  alert('Chưa tìm thấy hợp đồng mẫu khớp với tên trường này.');
                }
              }}
              className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border border-indigo-200"
              title="Khôi phục lại dữ liệu theo mẫu hợp đồng gốc"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Nạp lại Hợp đồng gốc</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="overflow-y-auto space-y-6 pr-2 flex-1">
          
          {/* IRIS SYSTEM NOTIFICATION BANNER */}
          {isIrisSystem && (
            <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <strong className="font-bold text-indigo-950">Hệ thống Trường IRIS (Môn Yoga):</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">Tự động cộng dồn tiết dạy và học phí tất cả 4 cơ sở (Thảo Điền, Gia Hoà, DXH, Q2/PVD) để xuất chung 1 Hóa đơn / Bảng Nghiệm Thu / Mẫu 08a.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-800 hover:text-indigo-950 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-xs transition active:scale-95">
                <input
                  type="checkbox"
                  checked={combineIris}
                  onChange={(e) => setCombineIris(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Gộp tất cả 4 cơ sở Iris</span>
              </label>
            </div>
          )}
          
          {/* SECTION 1: CẤU HÌNH THÔNG TIN HỢP ĐỒNG & NGHIỆM THU */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4 w-4 text-indigo-500" />
              <span>Thông tin Trường & Căn cứ Hợp Đồng</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600">Tên Trường/Đơn vị (Bên B):</label>
                <input
                  type="text"
                  value={meta.schoolNameCustom !== undefined ? meta.schoolNameCustom : school.name}
                  onChange={(e) => updateMetaField('schoolNameCustom', e.target.value)}
                  placeholder="Ví dụ: CÔNG TY TNHH GIÁO DỤC... / Trường MN Vịt Con"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Đại diện bên B (Hiệu Trưởng):</label>
                <input
                  type="text"
                  value={meta.representativeName}
                  onChange={(e) => updateMetaField('representativeName', e.target.value)}
                  placeholder="Ví dụ: Nguyễn Thị Út"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Chức vụ đại diện B:</label>
                <input
                  type="text"
                  value={meta.representativePosition}
                  onChange={(e) => updateMetaField('representativePosition', e.target.value)}
                  placeholder="Hiệu Trưởng / Phó Hiệu Trưởng"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Địa chỉ Bên B:</label>
                <input
                  type="text"
                  value={meta.schoolAddress}
                  onChange={(e) => updateMetaField('schoolAddress', e.target.value)}
                  placeholder="Nhập địa chỉ bên B..."
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Điện thoại Bên B:</label>
                <input
                  type="text"
                  value={meta.schoolPhone}
                  onChange={(e) => updateMetaField('schoolPhone', e.target.value)}
                  placeholder="Ví dụ: (028) 38976743..."
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Mã Số Thuế Trường / Bên B:</label>
                <input
                  type="text"
                  value={meta.schoolTaxCode}
                  onChange={(e) => updateMetaField('schoolTaxCode', e.target.value)}
                  placeholder="Nhập mã số thuế..."
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Số Hợp Đồng:</label>
                <input
                  type="text"
                  value={meta.contractNo}
                  onChange={(e) => updateMetaField('contractNo', e.target.value)}
                  placeholder="Ví dụ: 26/2025/HĐGD"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Ngày ký Hợp Đồng:</label>
                <input
                  type="date"
                  value={meta.contractDate}
                  onChange={(e) => updateMetaField('contractDate', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Ngày lập bảng Nghiệm Thu:</label>
                <input
                  type="date"
                  value={meta.docDate}
                  onChange={(e) => updateMetaField('docDate', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600">Mã hiệu (Mẫu 08a):</label>
                <input
                  type="text"
                  value={meta.form08aCode}
                  onChange={(e) => updateMetaField('form08aCode', e.target.value)}
                  placeholder="Ví dụ: MN19/5"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Môn giảng dạy:</label>
                <input
                  type="text"
                  value={meta.subjectName}
                  onChange={(e) => updateMetaField('subjectName', e.target.value)}
                  placeholder="Aerobic / Yoga / Nhảy"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: BẢNG KÊ CHI TIẾT SỐ BUỔI/TIẾT THEO LỚP */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Chi tiết số tiết dạy & thành tiền theo Lớp ({reportMonth})</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Tổng số lớp: {classRows.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-mono font-bold uppercase border-b border-slate-200">
                    <th className="p-3 text-center">STT</th>
                    <th className="p-3">Tên Lớp</th>
                    <th className="p-3 text-center">ĐVT</th>
                    <th className="p-3 text-center">Số Tiết Thực Dạy</th>
                    <th className="p-3 text-right">Đơn Giá (VNĐ)</th>
                    <th className="p-3 text-right">Thành Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateClassRow(idx, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-center text-slate-500">Tiết</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={row.periods}
                          onChange={(e) => updateClassRow(idx, 'periods', e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={(e) => updateClassRow(idx, 'rate', e.target.value)}
                          className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-right font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatVNDNumber(row.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-bold">
                    <td colSpan={3} className="p-3 text-center uppercase tracking-wider text-xs">
                      TỔNG CỘNG THÁNG {reportMonth}
                    </td>
                    <td className="p-3 text-center text-yellow-300 font-mono text-sm">
                      {totalPeriods} tiết
                    </td>
                    <td className="p-3 text-right text-slate-400">—</td>
                    <td className="p-3 text-right text-emerald-300 font-mono text-sm">
                      {formatVNDNumber(totalAmount)} VNĐ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-900">
              <strong>Số tiền viết bằng chữ:</strong> <span className="italic font-semibold">{numberToVietnameseWords(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER WITH ACTION BUTTONS */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
            <span>{isCopied ? 'Đã chép văn bản' : 'Sao chép văn bản (Copy Text)'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
              title="Lưu hồ sơ trực tiếp vào ổ D:\Aerobic\Hợp Đồng 2023-2026\Bảng Nghiệm Thu & 8a\"
            >
              <HardDrive className="h-4 w-4" />
              <span>{isSavingToDrive ? 'Đang lưu kho...' : 'Lưu kho D:\\Aerobic (.docx)'}</span>
            </button>

            <button
              onClick={handleDownload08a}
              disabled={isDownloading08a}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-2xl text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading08a ? 'Đang tạo Mẫu 08a...' : 'Tải File Word Mẫu 08a (.docx)'}</span>
            </button>

            <button
              onClick={handleDownloadBBNT}
              disabled={isDownloadingBBNT}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloadingBBNT ? 'Đang tạo Biên bản...' : 'Tải File Word Biên Bản Nghiệm Thu (.docx)'}</span>
            </button>
          </div>
        </div>
        {savedSuccessMsg && (
          <div className="mt-2 text-right text-xs font-bold text-emerald-600 animate-pulse">
            ✅ {savedSuccessMsg}
          </div>
        )}

      </div>
    </div>
  );
}
