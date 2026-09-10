# Chấm công IN-OUT Joy

Web check-in bằng 1 mã QR cố định, chạy trên iPhone + Android.
Nền tảng: Google Apps Script + Google Sheets + Google Drive.

## File trong repo này

- `Code.gs` — backend: giờ server, kiểm tra GPS 100m, lưu Sheets + ảnh Drive, tính trễ, báo cáo ngày/tháng, tổng giờ, KPI.
- `Index.html` — trang nhân viên quét QR mở: chọn VÀO/RA, chọn mã, chụp mặt, xem giờ + GPS, bấm xác nhận.
- `BaoCao.html` — trang bạn + văn phòng coi: ai trễ, ai quên RA, tổng giờ tháng, KPI.
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

- Tọa độ trung tâm 11.937044, 108.444760 — bán kính 100m. Ngoài → không lưu, hiện số mét.
- Giờ chính = giờ mở trang + lưu thêm giờ bấm nút.
- Bắt buộc: mã (chọn từ danh sách) + GPS + ảnh mặt + giờ server. Ảnh nén nhỏ, giữ nguyên hướng, không lật.
- GV phải trước giờ bắt đầu 15'. VP T7/CN trước 30'. VP ngày thường chuẩn 08:00 (08:01 = trễ).
- Giờ 1 ca = giờ RA thực (nhưng không quá giờ kết thúc ca) − giờ bắt đầu ca.
- Quên RA chỉ ghi chú để trừ KPI. Đi trễ từ 4 lần/tháng → KPI giờ làm = 0%.

## Bản này chưa có

Nhận diện mặt tự động (ảnh chỉ để coi lại), chấm bù ngày cũ.
