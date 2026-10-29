# Kế hoạch sửa bản xuất v4 (chưa triển khai Apps Script)

Nguồn: audit sau commit `a5865d6`. Bản mẫu hiện tại chỉ là offline, không phải file tải từ Google.

## Bước 1 — Ngăn gộp ca và đếm quota sai
- Thêm test đỏ cho hai ca lịch cùng tên khác giờ trong một ngày; hai Exception cũ thiếu ID; ca thiếu dấu thứ 4 và 5 cùng ngày; trùng snapshot.
- Mỗi ca cần ID bền vững; nếu dữ liệu cũ không đủ để phân biệt thì **đánh dấu cần quản lý xem**, không tự gộp/tự cộng giờ.
- Quota theo từng ca thực, sắp theo ngày+giờ; không đếm ca đang diễn ra như quên OUT.

## Bước 2 — Tuần vắt tháng và chồng giờ
- Test đỏ cho tuần vắt 2 tháng và hai Exception chồng giờ.
- Đọc cả hai tháng khi có snapshot; khi thiếu dữ liệu tuần kề, ghi `Chưa đủ dữ liệu tuần` và **không kết luận số giờ an toàn**. Tổng giờ kiểm soát tính hợp của các khoảng đã xác thực để tránh cộng đôi; lương vẫn chờ duyệt Exception.

## Bước 3 — Chốt tháng không mất bản cũ
- Test lỗi copy/rename giữa hai bản chốt, thiếu lịch; assert bản cũ và CHECK IN giữ nguyên.
- Chỉ chốt khi có đủ hai nguồn. Tạo bản tạm, xác nhận cả hai rồi mới thay bản chốt; khi lỗi rollback tên và dọn bản tạm an toàn. Trigger tự động không xóa dữ liệu hiện hành, có cách hoàn tất cặp thiếu.

## Bước 4 — Hợp đồng Bot và kiểm thử thực tế
- Test tất cả enum/25 cột/3 sheet, CSV BOM, 2 Exception, kỳ KPI/phép, `Mã dòng` ổn định và nhập lại không trùng. Kiểm tra URL download XLSX do Google xuất trên Apps Script thật, đọc lại bằng trình đọc độc lập; mẫu offline không thay thế được bước này.
- Sửa README/PLAN/TASKS/context/hướng dẫn Bot nhất quán, không đánh dấu hoàn thành trước khi test xanh.
- Push commit sau khi test tự động đạt. Anh dán Code.gs, Index.html, BaoCao.html một lượt rồi chạy Apps Script, tải file thật và gửi em kiểm. Bot Telegram lịch chỉ được bật sau khi có mã mới trong Script Properties và tin thử vào đúng nhóm `-1004452694903`.
