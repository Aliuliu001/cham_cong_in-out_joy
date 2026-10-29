# PLAN — Chấm công IN/OUT Joy

## Phạm vi hệ thống

Repo này là **nguồn chấm công gốc**: ghi CHECK IN/OUT, lịch, phép, KPI và xuất bằng chứng sang app Bảng lương. Repo này **không tính tiền lương**; app Bảng lương không được ghi ngược vào CHECK IN, LICHLAM hoặc KPI.

## Dữ liệu gốc

- `CHECK IN`: lưu mọi sự kiện chấm công.
- `LICHLAM`: lịch ca hiện hành.
- `DANHSACH`: mã, tên, vai trò.
- `CHECK IN - Tháng MM-yyyy` + `LICHLAM - Tháng MM-yyyy`: bản đã chốt để xuất lại tháng cũ chính xác.

## Quy tắc chốt

### Giờ làm và lịch tuần

- Tuần là Thứ Hai → Chủ nhật.
- Mốc hợp đồng giáo viên là 46 giờ/tuần.
- Có đủ IN + OUT: giờ làm là OUT − IN thực tế. Đi trễ vẫn tính giờ thực tế, ra sớm chỉ tính tới giờ OUT.
- Khi tổng giờ hợp lệ trong tuần đạt **40 giờ trở lên**, lúc CHECK IN chỉ cảnh báo, không chặn:
  `Bạn hãy liên hệ Ms. Vân Anh. Lịch của bạn cần được kiểm tra lại.`
- Trên 46 giờ: báo cáo ghi rõ vượt bao nhiêu giờ; không tự tính overtime/lương.

### Quên chấm ca lịch

- Mỗi năm dương lịch có 4 lần miễn trừ quên IN/OUT; tự reset ngày 01/01 hằng năm. Riêng quota 2026 bắt đầu tính lại từ 01/11/2026.
- Lần 1–4: vẫn **không tự tính công** vì thiếu một đầu chấm; ghi rõ thiếu IN/OUT, ngày, ca, quota đã dùng và `Chờ quản lý kiểm tra`.
- Lần 5 trở đi: vẫn không tính công, đồng thời trừ KPI và hiện:
  `Ú oà!!! Đi làm mà quên chấm công nè. Mình trừ KPI của bạn rồi. Đừng buồn nhé. Thương.`
- Lần chấm tiếp theo nhắc ca thiếu gần nhất và quota còn lại.
- **Cần anh chốt trước khi code:** ca được miễn trừ chỉ có một dấu giờ thì không biết chính xác thời lượng thực tế. Đề xuất tính theo **đủ giờ lịch của ca**, ghi `Giờ lịch miễn trừ` để Bảng lương thấy rõ đây không phải giờ IN–OUT thực tế.

### Vắng, phép và KPI

- Ốm / việc gia đình hoặc Phụ huynh xin nghỉ, báo VẮNG **trước giờ ca**: không tính công, không trừ KPI; ghi đúng ngày/ca và `Trừ phép` hoặc `PH xin nghỉ — báo trước`.
- Các lý do trên nhưng báo sau giờ ca: không tính công, ghi số phút báo trễ và ảnh hưởng KPI.
- Có lịch nhưng không IN, OUT hoặc VẮNG: `Nghỉ không báo`, không tính công, trừ KPI.
- `Lịch trống` không phải VẮNG và không tạo ca để chấm.

### Ca đột xuất — Exception

- Có nút `🟣 CHECK IN CA ĐỘT XUẤT` và `🟣 CHECK OUT CA ĐỘT XUẤT`.
- Bắt buộc chọn lý do, ảnh và GPS; số giờ khi đủ hai đầu là OUT − IN.
- Exception đủ IN/OUT: `Chờ duyệt Exception`, không tự cộng vào lương hay tổng 46 giờ.
- Exception thiếu một đầu: `Chờ duyệt — thiếu CHECK IN/OUT Exception`.
- Trong **một tháng**, mỗi nhân viên có tối đa 3 Exception thiếu IN hoặc OUT được `Chờ duyệt`; từ Exception thiếu đầu thứ 4 trở đi: **không tính giờ**. Không cộng các trường hợp này vào 4 lần miễn trừ của ca lịch.
- Không cho mở hai Exception, không cho OUT nếu không có IN tương ứng, và không cộng đôi giờ nếu trùng ca lịch.

### Chốt tháng

- Nút `🔒 Chốt tháng MM/yyyy` tạo hai bản snapshot CHECK IN và LICHLAM, có dòng đầu `🔒 BẢN ĐÃ CHỐT — không sửa trực tiếp`.
- Nếu có bản chốt: quản lý chọn `Giữ bản đã chốt` hoặc `Chốt lại theo dữ liệu hiện tại`; không tự ghi đè.
- Xuất/thống kê tháng cũ ưu tiên cả hai bản chốt. Thiếu LICHLAM snapshot thì cảnh báo vàng đang dùng lịch hiện tại.

## Output cho app Bảng lương

Excel `Cham_cong_tinh_luong_MM-YYYY.xlsx` gồm:

1. `Tong hop GV`: tổng giờ, giờ miễn trừ, quota, giờ tuần cao nhất, mốc 46 giờ, **ngày cần xem KPI**, **ngày trừ phép**, Exception chờ duyệt.
2. `Chi tiet ca`: từng ngày/ca, IN/OUT, giờ, kết quả công, lý do, ảnh hưởng KPI/phép, quota, trạng thái Exception, nguồn dữ liệu.
3. `Gio tuan`: giáo viên + tuần, giờ hợp lệ, giờ miễn trừ, mốc 46, còn lại/vượt và cảnh báo 40/46 giờ.

Giữ CSV 12 cột cũ để tương thích; thêm CSV gọn theo `Chi tiet ca`, luôn UTF-8 BOM.

## Việc đã hoàn thành

- [x] 1 sheet CHECK IN cho IN / OUT / VẮNG.
- [x] Báo cáo ngày/tháng và phát hiện Vắng không báo.
- [x] Xuất CSV/XLSX một chiều cho Bảng lương, ưu tiên CHECK IN snapshot nếu có.

## Việc tiếp theo

Xem `TASKS.md` và `context.md`.