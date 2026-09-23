# PLAN MỚI: Hệ thống chấm công — 1 Sheet CHECK IN duy nhất

## Quy tắc chung (áp dụng cho mọi tính năng sau này)
- Mọi sự kiện (đi làm, ra về, báo vắng) đều là 1 dòng trong Sheet CHECK IN.
- KHÔNG tạo thêm Sheet riêng cho từng tính năng (đã bỏ BAO_VANG).
- Cột "Loại IN/OUT" chỉ có 3 giá trị: IN / OUT / VẮNG.
- Giờ trễ = giờ bấm nút trừ thẳng giờ bắt đầu ca trong LICHLAM (không trừ sớm 15'/30' — user tự ghi giờ ca).
- Ngày/giờ lấy theo giờ mở trang (giờ máy chủ), nhân viên không tự nhập ngày → chống chấm bù ngày cũ.
- Vắng (có phép hay không báo) đều = 0 giờ làm.
- Vắng không báo + VẮNG bấm muộn đều tính như 1 lần trễ để trừ KPI.
- Ca thiếu chỉ hiện trên báo cáo + Lỗi tháng, KHÔNG tự ghi thêm dòng vào Sheet. Muốn duyệt phép bù thì quản lý ghi tay dòng VẮNG + chữ DUYỆT BÙ ở Ghi chú.

## Cấu trúc Sheet CHECK IN (11 cột)
Mã NV | Họ và tên | Ngày | Ca | Loại IN/OUT | Giờ check in | Giờ check out | Trễ (phút) | Ghi chú | Link ảnh | Khoảng cách

## Việc đã xong
- [x] Bỏ Sheet BAO_VANG, setup() không tạo nó nữa.
- [x] Nút đỏ VẮNG trên web + ô chọn lý do, bấm ở nhà được (không cần GPS/ảnh).
- [x] Chặn trùng: 1 người + 1 ngày + 1 ca chỉ 1 dòng (đã IN thì không VẮNG được, đã VẮNG thì không IN/VẮNG lại được).
- [x] VẮNG bấm muộn tính trễ như đi trễ, cộng vào KPI.
- [x] Báo cáo ngày: VẮNG hiện đúng chữ; ca hết giờ mà không bấm gì hiện đỏ "Vắng không báo".
- [x] Báo cáo tháng: cột "Vắng có phép" + "Vắng không báo", dòng chi tiết từng ca vắng không báo.
- [x] Sheet Lỗi tháng: có dòng Trễ IN, Vắng báo trễ, Vắng có phép, Vắng không báo, Quên OUT.
- [x] Nút RA hiện đúng chữ CHECK OUT.
- [x] Bỏ trừ sớm 15'/30' khi tính trễ.

## Việc còn lại
- [ ] Sửa README cho khớp luật mới (đang ghi sai "GV trước 15'").
- [ ] Test thực tế 1 buổi: bấm IN đúng giờ, IN trễ, VẮNG đúng giờ, VẮNG muộn, bỏ 1 ca không bấm → đối chiếu báo cáo ngày + tháng.
- [ ] (Nếu cần) Trường hợp "sáng vắng không báo, chiều có mặt": máy đã tính ca sáng là Vắng không báo + trừ KPI — user xác nhận vậy là đủ hay muốn thêm gì.

---
**Cập nhật:** 2026-09-23
