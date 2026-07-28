import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle, UnderlineType 
} from 'docx';

export interface ClassBreakdownItem {
  id?: string;
  name: string;
  periods: number;
  rate: number;
  amount: number;
}

export interface AcceptanceDocOptions {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolTaxCode: string;
  representativeName: string;
  representativePosition: string;
  contractNo: string;
  contractDate: string;
  docDate: string; // YYYY-MM-DD
  reportMonth: string; // YYYY-MM
  subjectName: string;
  classRows: ClassBreakdownItem[];
  form08aCode?: string;
  form08aNo?: string;
  unitCode?: string;
  sourceCode?: string;
  contractValue?: number;
}

export function numberToVietnameseWords(number: number): string {
  if (number === 0) return "Không đồng";
  if (!number || isNaN(number)) return "";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  function readThreeDigits(num: number, showZeroHundred = false): string {
    let hundred = Math.floor(num / 100);
    let ten = Math.floor((num % 100) / 10);
    let unit = num % 10;
    let res = "";

    if (hundred > 0 || showZeroHundred) {
      res += units[hundred] + " trăm ";
    }

    if (ten > 1) {
      res += units[ten] + " mươi ";
      if (unit === 1) res += "mốt ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += units[unit] + " ";
    } else if (ten === 1) {
      res += "mười ";
      if (unit === 1) res += "một ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += units[unit] + " ";
    } else {
      if ((hundred > 0 || showZeroHundred) && unit > 0) {
        res += "lẻ ";
      }
      if (unit > 0) {
        res += units[unit] + " ";
      }
    }

    return res;
  }

  let numStr = Math.round(Math.abs(number)).toString();
  let groups: number[] = [];
  
  while (numStr.length > 0) {
    if (numStr.length >= 3) {
      groups.unshift(parseInt(numStr.substring(numStr.length - 3), 10));
      numStr = numStr.substring(0, numStr.length - 3);
    } else {
      groups.unshift(parseInt(numStr, 10));
      numStr = "";
    }
  }

  const groupUnits = ["", "ngàn", "triệu", "tỷ", "ngàn tỷ", "triệu tỷ"];
  let words = "";

  for (let i = 0; i < groups.length; i++) {
    let g = groups[i];
    let unitIndex = groups.length - 1 - i;
    if (g > 0) {
      let showZero = i > 0;
      let gWords = readThreeDigits(g, showZero);
      words += gWords + groupUnits[unitIndex] + " ";
    }
  }

  words = words.trim();
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1) + " đồng";
  }

  return words.replace(/\s+/g, ' ');
}

export function formatVNDNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

export function formatDateToVietnamese(dateStr: string): string {
  if (!dateStr) return "ngày ... tháng ... năm ...";
  const [yyyy, mm, dd] = dateStr.split('-');
  if (!yyyy || !mm || !dd) return dateStr;
  return `ngày ${parseInt(dd, 10)} tháng ${parseInt(mm, 10)} năm ${yyyy}`;
}

export function formatMonthToVietnamese(monthStr: string): string {
  if (!monthStr) return "Tháng ...";
  const [yyyy, mm] = monthStr.split('-');
  if (!yyyy || !mm) return monthStr;
  return `Tháng ${parseInt(mm, 10)}/${yyyy}`;
}

/**
 * Download Blob as a file in browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate BIÊN BẢN NGHIỆM THU Word (.docx) Document
 */
