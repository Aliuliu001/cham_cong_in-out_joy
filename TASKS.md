# NHIỆM VỤ: Gộp Báo Vắng vào Sheet CHECK IN

## Quyết định
- ❌ HỦY: Sheet BAO_VANG riêng biệt
- ✅ GỘP: Tất cả vào Sheet CHECK IN với cột "Loại IN/OUT" = "VẮNG"

## Lợi ích
1. Quản lý 1 chỗ duy nhất
2. Xuất báo cáo tháng đơn giản hơn
3. Không cần đồng bộ nhiều sheet

## Các Task Cần Làm

### Task 1: Cập nhật hàm setup() ✅
- Xóa dòng tạo Sheet BAO_VANG
- Giữ lại Sheet CHECK IN với cấu trúc hiện tại

### Task 2: Sửa hàm submitBaoVang() ✅
- Thay vì ghi vào BAO_VANG
- Ghi vào CHECK IN với:
  - Loại = "VẮNG"
  - Giờ check in = trống
  - Giờ check out = trống
  - Trễ = 0
  - Ghi chú = Lý do vắng

### Task 3: Sửa hàm getChuaCham() ✅
- Xóa phần đọc từ BAO_VANG
- Đọc từ CHECK IN, loại bỏ người có Loại = "VẮNG"

### Task 4: Test & Push lên GitHub ✅
- ✅ Push code lên GitHub
- ⏳ User cần copy vào Apps Script + Triển khai Phiên bản mới

## Ghi chú Logic Quan Trọng

### Cấu trúc Sheet CHECK IN (11 cột)
```
Mã NV | Họ và tên | Ngày | Ca | Loại IN/OUT | Giờ check in | Giờ check out | Trễ (phút) | Ghi chú | Link ảnh | Khoảng cách (m)
```

### Các giá trị cột "Loại IN/OUT"
- **"IN"** = Check-in bình thường (có GPS, ảnh)
- **"OUT"** = Check-out bình thường (có GPS, ảnh)
- **"VẮNG"** = Báo vắng từ xa (không có GPS, ảnh)

### Logic getChuaCham()
- Đọc LICHLAM → danh sách ca phải làm hôm nay
- Đọc CHECK IN → loại bỏ:
  - Người đã check IN (Loại = "IN")
  - Người đã báo vắng (Loại = "VẮNG")
- Còn lại = Chưa chấm công

### Logic xuất báo cáo tháng
- Quét CHECK IN theo tháng
- Tính giờ làm: chỉ tính cặp IN-OUT (bỏ qua VẮNG)
- Đếm trễ: chỉ đếm loại IN có Trễ > 0
- VẮNG không ảnh hưởng KPI, chỉ hiện trong ghi chú

---
**Cập nhật lần cuối:** 2026-09-22
