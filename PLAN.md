# PLAN MỚI: Hệ thống chấm công — 1 Sheet CHECK IN duy nhất

## Quy tắc chung (áp dụng cho mọi tính năng sau này)
- Mọi sự kiện (đi làm, ra về, báo vắng) đều là 1 dòng trong Sheet CHECK IN.
- KHÔNG tạo thêm Sheet riêng cho từng tính năng (đã bỏ BAO_VANG).
- Cột "Loại IN/OUT" chỉ có 3 giá trị: IN / OUT / VẮNG.
- Giờ trễ = giờ bấm nút trừ thẳng giờ bắt đầu ca trong LICHLAM (không trừ sớm 15'/30' — user tự ghi giờ ca).
- Ngày/giờ lấy theo giờ mở trang (giờ máy chủ), nhân viên không tự nhập ngày → chống chấm bù ngày cũ.

## Cấu trúc Sheet CHECK IN (11 cột)
Mã NV | Họ và tên | Ngày | Ca | Loại IN/OUT | Giờ check in | Giờ check out | Trễ (phút) | Ghi chú | Link ảnh | Khoảng cách

## Việc đã xong
- [x] Bỏ Sheet BAO_VANG, hàm setup() không tạo nó nữa.
- [x] submitBaoVang() ghi vào CHECK IN với Loại = VẮNG, giờ trống, lý do nằm ở Ghi chú.
- [x] Danh sách "Chưa chấm" tự bỏ qua người đã IN và người đã báo VẮNG.
- [x] Báo cáo ngày hiện đúng chữ VẮNG.
- [x] Báo cáo tháng bỏ qua dòng VẮNG khi tính giờ và KPI.
- [x] Bỏ trừ sớm 15'/30' khi tính trễ.

## Việc còn dở (Task 1 — Check Vắng Từ Xa)
- [ ] Web chưa có nút "🔴 CHECK VẮNG" (hiện chỉ có VÀO/RA). Hàm ghi đã có sẵn, chỉ thiếu nút bấm.
- [ ] Chưa chặn báo vắng 2 lần cùng 1 ca.
- [ ] Sheet "Lỗi tháng" chưa liệt kê các ca VẮNG (nên có để cuối tháng thấy ai vắng bao nhiêu buổi có phép).
- [ ] Báo cáo tháng chưa có cột "Số buổi vắng có phép".

## Việc còn dở (Task 2 — Quên check-in ca sáng / chống gian lận)
- [ ] Trường hợp "sáng không chấm, chiều có mặt": máy hiện chưa tự phát hiện. Cần thêm: so lịch (LICHLAM) với thực tế (CHECK IN), ca nào trong lịch mà không có dòng IN/VẮNG thì ghi vào "Lỗi tháng" dòng "Vắng ca sáng (Không check-in), có mặt ca chiều".
- [ ] Chống gian lận: hiện web không cho nhập ngày cũ (tốt — giữ nguyên). Quy định thêm: chỉ quản lý được sửa bù thủ công trong Sheet, phải ghi chữ "DUYỆT BÙ" ở Ghi chú.
- [ ] README còn ghi luật cũ "GV trước 15'" — cần sửa lại cho khớp cách tính mới.

## Đề xuất thứ tự làm
1. Thêm nút CHECK VẮNG lên web + chặn báo trùng (nhỏ, làm trước).
2. Thêm VẮNG vào "Lỗi tháng" + cột vắng có phép ở báo cáo tháng (nhỏ).
3. Làm phát hiện "sáng vắng, chiều có mặt" (vừa).
4. Sửa README cho khớp luật mới (nhỏ, làm cùng lúc).

---
**Cập nhật:** 2026-09-23
