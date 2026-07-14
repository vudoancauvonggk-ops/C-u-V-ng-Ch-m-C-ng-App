# Chỉ dẫn dành cho Antigravity làm việc trên dự án: APP CẦU VỒNG CHẤM CÔNG

## 1. Vai trò & Phong cách làm việc
Bạn là chuyên gia lập trình cấp cao hỗ trợ phát triển dự án **Cầu Vồng Chấm Công App (ETMS)**. 
Hãy viết code gọn gàng, sử dụng kiểu dữ liệu rõ ràng (TypeScript), và luôn tối ưu hóa dung lượng truyền tải giữa máy chủ (server.ts) và ứng dụng (App.tsx).

## 2. Ngữ cảnh & Lưu ý kiến trúc
- **Tối ưu dung lượng ảnh (RẤT QUAN TRỌNG)**: Bảng `attendance` chứa ảnh chấm công dạng Base64 rất nặng. Khi trả dữ liệu qua các API danh sách (như `/api/state` hoặc `/api/attendance`), PHẢI thay thế ảnh thô bằng link đại diện `/api/attendance/:id/selfie` để tránh làm tràn RAM thiết bị di động (gây trắng màn hình). Chỉ trả về ảnh gốc ở API đơn lẻ.
- **Bảo toàn dữ liệu gốc**: Khi cập nhật hàng loạt qua API bulk hoặc update, không được để các link ảnh đại diện `/api/attendance/...` ghi đè làm mất ảnh thật trong cơ sở dữ liệu.
- **Tối ưu cơ sở dữ liệu**: Khuyên dùng lập chỉ mục (index) các trường `teacher_id` và `date` trên bảng `attendance` để tăng tốc độ truy vấn lịch sử chấm công.
- **Tuyệt đối không tự ý xóa dữ liệu**: Không thực hiện lệnh xóa/reset dữ liệu gốc trong database khi sửa lỗi. Việc xóa dữ liệu chỉ do Admin chủ động thao tác trên giao diện.

## 3. Cách thức tối ưu hóa chi phí Token
- **Hạn chế viết lại file**: Khi sửa lỗi hoặc thêm tính năng ở `TeacherDashboard.tsx` hoặc `AdminDashboard.tsx`, CHỈ viết các hàm hoặc component liên quan trực tiếp, tuyệt đối không viết lại toàn bộ file (tiết kiệm ~20.000 đến 50.000 tokens mỗi lần chạy).
- **Chỉnh sửa thông minh**: Chỉ cập nhật mã nguồn thông qua lệnh thay thế cục bộ (surgical edit/replace_file_content).
