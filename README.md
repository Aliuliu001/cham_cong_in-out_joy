# Chấm công IN-OUT Joy

Web chấm công QR cho điện thoại, dùng Google Apps Script + Google Sheets + Google Drive.

## Repo này làm gì

- Ghi CHECK IN, CHECK OUT, VẮNG và ca đột xuất Exception.
- Đối chiếu với LICHLAM, báo cáo ngày/tháng, phép và các việc ảnh hưởng KPI.
- Xuất bằng chứng chấm công một chiều sang app Bảng lương.
- **Không tính tiền lương** và app Bảng lương không ghi ngược lại dữ liệu chấm công.

## File chính

- `Code.gs`: xử lý chấm công, GPS, ảnh, Sheet, báo cáo và export.
- `Index.html`: màn hình giáo viên CHECK IN / OUT / VẮNG / Exception.
- `BaoCao.html`: màn hình quản lý xem báo cáo, chốt tháng và xuất file.
- `PLAN.md`: các luật nghiệp vụ đã chốt.
- `TASKS.md`: các việc đang làm.
- `context.md`: nguồn sự thật ngắn gọn để tiếp tục ở phiên sau.

## Luật quan trọng

### Giờ làm

- Có đủ IN + OUT: giờ = OUT − IN thực tế. Đi trễ vẫn tính giờ thực tế; ra sớm tính đến giờ OUT.
- Giáo viên được kiểm soát theo tuần Thứ Hai → Chủ nhật, mốc hợp đồng 46 giờ.
- Từ **40 giờ/tuần**, lúc CHECK IN chỉ hiện cảnh báo liên hệ Ms. Vân Anh để kiểm tra lịch; không chặn chấm.
- Trên 46 giờ chỉ cảnh báo, không tự tính overtime.

### Quên chấm ca lịch

- Mỗi năm có 4 lần miễn trừ quên IN/OUT. Lần 1–4 vẫn không tự tính công vì thiếu một đầu chấm; file ghi rõ ngày/ca, quota đã dùng và `Chờ quản lý kiểm tra`.
- Từ lần 5: vẫn không tính công và chắc chắn trừ KPI.
- Quota tự reset ngày 01/01; riêng 2026 bắt đầu tính lại từ 01/11/2026.

### Vắng

- Ốm / việc gia đình và Phụ huynh xin nghỉ, nếu báo trước giờ ca: không công, không KPI, ghi Trừ phép/ghi chú rõ.
- Báo sau giờ ca: không công và ghi số phút báo trễ để xử lý KPI.
- Không báo: Nghỉ không báo, không công, trừ KPI.

### Exception

- Nút `🟣 CHECK IN CA ĐỘT XUẤT` / `🟣 CHECK OUT CA ĐỘT XUẤT` dành cho công việc không có lịch sẵn.
- Bắt buộc có lý do, GPS và ảnh.
- Exception đủ hai đầu chỉ ở trạng thái Chờ duyệt, chưa tự cộng giờ/lương.
- Trong một tháng: Exception thiếu IN/OUT lần 1–3 chờ duyệt; từ lần thiếu thứ 4 không tính giờ. Exception không dùng quota miễn trừ của ca lịch.

## Chốt tháng và xuất Bảng lương

Quản lý chốt tháng sẽ tạo hai bản dễ nhận biết:

- `CHECK IN - Tháng MM-yyyy`
- `LICHLAM - Tháng MM-yyyy`

Các bản này dùng để xuất lại tháng cũ mà không bị thay đổi theo lịch hiện tại. Hệ thống không tự ghi đè bản đã chốt.

File Excel v4 cho Bảng lương có 3 sheet: `Tong hop GV`, `Chi tiet ca` (25 cột, `attendance-export-v4`), `Gio tuan`; mẫu dữ liệu giả là `Cham_cong_tinh_luong_11-2026_MAU_V4.xlsx`. Các ngày KPI/phép ghi ngày, ca, lý do. CSV 12 cột cũ chỉ để tương thích, không dùng làm nguồn v4. Mẫu đã kiểm tra offline nhưng chưa được xác nhận bằng bản tải từ Apps Script thật. Xem `HUONG_DAN_CHO_BOT_BANG_LUONG.md`.

## Telegram: Lịch làm việc và Check In/Out

### Lịch làm việc

Bot `@joy_victini_bot` gửi lịch ngày mai vào topic `📅 Lịch làm việc` của nhóm Office – Joy. Bot đọc từ `LICHLAM`; nếu chưa có lịch, tin ghi rõ chưa xếp ca. Một ngày chỉ gửi một lần. Trigger `atHour(21)` chạy trong khoảng 21:00–22:00 giờ Việt Nam, không bảo đảm đúng phút 21:00.

Trong **Apps Script → Cài đặt dự án → Thuộc tính tập lệnh**, giữ token riêng `LICH_LAM_BOT_TOKEN` và điền:
- `LICH_LAM_CHAT_ID` = `-1003955550981`
- `LICH_LAM_THREAD_ID` = `50`

Muốn gửi thử ngay, chạy `testGuiLichLamNow()`. Hàm này không đánh dấu lịch đã gửi nên không ảnh hưởng tin tự động buổi tối. Chỉ sau khi nhìn thấy tin trong đúng topic mới chạy `setupLichLamTrigger()` để kiểm tra/bật lịch tự động.

### Check In/Out

Bot `@joy_chamcong_bot` chỉ gửi IN/OUT/VẮNG và ảnh vào topic `🕘 Check In/ Out` thuộc group Office - Quản Lí. Các địa chỉ nhận không còn viết cứng trong Code.gs. Trong Script Properties, giữ `TELEGRAM_BOT_TOKEN` rồi thêm:
- `CHECKIN_TELEGRAM_CHAT_ID` = ID số group Office - Quản Lí
- `CHECKIN_TELEGRAM_THREAD_ID` = ID số topic Check In/Out

Sau khi đã gửi một tin trong topic bằng `@joy_chamcong_bot`, chạy `layDiaChiNhanCheckIn()` để đọc tên group, Group ID và Topic ID trong Nhật ký; kiểm tra đúng tên trước khi chép hai ID vào cài đặt. Chạy `testGuiTinCheckIn()` để gửi đúng một tin thử. Thiếu địa chỉ nhận thì bot dừng an toàn, không gửi nhầm sang Office – Joy.

Không gửi token qua chat, không ghi token vào code/GitHub. Push GitHub không tự cập nhật Apps Script: dán Code.gs → Lưu → **Triển khai → Quản lý các lượt triển khai → Phiên bản mới → Triển khai**.

## Cài và triển khai

1. Tạo Google Sheets → **Tiện ích mở rộng** → **Apps Script**.
2. Dán `Code.gs`, `Index.html`, `BaoCao.html` đúng tên.
3. Chạy `setup()` một lần.
4. Triển khai web app.

> Push GitHub không tự đổi web app Apps Script. Mỗi lần cập nhật: dán file mới → Lưu → **Triển khai → Quản lý các lượt triển khai → Phiên bản mới → Triển khai**.

## Kiểm thử hiện có

```bash
node test_payroll_export.js
```

Kế hoạch và checklist đầy đủ: xem `PLAN.md`, `TASKS.md`, `context.md`.
