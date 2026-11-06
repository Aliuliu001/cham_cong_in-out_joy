# Ca Online và sửa cảnh báo giờ tuần — Kế hoạch thực hiện

> **For Hermes:** Implement task-by-task with tests before each fix. Do not deploy Apps Script automatically.

**Goal:** Ca Online vẫn chấm VÀO/RA và chụp ảnh như ca thường, nhưng không đòi GPS; đồng thời sửa cảnh báo giờ tuần để không làm thao tác RA hoặc chạy thử trong Apps Script bị treo lâu.

**Architecture:** `LICHLAM` là nguồn quyết định ca nào Online, không tin dữ liệu do trình duyệt tự gửi. Thêm/đọc một cột theo tên `Hình thức` với hai giá trị rõ ràng: `Tại trung tâm` và `Online`; cột có thể đặt ở cuối bảng để không phá các cột cũ. Khi VÀO/RA, backend tìm ca thực tế trong lịch rồi quyết định có bắt buộc GPS hay không. Cảnh báo giờ tuần chỉ đọc dữ liệu cần thiết trong tuần hiện tại và chạy sau RA theo cơ chế nhanh; Telegram không được làm chậm hoặc làm hỏng chấm công.

---

## 1. Sự cố đang xảy ra

- Hàm `testCanhBaoGioTuan()` hiện gọi báo cáo tuần đầy đủ. Luồng đó đi qua tính dữ liệu xuất Excel, bao gồm duyệt ca của cả tháng, đối chiếu snapshot và các lượt quên chấm theo năm. Với dữ liệu thật, cách này có thể vượt nhiều phút.
- Hàm kiểm tra đang được gọi sau thao tác RA. Dù đã có `try/catch`, thời gian xử lý dài vẫn làm nhân viên phải đợi trang trả kết quả; đây là không chấp nhận được.
- Chạy thử hoặc gửi cảnh báo không được tạo file Excel/Drive, không được lặp quét dữ liệu toàn tháng khi chỉ cần một người + một tuần.

## 2. Quy tắc chốt cho Ca Online

1. Ca có `Hình thức = Online`: vẫn bắt buộc chọn đúng mã, đúng ca, chụp ảnh, VÀO/RA và lưu giờ như bình thường; **không yêu cầu GPS, không kiểm tra bán kính 100m**, cột Khoảng cách ghi `Online — không áp dụng GPS`.
2. Ca `Tại trung tâm` hoặc cột Hình thức trống: giữ nguyên GPS + bán kính 100m + ảnh như hiện tại. Dữ liệu/lịch cũ không tự biến thành Online.
3. Ca Exception vẫn yêu cầu GPS + ảnh như luật hiện tại; không tự coi là Online.
4. Nếu nhân viên chọn ca không nằm trong lịch hoặc lịch có nhiều ca trùng gây không xác định được hình thức, chặn chấm và ghi rõ cần quản lý kiểm tra; không bỏ GPS theo dữ liệu do trình duyệt tự khai.
5. Báo cáo ngày/tháng/Excel thêm/giữ nhãn `Online` trong tên/ghi chú ca để quản lý đối chiếu. Giờ, KPI, gợi ý phép và quy tắc thiếu dấu vẫn như ca bình thường.

## 3. Task 1 — Thay nguồn cảnh báo giờ tuần nhanh, không treo

**Files:** `Code.gs`, `test_lichlam_telegram.js`, tạo `test_weekly_alert_fast.js` nếu cần.

- Viết test đỏ cho hàm `getGioTuanNhanh_(ma, ngay)`/tương đương: chỉ lấy các dòng của một nhân viên trong tuần Thứ Hai–Chủ nhật, ghép VÀO+RA, tính giờ thực tế; không gọi `getPayrollWorkbookData`, không tạo spreadsheet/file, không lặp qua ngày/ca ngoài tuần.
- Với dữ liệu tuần vắt tháng, đọc hai nguồn cần thiết (bản chốt của tháng nếu có, nếu không CHECK IN hiện tại) và khử trùng theo mã-ngày-ca. Exception đủ dấu hiển thị riêng, không cộng vào giờ xác nhận.
- Thay `guiCanhBaoGioTuan()` để chỉ tính người vừa RA và tuần của ngày RA, thay vì tính toàn bộ giáo viên. Hàm trả trong thời gian ngắn; nếu đọc lỗi, log lỗi và bỏ qua cảnh báo, không làm hỏng RA.
- `testCanhBaoGioTuan()` chỉ thử gửi một tin mẫu rõ ràng vào topic quản lý (không quét toàn bộ dữ liệu) hoặc nhận đúng một mã/ngày mẫu qua hàm nội bộ; không dùng làm cách quét dữ liệu tháng.
- Giữ chống gửi trùng theo `mã NV + thứ Hai đầu tuần + mốc 40/46`; chỉ ghi marker sau khi Telegram trả thành công.

