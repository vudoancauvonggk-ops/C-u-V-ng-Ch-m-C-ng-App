const fs = require('fs');
const path = require('path');
const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle, UnderlineType 
} = require('docx');

const DEST_BASE = 'D:\\Aerobic\\Hợp Đồng 2023-2026\\Bảng Nghiệm Thu & 8a';

function sanitizeFilename(name) {
  if (!name) return 'Truong';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

function formatVNDNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

function numberToVietnameseWords(number) {
  if (number === 0) return "Không đồng";
  if (!number || isNaN(number)) return "";

  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  function readThreeDigits(num, showZeroHundred = false) {
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
  let groups = [];
  
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

  return words;
}

function formatDateToVietnamese(dateStr) {
  if (!dateStr) return "ngày ... tháng ... năm ...";
  const [y, m, d] = dateStr.split("-");
  return `ngày ${parseInt(d)} tháng ${parseInt(m)} năm ${y}`;
}

function formatMonthToVietnamese(monthStr) {
  if (!monthStr) return "Tháng ...";
  const [y, m] = monthStr.split("-");
  return `Tháng ${parseInt(m)}/ năm ${y}`;
}

async function createAcceptanceDocBuffer(options) {
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

  const tableHeader = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 8, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TÊN LỚP", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 36, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ĐVT", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SỐ TIẾT", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ĐƠN GIÁ", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 16, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "THÀNH TIỀN", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 18, type: WidthType.PERCENTAGE } }),
    ]
  });

  const tableRows = classRows.map((row, idx) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, size: 22 })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: row.name, size: 22 })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tiết", size: 22 })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${row.periods}`, size: 22 })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${formatVNDNumber(row.rate)}`, size: 22 })], alignment: AlignmentType.RIGHT })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${formatVNDNumber(row.amount)}`, size: 22 })], alignment: AlignmentType.RIGHT })] }),
    ]
  }));

  const tableTotalRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TỔNG CỘNG", bold: true, size: 22 })], alignment: AlignmentType.CENTER })], columnSpan: 3 }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${totalPeriods}`, bold: true, size: 22 })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "—", size: 22 })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${formatVNDNumber(totalAmount)} VNĐ`, bold: true, size: 22 })], alignment: AlignmentType.RIGHT })] }),
    ]
  });

  const detailTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeader, ...tableRows, tableTotalRow]
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "Độc lập – Tự do – Hạnh phúc", bold: true, underline: { type: UnderlineType.SINGLE }, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
        new Paragraph({ children: [new TextRun({ text: `BIÊN BẢN NGHIỆM THU ${monthFormatted.toUpperCase()}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `- Căn cứ Hợp đồng số: ${contractNo || '...'} ký ngày ${contractDate || '...'} giữa ${schoolName} và Công ty TNHH TMDV Nghệ Thuật Cầu Vồng`, italic: true, size: 22 })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `Hôm nay, ${docDateFormatted}, chúng tôi gồm:`, italic: true, size: 24 })], spacing: { after: 150 } }),
        new Paragraph({ children: [new TextRun({ text: "Bên A: CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGHỆ THUẬT CẦU VỒNG", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Địa chỉ: Số 41 Đường số 2, Khu Đô Thị Vạn Phúc, Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh", size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: "Điện thoại: 0785909929        Mã số thuế: 0317959691", size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: "Tài khoản: 555283848 tại Ngân hàng ACB (Á Châu)", size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: "Người đại diện: Phạm Thanh An - Chức vụ: Giám Đốc", size: 22 })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `Bên B: ${schoolName}`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Địa chỉ: ${schoolAddress || 'Chưa cập nhật'}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Điện thoại: ${schoolPhone || 'Chưa cập nhật'}      Mã số thuế: ${schoolTaxCode || 'Chưa cập nhật'}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Người đại diện: ${representativeName || '...'}          Chức vụ: ${representativePosition || 'Hiệu Trưởng'}`, size: 22 })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Hai bên nhất trí lập biên bản nghiệm thu như sau:", size: 24 })], spacing: { after: 150 } }),
        new Paragraph({ children: [new TextRun({ text: "Điều 1: Nội dung", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `  Bên A đã giảng dạy môn ${subjectName} cho bên B ${monthFormatted.toLowerCase()} chi tiết như sau:`, size: 24 })], spacing: { after: 150 } }),
        detailTable,
        new Paragraph({ children: [new TextRun({ text: `=> Tổng số tiết thực dạy: ${totalPeriods} tiết`, bold: true, size: 24 })], spacing: { before: 150 } }),
        new Paragraph({ children: [new TextRun({ text: `=> Tổng số tiền cần thanh toán: ${formatVNDNumber(totalAmount)} VNĐ`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Số tiền bằng chữ: ${totalAmountWords}`, italic: true, size: 24 })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Điều 2: Kết luận", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `- Bên B đã kiểm tra đúng với số lượng tiết mà bên A đã dạy ${monthFormatted.toLowerCase()}`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "- Biên bản nghiệm thu được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như nhau.", size: 24 })], spacing: { after: 300 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN BÊN A", bold: true, size: 24 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "GIÁM ĐỐC", bold: true, size: 22 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "\n\n\n\nPhạm Thanh An", bold: true, size: 24 })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN BÊN B", bold: true, size: 24 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: (representativePosition || "HIỆU TRƯỞNG").toUpperCase(), bold: true, size: 22 })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: `\n\n\n\n${representativeName || ''}`, bold: true, size: 24 })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
              ]
            })
          ]
        })
      ]
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  DEST_BASE,
  sanitizeFilename,
  formatVNDNumber,
  numberToVietnameseWords,
  createAcceptanceDocBuffer
};
