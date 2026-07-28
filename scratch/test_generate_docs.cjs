const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, BorderStyle, UnderlineType 
} = require('docx');
const fs = require('fs');

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
      groups.unshift(parseInt(numStr.substring(numStr.length - 3)));
      numStr = numStr.substring(0, numStr.length - 3);
    } else {
      groups.unshift(parseInt(numStr));
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

function formatVNDNumber(num) {
  return new Intl.NumberFormat('vi-VN').format(num);
}

// Build Bảng Nghiệm Thu Docx
function createAcceptanceDocument(data) {
  const {
    schoolName = "TRƯỜNG MẦM NON HOA HỒNG",
    schoolAddress = "Số 02 Đường C2, Phường Cát Lái, TP. Hồ Chí Minh",
    schoolPhone = "(028) 38976743",
    schoolTaxCode = "0310432264",
    representativeName = "Nguyễn Thị Út",
    representativePosition = "Hiệu Trưởng",
    contractNo = "26/2025/HĐGD",
    contractDate = "01/10/2025",
    docDateStr = "ngày 30 tháng 04 năm 2026",
    reportMonthStr = "tháng 4/2026",
    subjectName = "Aerobic & Nhảy hiện đại",
    classRows = [
      { name: "Lớp Mầm 1", periods: 10, rate: 72000, amount: 720000 },
      { name: "Lớp Chồi 1", periods: 15, rate: 72000, amount: 1080000 },
      { name: "Lớp Lá 1", periods: 15, rate: 72000, amount: 1080000 }
    ]
  } = data;

  const totalPeriods = classRows.reduce((sum, r) => sum + r.periods, 0);
  const totalAmount = classRows.reduce((sum, r) => sum + r.amount, 0);
  const totalAmountWords = numberToVietnameseWords(totalAmount);

  // Table rows for classes
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

  const dataTableRows = classRows.map((item, index) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.name })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tiết" })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.periods.toString() })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(item.rate) })], alignment: AlignmentType.RIGHT })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(item.amount) })], alignment: AlignmentType.RIGHT })] })
    ]
  }));

  const totalTableRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TỔNG CỘNG", bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3 }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalPeriods.toString(), bold: true })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "—" })], alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatVNDNumber(totalAmount), bold: true })], alignment: AlignmentType.RIGHT })] })
    ]
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeader, ...dataTableRows, totalTableRow]
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
              new Paragraph({ children: [new TextRun({ text: representativePosition.toUpperCase(), bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "\n\n\n" }),
              new Paragraph({ children: [new TextRun({ text: representativeName, bold: true })], alignment: AlignmentType.CENTER })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ]
  });

  return new Document({
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
          space: { after: 300 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `BIÊN BẢN NGHIỆM THU ${reportMonthStr.toUpperCase()}`, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          space: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `- Căn cứ Hợp đồng số: ${contractNo} ký ngày ${contractDate} giữa ${schoolName} và Công ty TNHH TMDV Nghệ Thuật Cầu Vồng.`, italic: true, size: 24 })],
          space: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Hôm nay, ${docDateStr}, chúng tôi gồm:`, size: 24 })],
          space: { after: 150 }
        }),
        new Paragraph({ children: [new TextRun({ text: "Bên A: CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGHỆ THUẬT CẦU VỒNG", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Địa chỉ: Số 41 Đường số 2, Khu Đô Thị Vạn Phúc, P. Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Điện thoại: 0785909929               Mã số thuế: 0317959691", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Tài khoản: 555283848 tại Ngân hàng ACB (Á Châu)", size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Người đại diện: Phạm Thanh An               Chức vụ: Giám Đốc", size: 24 })], space: { after: 150 } }),
        
        new Paragraph({ children: [new TextRun({ text: `Bên B: ${schoolName.toUpperCase()}`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Địa chỉ: ${schoolAddress}`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Điện thoại: ${schoolPhone}               Mã số thuế: ${schoolTaxCode}`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Người đại diện: ${representativeName}               Chức vụ: ${representativePosition}`, size: 24 })], space: { after: 200 } }),

        new Paragraph({ children: [new TextRun({ text: "Hai bên nhất trí lập biên bản nghiệm thu như sau:", size: 24 })], space: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: "Điều 1: Nội dung", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Bên A đã giảng dạy môn ${subjectName} cho Bên B ${reportMonthStr} chi tiết như sau:`, size: 24 })], space: { after: 150 } }),

        table,

        new Paragraph({ children: [new TextRun({ text: `Tổng số tiết thực dạy: ${totalPeriods} tiết`, bold: true, size: 24 })], space: { before: 150 } }),
        new Paragraph({ children: [new TextRun({ text: `Tổng số tiền cần thanh toán: ${formatVNDNumber(totalAmount)} VNĐ`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Số tiền bằng chữ: ${totalAmountWords}`, italic: true, size: 24 })], space: { after: 200 } }),

        new Paragraph({ children: [new TextRun({ text: "Điều 2: Kết luận", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `- Bên B đã kiểm tra đúng với số lượng tiết mà bên A đã dạy ${reportMonthStr}.`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `- Biên bản nghiệm thu được lập thành 02 bản, mỗi bên giữ 01 bản, có giá trị pháp lý như nhau.`, size: 24 })], space: { after: 300 } }),

        signatureTable
      ]
    }]
  });
}

// Test compilation
const doc = createAcceptanceDocument({});
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("scratch/BBNT_Hoa_Hong.docx", buffer);
  console.log("Success generated BBNT_Hoa_Hong.docx!");
});
