const fs = require('fs');

// Read database or inspect schools from server/db
// Let's create a preset map of contract info by matching school name keywords
const PRESET_CONTRACTS = {
  // Key: lowercase school name keyword -> Contract metadata
  "bàn tay vàng": {
    contractNo: "01/2026/HĐGD",
    contractDate: "2026-01-01",
    schoolNameCustom: "TRƯỜNG MẦM NON BÀN TAY VÀNG",
    schoolAddress: "Số 12 Đường 34, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "0903.694.345",
    schoolTaxCode: "0318738398",
    representativeName: "Bùi Thị Mến",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Aerobic & Nhảy hiện đại"
  },
  "vịt con": {
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
  "1 tháng 6": {
    contractNo: "04/2026/HĐGD",
    contractDate: "2026-03-02",
    schoolNameCustom: "CÔNG TY TNHH ĐẦU TƯ VÀ PHÁT TRIỂN GIÁO DỤC CHẤT LƯỢNG CAO 1 THÁNG 6",
    schoolAddress: "Số 12 Đường 26, KP7, Phường Cát Lái, TP. Hồ Chí Minh",
    schoolPhone: "0986 218 089",
    schoolTaxCode: "0318743416",
    representativeName: "PHẠM UYÊN PHƯƠNG",
    representativePosition: "GIÁM ĐỐC",
    subjectName: "Aerobic & Nhảy hiện đại"
  },
  "sunshine": {
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
  "nhà bé yêu": {
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
  "ngôi nhà bé yêu": {
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
  "abc": {
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
  "thiện mỹ": {
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
  "sao vui": {
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
  "rạng đông": {
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
  "ngôi nhà mơ ước": {
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
  "bồ công anh": {
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
  "thành phố trẻ thơ": {
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
  "ánh cầu vồng": {
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
  "tuổi tiên": {
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
  "ngôi nhà phía đông": {
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
  "hoa hồng": {
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
  "iris": {
    contractNo: "24/2025/HĐGD",
    contractDate: "2025-11-01",
    schoolNameCustom: "CÔNG TY TNHH GIÁO DỤC QUỐC TẾ IRIS",
    schoolAddress: "44 Nguyễn Duy Hiệu, Phường An Khánh, TP. Hồ Chí Minh",
    schoolPhone: "(028) 7306 6137",
    schoolTaxCode: "0313758698",
    representativeName: "Trần Thị Thu",
    representativePosition: "Phó Giám Đốc",
    subjectName: "Yoga & Aerobic"
  },
  "inkindy": {
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
  "19.5": {
    contractNo: "17/-HĐAEROBICMN",
    contractDate: "2025-10-01",
    schoolNameCustom: "TRƯỜNG MẦM NON 19-5",
    schoolAddress: "Phường Hiệp Bình Phước, TP. Thủ Đức, TP. Hồ Chí Minh",
    schoolPhone: "",
    schoolTaxCode: "1071625",
    representativeName: "Nguyễn Thị Kim Thanh",
    representativePosition: "Hiệu Trưởng",
    subjectName: "Giảng dạy Thể dục Nhịp điệu"
  },
  "an khánh": {
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
};

console.log("Presets defined:", Object.keys(PRESET_CONTRACTS).length);