## 4. Task 2 — Đọc cột Hình thức ở LỊCHLÀM an toàn

**Files:** `Code.gs`, `Index.html`, các test lịch/chấm công hiện có.

- Viết một bộ đọc header theo tên, nhận `Hình thức`/`Hinh thuc`; nếu không có cột thì mặc định Tại trung tâm. Không dùng số thứ tự cột cố định để tránh làm hỏng lịch hiện có.
- Tạo hàm nâng cấp nhẹ `nangCapHinhThucCaNhe()` chỉ thêm cột `Hình thức` khi còn thiếu, đặt giá trị mẫu `Tại trung tâm` cho các dòng cũ, không xóa/sắp xếp lại/ghi đè lịch. Không yêu cầu chạy `setup()` vì có thể xóa dữ liệu.
- Áp dữ liệu hợp lệ `Tại trung tâm`/`Online` cho phạm vi dòng gọn; khi người quản lý nhập giá trị khác, chấm công xử lý như Tại trung tâm và nêu rõ trong báo cáo lỗi/cảnh báo quản lý.

## 5. Task 3 — Chấm VÀO/RA Online

**Files:** `Index.html`, `Code.gs`, `test_exception_attendance.js` hoặc `test_online_attendance.js`.

- Trước khi yêu cầu vị trí trên màn hình, khi nhân viên chọn mã và ca, gọi backend/tải lịch để hiện nhãn rõ: `💻 Ca Online — không cần GPS, vẫn cần ảnh` hoặc `📍 Ca tại trung tâm — cần GPS và ảnh`.
- Chỉ bỏ yêu cầu GPS ở frontend cho ca Online để tránh trình duyệt hỏi quyền vô ích. Backend là lớp quyết định cuối: tra lịch theo mã/ngày/ca trước, Online mới chấp nhận `lat/lng` trống; ca tại trung tâm thiếu GPS vẫn từ chối.
- Lưu CHECK IN đúng cấu trúc cũ; cột Khoảng cách ghi nhãn Online thay vì số mét, ghi chú thêm `Hình thức: Online`. Không thay đổi cột, không làm các file export cũ lệch vị trí.
- Thông báo Telegram IN/OUT thêm `💻 Online` để quản lý nhận biết; không gửi tọa độ hay thông tin vị trí.
- Không thay đổi VẮNG và Exception: VẮNG vẫn làm từ xa như cũ, Exception vẫn GPS + ảnh.

## 6. Task 4 — Báo cáo, Excel và kiểm thử

**Files:** `Code.gs`, `BaoCao.html` nếu cần nhãn hiển thị, `test_payroll_v4.js`, `test_payroll_export.js`, test mới.

- Bổ sung nhãn hình thức ca vào chi tiết báo cáo/Excel mà không phá 25 cột app Bảng lương đang nhận: ưu tiên thêm vào `Ghi chú` trước; chỉ thêm cột mới sau khi kiểm tra app Bảng lương nhập theo tên hay vị trí.
- Test đủ các ca: Online IN/OUT không GPS + có ảnh thành công; Online thiếu ảnh thất bại; ca trung tâm thiếu GPS thất bại; ca trung tâm ngoài 100m thất bại; cột Hình thức trống giữ GPS; Exception Online vẫn cần GPS; báo cáo/Excel có nhãn Online.
- Test cảnh báo nhanh: 40:00 không gửi, 40:01 gửi một lần, 46:01 gửi thêm một lần; hai lần RA không gửi lặp; Telegram lỗi không hỏng RA; dữ liệu nhiều tháng không gọi luồng tạo Excel và không vượt thời gian test.
- Chạy đầy đủ Node tests, `node --check` cho Code.gs, `git diff --check`; kiểm trực tiếp trên Apps Script với một ca Online mẫu và một ca tại trung tâm mẫu sau khi triển khai Phiên bản mới.

## 7. Bước an toàn ngay lúc này

- Nếu `testCanhBaoGioTuan` còn xoay trên 4 phút: bấm **Dừng** (hình vuông/Stop) trong Nhật ký thực thi. Việc dừng không xóa CHECK IN, lịch hay gửi/đổi dữ liệu chấm công.
- Không bấm chạy lại hàm đó. Nó không phải cách thử tốt với dữ liệu hiện tại; Task 1 sẽ thay bằng thử gửi nhanh và an toàn.

## Cần anh xác nhận

- `Hình thức` chỉ có hai lựa chọn: `Tại trung tâm` và `Online`, đúng không?
- Với một ca ghi Online nhưng giáo viên muốn tự bật GPS, hệ thống vẫn **không lưu/kiểm GPS** để nhất quán, đúng không? (Đề xuất của em: đúng.)