export async function generateAcceptanceDocx(options: AcceptanceDocOptions): Promise<Blob> {
  const {
    schoolName,
    schoolAddress,
    schoolPhone,
    schoolTaxCode,
    representativeName,
    representativePosition,
    contractNo,
    contractDate,
    docDate,
    reportMonth,
    subjectName,
    classRows
  } = options;

  const totalPeriods = classRows.reduce((sum, r) => sum + (r.periods || 0), 0);
  const totalAmount = classRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalAmountWords = numberToVietnameseWords(totalAmount);
  const docDateFormatted = formatDateToVietnamese(docDate);
  const monthFormatted = formatMonthToVietnamese(reportMonth);

  // Table header
  const tableHeader = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 8, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung / Lớp học", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 38, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ĐVT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số tiết", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 14, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đơn giá (VNĐ)", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thành tiền (VNĐ)", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } })
    ]
  });

  const dataRows = classRows.map((item, index) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.name })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tiết" })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.periods.toString() })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(item.rate) })], alignment: AlignmentType.RIGHT })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(item.amount) })], alignment: AlignmentType.RIGHT })] })
    ]
  }));

  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TỔNG CỘNG", bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3 }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalPeriods.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "—" })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(totalAmount), bold: true })], alignment: AlignmentType.RIGHT })] })
    ]
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeader, ...dataRows, totalRow]
  });

  // Signature Table (2 Columns, no border)
  const borderNone = { style: BorderStyle.NONE, size: 0, color: "auto" };
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderNone, bottom: borderNone, left: borderNone, right: borderNone,
      insideHorizontal: borderNone, insideVertical: borderNone
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN BÊN A", bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "GIÁM ĐỐC", bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "\n\n\n" }),
              new Paragraph({ children: [new TextRun({ text: "Phạm Thanh An", bold: true })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN BÊN B", bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: (representativePosition || "HIỆU TRƯỞNG").toUpperCase(), bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "\n\n\n" }),
              new Paragraph({ children: [new TextRun({ text: representativeName || "Đại diện Trường", bold: true })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1700, right: 1130 }
        }
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 })],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new TextRun({ text: "Độc lập – Tự do – Hạnh phúc", bold: true, size: 24, underline: { type: UnderlineType.SINGLE } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `BIÊN BẢN NGHIỆM THU ${monthFormatted.toUpperCase()}`, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `- Căn cứ Hợp đồng số: ${contractNo || '...'} ký ngày ${contractDate || '...'} giữa ${schoolName} và Công ty TNHH TMDV Nghệ Thuật Cầu Vồng.`, italics: true, size: 24 })],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Hôm nay, ${docDateFormatted}, chúng tôi gồm:`, size: 24 })],
          spacing: { after: 150 }
        }),
        new Paragraph({ children: [new TextRun({ text: "Bên A: CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGHỆ THUẬT CẦU VỒNG", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Địa chỉ: Số 41 Đường số 2, Khu Đô Thị Vạn Phúc, P. Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Điện thoại: 0785909929               Mã số thuế: 0317959691", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Tài khoản: 555283848 tại Ngân hàng ACB (Á Châu)", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Người đại diện: Phạm Thanh An               Chức vụ: Giám Đốc", size: 24 })], spacing: { after: 150 } }),
        
        new Paragraph({ children: [new TextRun({ text: `Bên B: ${schoolName.toUpperCase()}`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Địa chỉ: ${schoolAddress || 'Chưa cập nhật'}`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Điện thoại: ${schoolPhone || 'Chưa cập nhật'}               Mã số thuế: ${schoolTaxCode || 'Chưa cập nhật'}`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Người đại diện: ${representativeName || '...'}               Chức vụ: ${representativePosition || 'Hiệu Trưởng'}`, size: 24 })], spacing: { after: 200 } }),

        new Paragraph({ children: [new TextRun({ text: "Hai bên nhất trí lập biên bản nghiệm thu như sau:", size: 24 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Điều 1: Nội dung", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Bên A đã giảng dạy môn ${subjectName} cho Bên B ${monthFormatted.toLowerCase()} chi tiết như sau:`, size: 24 })], spacing: { after: 150 } }),

        table,

        new Paragraph({ children: [new TextRun({ text: `Tổng số tiết thực dạy: ${totalPeriods} tiết`, bold: true, size: 24 })], spacing: { before: 150 } }),
        new Paragraph({ children: [new TextRun({ text: `Tổng số tiền cần thanh toán: ${formatVNDNumber(totalAmount)} VNĐ`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Số tiền bằng chữ: ${totalAmountWords}`, italics: true, size: 24 })], spacing: { after: 200 } }),

        new Paragraph({ children: [new TextRun({ text: "Điều 2: Kết luận", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `- Bên B đã kiểm tra đúng với số lượng tiết mà bên A đã dạy ${monthFormatted.toLowerCase()}.`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `- Biên bản nghiệm thu được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như nhau.`, size: 24 })], spacing: { after: 300 } }),

        signatureTable
      ]
    }]
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate MẪU SỐ 08a (Kho Bạc / Ngân Sách) Word (.docx) Document
 */
export async function generateForm08aDocx(options: AcceptanceDocOptions): Promise<Blob> {
  const {
    schoolName,
    representativeName,
    contractNo,
    contractDate,
    docDate,
    reportMonth,
    subjectName,
    classRows,
    form08aCode = "MN/01",
    form08aNo = "01",
    unitCode = "1071625",
    sourceCode = "00",
    contractValue = 95200000
  } = options;

  const totalPeriods = classRows.reduce((sum, r) => sum + (r.periods || 0), 0);
  const totalAmount = classRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalAmountWords = numberToVietnameseWords(totalAmount);
  const contractValueWords = numberToVietnameseWords(contractValue);
  const docDateFormatted = formatDateToVietnamese(docDate);
  const monthFormatted = formatMonthToVietnamese(reportMonth);

  // Header 6 column table according to Form 08a
  const tableHeader1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 8, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung công việc", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đơn vị tính", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số lượng", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đơn giá", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 14, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thành tiền", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 14, type: WidthType.PERCENTAGE } })
    ]
  });

  const tableHeader2 = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(1)", italics: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(2)", italics: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(3)", italics: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(4)", italics: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(5)", italics: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(6)", italics: true })], alignment: AlignmentType.CENTER })] })
    ]
  });

  const dataRows = classRows.map((item, index) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Giảng dạy ${subjectName} - ${item.name}` })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tiết" })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.periods.toString() })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(item.rate) })], alignment: AlignmentType.RIGHT })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(item.amount) })], alignment: AlignmentType.RIGHT })] })
    ]
  }));

  const totalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Tổng số thu học phí ${monthFormatted.toLowerCase()}`, bold: true })], alignment: AlignmentType.LEFT })], columnSpan: 5 }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(totalAmount), bold: true })], alignment: AlignmentType.RIGHT })] })
    ]
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeader1, tableHeader2, ...dataRows, totalRow]
  });

  // Signature Table for Form 08a
  const borderNone = { style: BorderStyle.NONE, size: 0, color: "auto" };
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderNone, bottom: borderNone, left: borderNone, right: borderNone,
      insideHorizontal: borderNone, insideVertical: borderNone
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN NHÀ CUNG CẤP HÀNG HÓA, DỊCH VỤ", bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "\n\n\n\n" }),
              new Paragraph({ children: [new TextRun({ text: "PHẠM THANH AN", bold: true })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: docDateFormatted, italics: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN ĐƠN VỊ SỬ DỤNG NGÂN SÁCH", bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "\n\n\n\n" }),
              new Paragraph({ children: [new TextRun({ text: (representativeName || "HIỆU TRƯỞNG").toUpperCase(), bold: true })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1700, right: 1130 }
        }
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: `Mẫu số 08a\nMã hiệu: ${form08aCode}\nSố: ${form08aNo}/${reportMonth.split('-')[0]}`, bold: true, size: 20 })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 150 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "BẢNG XÁC ĐỊNH GIÁ TRỊ KHỐI LƯỢNG CÔNG VIỆC HOÀN THÀNH", bold: true, size: 26 })],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new TextRun({ text: "(áp dụng đối với các khoản chi khoản chi thường xuyên, chi sự nghiệp có tính chất thường xuyên, chi chương trình mục tiêu quốc gia, chương trình mục tiêu sử dụng kinh phí sự nghiệp)", italics: true, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `1. Đơn vị sử dụng ngân sách: ${schoolName.toUpperCase()}`, bold: true, size: 24 })] }),
        new Paragraph({
          children: [new TextRun({ text: `2. Mã đơn vị: ${unitCode}      Mã nguồn: ${sourceCode}`, size: 24 })] }),
        new Paragraph({
          children: [new TextRun({ text: "3. Mã CTMTQG, Dự án ODA: ...", size: 24 })] }),
        new Paragraph({
          children: [new TextRun({ text: `4. Căn cứ Hợp đồng số ${contractNo || '...'} ký ngày ${contractDate || '...'} giữa ${schoolName} và Công Ty TNHH THƯƠNG MẠI DỊCH VỤ NGHỆ THUẬT CẦU VỒNG; Giá trị hợp đồng và các phụ lục hợp đồng đã ký: ${formatVNDNumber(contractValue)} đồng (Ghi bằng chữ: ${contractValueWords})`, size: 24 })] }),
        new Paragraph({
          children: [new TextRun({ text: `5. Căn cứ Biên bản nghiệm thu ${docDateFormatted} giữa ${schoolName} và Công Ty TNHH THƯƠNG MẠI DỊCH VỤ NGHỆ THUẬT CẦU VỒNG:`, size: 24 })],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "Đơn vị: Đồng", italics: true, size: 20 })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 100 }
        }),

        table,

        new Paragraph({ children: [new TextRun({ text: "6. Lũy kế thanh toán khối lượng hoàn thành đến cuối kỳ trước: ....................", size: 24 })], spacing: { before: 150 } }),
        new Paragraph({ children: [new TextRun({ text: "   - Thanh toán tạm ứng:                - Thanh toán trực tiếp:", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "7. Số dư tạm ứng đến cuối kỳ trước: ....................", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `8. Số đề nghị thanh toán kỳ này: ${formatVNDNumber(totalAmount)} đồng (${totalAmountWords})`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "   - Thanh toán tạm ứng:", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `   - Thanh toán trực tiếp: ${formatVNDNumber(totalAmount)} đồng (${totalAmountWords})`, size: 24 })], spacing: { after: 300 } }),

        signatureTable
      ]
    }]
  });

  return await Packer.toBlob(doc);
}

/**
 * Helper to copy Acceptance Document text format to clipboard
 */
export async function copyAcceptanceTextToClipboard(options: AcceptanceDocOptions): Promise<boolean> {
  const {
    schoolName,
    schoolAddress,
    schoolPhone,
    schoolTaxCode,
    representativeName,
    representativePosition,
    contractNo,
    contractDate,
    docDate,
    reportMonth,
    subjectName,
    classRows
  } = options;

  const totalPeriods = classRows.reduce((sum, r) => sum + (r.periods || 0), 0);
  const totalAmount = classRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalAmountWords = numberToVietnameseWords(totalAmount);
  const docDateFormatted = formatDateToVietnamese(docDate);
  const monthFormatted = formatMonthToVietnamese(reportMonth);

  const lines = [
    "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập – Tự do – Hạnh phúc",
    "---------------------------------",
    `BIÊN BẢN NGHIỆM THU ${monthFormatted.toUpperCase()}`,
    `- Căn cứ Hợp đồng số: ${contractNo || '...'} ký ngày ${contractDate || '...'} giữa ${schoolName} và Công ty TNHH TMDV Nghệ Thuật Cầu Vồng`,
    "",
    `Hôm nay, ${docDateFormatted}, chúng tôi gồm:`,
    "Bên A: CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGHỆ THUẬT CẦU VỒNG",
    "Địa chỉ : Số 41 Đường số 2, Khu Đô Thị Vạn Phúc, Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh",
    "Điện thoại: 0785909929        Mã số thuế: 0317959691",
    "Tài khoản: 555283848 tại Ngân hàng ACB (Á Châu)",
    "Người đại diện: Phạm Thanh An - Chức vụ: Giám Đốc",
    "",
    `Bên B: ${schoolName}`,
    `Địa chỉ : ${schoolAddress || 'Chưa cập nhật'}`,
    `Điện thoại : ${schoolPhone || 'Chưa cập nhật'}      Mã số thuế: ${schoolTaxCode || 'Chưa cập nhật'}`,
    `Người đại diện: ${representativeName || '...'}          Chức vụ: ${representativePosition || 'Hiệu Trưởng'}`,
    "",
    "Hai bên nhất trí lập biên bản nghiệm thu như sau:",
    "Điều 1: Nội dung",
    ` Bên A đã giảng dạy môn ${subjectName} cho bên B ${monthFormatted.toLowerCase()} chi tiết như sau:`,
    ...classRows.map((c) => ` + ${c.name}: ${c.periods} tiết x ${formatVNDNumber(c.rate)}đ/tiết = ${formatVNDNumber(c.amount)} VNĐ`),
    `=> Tổng số tiết thực dạy: ${totalPeriods} tiết`,
    `=> Tổng số tiền cần thanh toán: ${formatVNDNumber(totalAmount)} VNĐ`,
    `Số tiền bằng chữ: ${totalAmountWords}`,
    "",
    "Điều 2: Kết luận",
    `- Bên B đã kiểm tra đúng với số lượng tiết mà bên A đã dạy ${monthFormatted.toLowerCase()}`,
    "- Biên bản nghiệm thu được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như nhau.",
    "",
    "   ĐẠI DIỆN BÊN A                                   ĐẠI DIỆN BÊN B",
    "      GIÁM ĐỐC                                       " + (representativePosition || "HIỆU TRƯỞNG").toUpperCase(),
    "   Phạm Thanh An                                     " + (representativeName || "")
  ];

  const fullText = lines.join("\n");
  try {
    await navigator.clipboard.writeText(fullText);
    return true;
  } catch (err) {
    console.error("Copy failed:", err);
    return false;
  }
}
