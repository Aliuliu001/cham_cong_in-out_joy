# Chấm công IN-OUT Joy

Web check-in bằng 1 mã QR cố định, chạy trên iPhone + Android.
Nền tảng: Google Apps Script + Google Sheets + Google Drive.

## File trong repo này

- `Code.gs` — backend: giờ server, kiểm tra GPS 100m, lưu Sheets + ảnh Drive, tính trễ, báo vắng (VẮNG), báo cáo ngày/tháng, tổng giờ, KPI.
- `Index.html` — trang nhân viên quét QR mở: chọn VÀO/RA/VẮNG, chọn mã, chọn ca, chụp mặt (VẮNG không cần ảnh/GPS, bấm ở nhà được), xem giờ + GPS, bấm xác nhận.
- `BaoCao.html` — trang bạn + văn phòng coi: ai trễ, ai vắng (có phép / không báo), ai quên RA, tổng giờ tháng, KPI.
- `PLAN.md` — quy tắc chung + việc đã xong / còn lại (1 Sheet CHECK IN duy nhất, Loại chỉ có IN/OUT/VẮNG).
- `appsscript.json` — cấu hình Apps Script (múi giờ VN).
- `Form_NhanVien_LichLam.xlsx` — file mẫu thu danh sách + lịch lần đầu.

## Cài 1 lần (khoảng 15 phút)

1. Tạo 1 Google Sheets mới → mở Extensions → Apps Script.
2. Copy từng file trong repo dán vào Apps Script đúng tên: Code.gs, Index, BaoCao (+ giữ appsscript.json).
3. Trong Apps Script chạy hàm `setup()` 1 lần → tự tạo 3 trang: CHECK IN, DANHSACH, LICHLAM.
4. Deploy → Deploy as web app → Execute as: Me → Who has access: Anyone → lấy link.
5. Tạo mã QR từ link → in dán ở trung tâm. QR này dùng mãi.
6. Nhập DANHSACH (mã + tên + vai trò) và LICHLAM (mã + thứ + ca + giờ bắt đầu + giờ kết thúc).
7. Share trang LICHLAM cho nhân viên văn phòng quyền sửa, để bạn đó nhập lịch hàng tuần.

## Luật đã chốt

- Tọa độ trung tâm 11.937044, 108.444760 — bán kính 100m. Ngoài → không lưu, hiện số mét. (Riêng nút VẮNG bấm ở nhà được, không kiểm tra vị trí/ảnh.)
- Giờ chính = giờ mở trang (giờ máy chủ). Nhân viên không tự nhập ngày → chống chấm bù ngày cũ.
- Bắt buộc với VÀO/RA: mã (chọn từ danh sách) + GPS + ảnh mặt + giờ server. Ảnh nén nhỏ, giữ nguyên hướng, không lật.
- Trễ = giờ bấm nút trừ thẳng giờ bắt đầu ca trong LICHLAM. Bạn tự ghi giờ ca — ví dụ ca ghi 8:00 thì bấm 8:01 = trễ 1 phút.
- 1 người + 1 ngày + 1 ca chỉ được 1 dòng (đã VÀO thì không VẮNG được nữa, đã VẮNG thì không VÀO/VẮNG lại được, VÀO 2 lần bị chặn).
- VẮNG (có phép hay không báo) đều = 0 giờ làm, không cộng vào tổng giờ.
- VẮNG bấm muộn trừ KPI như đi trễ. Ca có lịch mà không VÀO cũng không VẮNG → tính là "Vắng không báo", cộng như 1 lần trễ để trừ KPI.
- Muốn duyệt phép bù cho ca thiếu: quản lý ghi tay 1 dòng Loại VẮNG + chữ DUYỆT BÙ và lý do ở Ghi chú.
- Giờ 1 ca = giờ RA thực (nhưng không quá giờ kết thúc ca) − giờ bắt đầu ca.
- Quên RA chỉ ghi chú để trừ KPI. Trễ từ 4 lần/tháng → KPI = 0%.

## Cách test thực tế 1 buổi (làm trên điện thoại sau khi Triển khai Phiên bản mới)

1. Bấm VÀO đúng giờ → cột Trễ phải = 0.
2. Bấm VÀO trễ vài phút → hiện đúng số phút trễ.
3. Bấm VẮNG đúng giờ (ở nhà) → ghi Loại VẮNG, trễ 0, không trừ KPI.
4. Bấm VẮNG muộn → báo "Báo trễ X phút", trừ KPI như đi trễ.
5. Bỏ 1 ca không bấm gì → hôm đó ca hiện "Vắng không báo", cuối tháng vào Sheet Lỗi tháng.
6. Bấm trùng 2 lần cùng ca (VÀO 2 lần, VẮNG 2 lần, VÀO rồi VẮNG) → máy phải báo lỗi, không ghi thêm dòng.

## Bản này chưa có

Nhận diện mặt tự động (ảnh chỉ để coi lại), chấm bù ngày cũ.
update
