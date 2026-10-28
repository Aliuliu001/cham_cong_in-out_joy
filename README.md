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

- Mỗi năm có 4 lần miễn trừ quên IN/OUT. Lần 1–4 vẫn tính theo giờ lịch của ca nhưng ghi rõ là miễn trừ.
- Từ lần 5: không tính công và trừ KPI.
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

File Excel dự kiến cho Bảng lương có 3 sheet: `Tong hop GV`, `Chi tiet ca`, `Gio tuan`; các ngày trừ KPI/trừ phép đều ghi rõ ngày, ca và lý do. CSV 12 cột hiện có vẫn giữ để tương thích.

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
