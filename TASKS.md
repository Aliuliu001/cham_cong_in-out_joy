# TASKS — Chấm công IN/OUT Joy

> Chỉ tick khi đã chạy test và kiểm tra kết quả thật. Mọi thay đổi giữ luồng một chiều Check IN/OUT → file xuất → Bảng lương.

## Đã xong

- [x] Gộp IN / OUT / VẮNG vào một sheet CHECK IN.
- [x] Báo cáo ngày/tháng; phát hiện Vắng không báo.
- [x] Xuất CSV/XLSX chấm công một chiều; CSV UTF-8 BOM; ưu tiên `CHECK IN - Tháng MM-yyyy` nếu có.

## Đợt nâng cấp đã chốt

### 1. Tài liệu và hợp đồng dữ liệu
- [ ] Cập nhật README/PLAN/context theo luật miễn trừ 4 lần, phép/KPI, Exception, 40/46 giờ và snapshot tháng.
- [ ] Ghi contract Excel 3 sheet + CSV gọn; giữ CSV 12 cột cũ không đổi.

### 2. Tính từng ca, miễn trừ và KPI
- [ ] Viết test RED: IN/OUT đầy đủ, trễ, ra sớm, quên IN, quên OUT, lần 1–4, lần 5, reset qua năm.
- [ ] Ca đủ IN/OUT tính theo giờ thực tế; trễ không mất giờ.
- [ ] Ca lịch thiếu IN/OUT lần 1–4 tính theo giờ lịch miễn trừ; lần 5 không tính công + KPI + câu nhắc đã chốt.
- [ ] Popup lần chấm sau: ca thiếu gần nhất + quota còn lại.

### 3. Kiểm soát giờ giáo viên
- [ ] Tổng giờ tuần Thứ Hai–Chủ nhật.
- [ ] CHECK IN từ 40 giờ/tuần trở lên cảnh báo liên hệ Ms. Vân Anh, không chặn chấm.
- [ ] Báo cáo mốc 46 giờ: còn lại / đủ / vượt; không tự tính overtime.

### 4. Vắng, phép và KPI theo ngày
- [ ] Ốm/việc gia đình + PH xin nghỉ báo trước giờ ca: không KPI, ghi Trừ phép/ghi chú đúng.
- [ ] Báo sau giờ ca: ghi số phút báo trễ + KPI.
- [ ] Nghỉ không báo: không công + KPI.
- [ ] File xuất liệt kê ngày, ca, lý do của từng ảnh hưởng KPI/phép.

### 5. Chốt tháng
- [ ] Nút `🔒 Chốt tháng MM/yyyy` tạo CHECK IN + LICHLAM snapshot dễ nhìn.
- [ ] Không ghi đè snapshot khi chưa xác nhận.
- [ ] Export tháng cũ ưu tiên cả hai snapshot; cảnh báo nếu thiếu lịch snapshot.

### 6. Exception
- [ ] Nút CHECK IN/OUT CA ĐỘT XUẤT, lý do bắt buộc, ảnh + GPS.
- [ ] Exception đủ dấu: Chờ duyệt, không tự cộng 46 giờ/lương.
- [ ] Exception thiếu đầu 1–3 trong tháng: Chờ duyệt; từ lần thiếu đầu thứ 4: không tính giờ.
- [ ] Exception không dùng quota 4 lần miễn trừ ca lịch.
- [ ] Chặn Exception mở trùng/chồng giờ.

### 7. Báo cáo và file xuất
- [ ] Khối `⚠️ Cần xử lý`, `🕒 Giờ giáo viên theo tuần`, `✅ Ca được tính giờ?`.
- [ ] Excel `Tong hop GV`, `Chi tiet ca`, `Gio tuan`.
- [ ] CSV gọn theo Chi tiet ca; giữ CSV 12 cột cũ.

### 8. Kiểm tra và bàn giao
- [ ] Node test PASS + kiểm tra syntax Code.gs/Index.html/BaoCao.html + git diff --check.
- [ ] Push GitHub.
- [ ] Anh dán Code.gs/Index.html/BaoCao.html vào Apps Script và triển khai Phiên bản mới.
- [ ] Test thật toàn bộ tình huống và xác nhận không có thao tác xem/xuất nào ghi sửa dữ liệu nguồn.
