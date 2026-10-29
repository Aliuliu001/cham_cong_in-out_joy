# Dữ liệu Chấm công gửi sang Bot Bảng lương

> Copy nguyên tài liệu này sang repo/topic Bot Bảng lương.

## 1. File Bot Bảng lương cần nhận

Ưu tiên nhận file Excel:

`Cham_cong_tinh_luong_MM-YYYY.xlsx`

Ví dụ:

`Cham_cong_tinh_luong_11-2026.xlsx`

File này do app **Chấm công IN/OUT Joy** xuất tại Báo cáo tháng → **⬇️ Tải Excel**.

- Đây là luồng dữ liệu **một chiều**: Chấm công → file Excel → Bảng lương.
- Bot Bảng lương không được sửa, xóa hoặc ghi ngược vào CHECK IN, LICHLAM, KPI hay snapshot của app Chấm công.
- Bot không được tự coi file là lệnh trả tiền. File là bằng chứng để xem, đối chiếu và đề xuất.

## 2. Cấu trúc file Excel bắt buộc

Excel có đúng 3 sheet:

### Sheet `Tong hop GV`

Mỗi giáo viên một dòng, dùng để Bot hiển thị màn hình tổng quan:

1. `Mã NV`
2. `Họ tên`
3. `Vai trò`
4. `Tổng giờ hợp lệ tháng`
5. `Giờ miễn trừ`
6. `Số ca không tính công`
7. `Số Exception chờ duyệt`
8. `Quên chấm năm nay`
9. `Giờ tuần cao nhất`
10. `Tình trạng 46 giờ`
11. `Ngày cần xem KPI`
12. `Ngày trừ phép`
13. `Cần quản lý xem`

Bot dùng sheet này để đánh dấu giáo viên có lỗi, phép, Exception hoặc vượt giờ. **Không tự tính tiền chỉ từ sheet này.**

### Sheet `Chi tiet ca` — sheet chính để đối chiếu lương

Mỗi dòng là một giáo viên + một ngày + một ca:

1. `Mã NV`
2. `Họ tên`
3. `Ngày` — `DD/MM/YYYY`
4. `Loại ca` — `Ca lịch` hoặc `Ca đột xuất`
5. `Tên ca`
6. `Giờ VÀO` — `HH:mm`, có thể trống
7. `Giờ RA` — `HH:mm`, có thể trống
8. `Số giờ`
9. `Kết quả công`
10. `Lý do`
11. `Ảnh hưởng KPI`
12. `Lý do KPI`
13. `Phép`
14. `Quên chấm năm nay`
15. `Trạng thái Exception`
16. `Ghi chú`
17. `Nguồn dữ liệu`
18. `Lịch đối chiếu`
19. `Phiên bản file`

### Giá trị Bot phải hiểu đúng

| Cột | Giá trị | Xử lý trong Bot Bảng lương |
|---|---|---|
| `Kết quả công` | `Tính theo giờ thực tế` | Có thể dùng số ở `Số giờ` làm giờ đối chiếu. |
| `Kết quả công` | `Không tính công` | Không tự đề xuất giờ/công. Hiện lý do để quản lý xem. |
| `Kết quả công` | `Chờ duyệt Exception` | Không tự cộng giờ hay tiền. Bắt buộc quản lý duyệt thủ công có lý do. |
| `Ảnh hưởng KPI` | `Có` | Hiện ngày + `Lý do KPI`; không để Bot tự đổi % KPI. |
| `Phép` | `Trừ phép` | Hiện đúng ngày, ca và lý do phép; không tính tiền nếu chưa có luật phép riêng. |
| `Nguồn dữ liệu` | `Bản chốt` | Dữ liệu tháng đã khóa, ưu tiên dùng. |
| `Nguồn dữ liệu` | `Dữ liệu hiện tại` | Hiện cảnh báo: tháng chưa chốt hoặc đang dùng dữ liệu đang chạy. |
| `Lịch đối chiếu` | `Lịch đã chốt` | Lịch lịch sử đáng tin cậy. |
| `Lịch đối chiếu` | `Lịch hiện tại` | Hiện cảnh báo vì lịch cũ có thể đã thay đổi. |

### Sheet `Gio tuan`

Mỗi giáo viên + một tuần, để kiểm soát hợp đồng:

1. `Mã NV`
2. `Họ tên`
3. `Tuần từ`
4. `Tuần đến`
5. `Giờ thực tế hợp lệ`
6. `Giờ miễn trừ`
7. `Tổng giờ dùng kiểm soát lịch`
8. `Mốc hợp đồng`
9. `Còn lại/Vượt`
10. `Cảnh báo`

- Mốc cảnh báo lịch: từ 40 giờ/tuần.
- Mốc hợp đồng: 46 giờ/tuần.
- Bot chỉ hiển thị cảnh báo, **không tự tạo overtime**.

## 3. Luật nguồn từ app Chấm công

- Chỉ ca có đủ CHECK IN + CHECK OUT mới có `Tính theo giờ thực tế`.
- Ca thiếu IN hoặc OUT luôn là `Không tính công`; 4 lần đầu trong năm chỉ là quota để quản lý check tay, không phải tự động được trả công.
- Từ lần thiếu thứ 5/năm: `Không tính công` và có ảnh hưởng KPI.
- Ốm/việc gia đình hoặc Phụ huynh xin nghỉ báo trước giờ ca: `Trừ phép`, không ảnh hưởng KPI.
- Báo vắng trễ hoặc Nghỉ không báo: lý do và ngày nằm trong cột KPI.
- Exception đủ dấu giờ: luôn `Chờ duyệt Exception`; Bot chỉ cộng giờ sau khi quản lý duyệt.

## 4. Quy tắc nhập file an toàn cho Bot

1. Chỉ nhận file có `Phiên bản file = attendance-export-v3`.
2. Kiểm tra đủ ba sheet: `Tong hop GV`, `Chi tiet ca`, `Gio tuan`.
3. Kiểm tra đủ 19 cột trong `Chi tiet ca`, đúng tên và thứ tự.
4. Không tự gộp hai lần import cùng tháng. Khóa nhập theo `Mã NV + Ngày + Loại ca + Tên ca`.
5. Nếu `Nguồn dữ liệu = Dữ liệu hiện tại` hoặc `Lịch đối chiếu = Lịch hiện tại`, báo vàng để quản lý biết tháng chưa chốt hoàn toàn.
6. Mọi Exception và dòng Không tính công phải giữ được khi import; không được âm thầm bỏ dòng.
7. Trước khi thay đổi tiền lương, Bot phải có bước quản lý duyệt rõ ràng.

## 5. CSV dự phòng

- CSV cũ: `Cham_cong_tinh_luong_MM-YYYY.csv` — giữ để tương thích dữ liệu cũ, không đủ thông tin duyệt lương mới.
- CSV mới: `Cham_cong_tinh_luong_gon_MM-YYYY.csv` — nội dung giống sheet `Chi tiet ca`, UTF-8 BOM.
- Bot mới nên ưu tiên Excel 3 sheet; chỉ dùng CSV gọn khi Excel không mở được.
