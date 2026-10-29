# Hợp đồng dữ liệu Chấm công → Bot Bảng lương v4

**Trạng thái:** File mẫu `Cham_cong_tinh_luong_11-2026_MAU_V4.xlsx` dùng dữ liệu giả, được tạo từ bộ dựng hàng của Code.gs và kiểm tra cấu trúc bằng openpyxl. Chưa phải file tải trực tiếp từ Apps Script đang chạy; cần kiểm chứng sau khi anh dán/deploy.

## Luồng dữ liệu

App Chấm công xuất `Cham_cong_tinh_luong_MM-YYYY.xlsx` → Bot Bảng lương nhập, xem trước và quản lý duyệt → tính lương trong repo riêng. **Không ghi ngược** CHECK IN, LICHLAM, KPI hoặc snapshot. CSV 12 cột cũ chỉ dành cho tương thích, không dùng làm chuẩn nhập v4.

Excel gồm đúng ba sheet: `Tong hop GV`, `Chi tiet ca`, `Gio tuan`. Hàng tiêu đề cố định. Mã NV là chuỗi để giữ số 0 đầu.

## `Chi tiet ca` — nguồn chính (25 cột, đúng thứ tự)

1. `Mã dòng` — mã ca ổn định để nhập lại không cộng trùng. Exception mới có ID riêng do hệ thống tạo khi IN và giữ nguyên khi OUT.
2. `Mã NV`
3. `Họ tên`
4. `Ngày` — DD/MM/YYYY.
5. `Loại ca` — `Ca lịch` hoặc `Ca đột xuất`.
6. `Tên ca`
7. `Giờ VÀO` — HH:mm hoặc để trống.
8. `Giờ RA` — HH:mm hoặc để trống.
9. `Số giờ thực tế` — OUT − IN; thiếu một đầu để trống.
10. `Giờ đề xuất tính công` — ca đủ dấu thường bằng giờ thực tế; ca thiếu dấu/VẮNG/Exception chờ duyệt bằng 0.
11. `Kết quả công` — `Tính theo giờ thực tế` / `Không tính công` / `Chờ duyệt Exception`.
12. `Lý do`
13. `Trễ (phút)` — số không âm.
14. `Ảnh hưởng KPI` — `Có` / `Không`.
15. `Lý do KPI` — bắt buộc khi KPI = Có.
16. `Phép` — `Trừ phép` / `Không trừ phép`.
17. `Lý do phép` — khi Trừ phép, ghi lý do cụ thể.
18. `Quên chấm năm nay` — x/4; Exception không dùng quota này.
19. `Trạng thái Exception` — nguồn chỉ xuất `Không có` / `Chờ duyệt Exception`. `Đã duyệt` / `Không duyệt` chỉ thuộc Bot Bảng lương.
20. `Ghi chú` — giữ ghi chú nguồn.
21. `Nguồn dữ liệu` — `Bản chốt` / `Dữ liệu hiện tại`.
22. `Lịch đối chiếu` — `Lịch tại thời điểm chốt` / `Lịch hiện tại` / `Không có lịch`.
23. `Phiên bản file` — `attendance-export-v4`.
24. `Giờ dùng kiểm soát 46h` — ca thường đủ dấu + Exception đủ dấu dù chờ duyệt; **không phải giờ được trả lương**.
25. `Nhắc nhở` — ví dụ PH xin nghỉ báo muộn, có số phút.

## `Tong hop GV` — chỉ để nhìn nhanh

Theo thứ tự: `Mã NV`, `Họ tên`, `Vai trò`, `Tổng giờ hợp lệ tháng`, `Giờ miễn trừ`, `Số ca không tính công`, `Số Exception chờ duyệt`, `Quên chấm năm nay`, `Giờ tuần cao nhất`, `Tình trạng 46 giờ`, `Ngày cần xem KPI`, `Ngày trừ phép`, `Cần quản lý xem`.

Danh sách ngày KPI/phép phải có ngày **và ca**; không lấy tổng hợp này thay cho sheet chi tiết.

## `Gio tuan` — cảnh báo hợp đồng

Theo thứ tự: `Mã NV`, `Họ tên`, `Tuần từ`, `Tuần đến`, `Giờ thực tế hợp lệ`, `Giờ Exception chờ duyệt`, `Tổng giờ dùng kiểm soát lịch`, `Mốc hợp đồng`, `Còn lại/Vượt`, `Cảnh báo`.

Từ 40 giờ nhắc kiểm tra lịch; trên 46 giờ cảnh báo quản lý. **Không tự tạo overtime**. Tuần từ thứ Hai đến Chủ nhật; tuần vắt tháng cần dữ liệu tháng liền kề, nếu không đủ phải cảnh báo thay vì kết luận an toàn.

## Quy tắc Bot phải hiểu

- Có đủ IN+OUT thường: dùng giờ thực tế, dù đi trễ/ra sớm; KPI trễ tách riêng.
- Quên IN/OUT ca thường: cả 4 lần đầu **không tự tính công**, ghi `Chờ quản lý kiểm tra`; từ lần 5 chắc chắn KPI Có. Quota reset hằng năm (riêng 2026 bắt đầu từ 01/11).
- `Phụ huynh xin nghỉ` là lớp không học: **Không trừ phép, KPI Không** kể cả báo muộn. Báo muộn chỉ nhắc nhở, không chuyển thành lỗi KPI.
- GV `Ốm / việc gia đình` báo VẮNG trước ca: trừ phép, KPI Không; báo trễ: giữ lý do và tín hiệu KPI.
- Exception đủ hai đầu: cộng giờ thực tế vào **kiểm soát 40/46 giờ** nhưng `Giờ đề xuất tính công = 0`, chờ quản lý duyệt. Hai Exception cùng ngày không gộp. Thiếu đầu Exception 1–3/tháng chờ duyệt, từ lần 4 không tính giờ; không dùng quota quên chấm ca thường.
- Bản chốt của tháng gồm `CHECK IN - Tháng MM-yyyy` và `LICHLAM - Tháng MM-yyyy`; nếu chưa chốt lịch, cảnh báo.

## Kiểm tra nhập an toàn

1. Kiểm tra phiên bản v4, tên ba sheet, tên/thứ tự cột, tháng và ngày từng dòng. Không tự sửa enum sai chính tả.
2. Dùng `Mã dòng` để cập nhật nhập lại, không cộng trùng giờ/KPI/phép; nếu bản mới mâu thuẫn dữ liệu đã duyệt, yêu cầu quản lý xác nhận.
3. Giữ mọi dòng `Không tính công`, `Trừ phép`, KPI Có và Exception; không tự bỏ.
4. Exception được duyệt/từ chối ở Bot, lưu người duyệt, lúc duyệt, lý do; không ghi ngược Chấm công.
5. Bản `Dữ liệu hiện tại` hoặc lịch `Lịch hiện tại`/`Không có lịch` (với ca thường) phải cảnh báo.
6. Trước khi tác động lương, quản lý duyệt. File không phải lệnh trả tiền.
