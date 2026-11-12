# Kế hoạch theo Phase — Báo cáo chấm công & Duyệt Exception

> **For Hermes:** Mỗi Phase phải có test tái hiện lỗi trước, kiểm tra thực tế sau, chỉ chuyển Phase khi toàn bộ test liên quan PASS.

**Mục tiêu:**
- Báo cáo tháng/Lỗi tháng không báo “Vắng không báo” cho ca đã có VÀO/RA.
- Tab Giờ tuần tải ổn định, chỉ tính đúng tuần đang xem.
- `DUYET_EXCEPTION` trở thành quy trình rõ ràng: có ca thì web yêu cầu quản lý kiểm tra; không có ca mới báo “Không có ca Exception chờ duyệt”.
- Quản lý biết một Exception đã được duyệt và đã được cộng giờ vào dữ liệu xuất cho Bảng lương hay chưa.

**Nguyên tắc an toàn:** Không xoá hay sửa lịch sử CHECK IN/OUT. Mọi báo cáo được tính lại từ dữ liệu gốc. Ca không ghép chắc chắn phải hiện “Cần kiểm tra”, không được tự kết luận là vắng.

---

## Phase 0 — Khóa dữ liệu và tái hiện lỗi

**Mục đích:** Có bài kiểm tra bám đúng dữ liệu thực tế trước khi đụng vào thuật toán.

### Việc làm
1. Tạo `test_absence_reconciliation.js` với tình huống của Ms. Vân Anh:
   - Ngày 01, 07, 08 có hai ca sáng/chiều.
   - Ngày 02, 04, 05, 06, 09, 11 có ca cả ngày.
   - Mọi ca hoàn tất đều có VÀO/RA giống ảnh CHECK IN.
2. Tái hiện 3 Exception đang có trong `DUYET_EXCEPTION`:
   - Mr. Đức Anh: 05/11, 1.13 giờ.
   - Ms. Khánh Vân: 11/11, 2.47 giờ.
   - Mr. Đức Anh: 2.58 giờ.
3. Ghi trạng thái hiện tại làm mốc:
   - CHECK IN có đủ nhưng Lỗi tháng báo vắng sai.
   - Sheet có 3 Exception trống Quyết định nhưng web báo 0 ca chờ.
   - Giờ tuần đang có thể tải quá 4 phút/treo.

### Tiêu chí hoàn thành
- Test chứng minh bản cũ báo sai “Vắng không báo”.
- Test chứng minh Quyết định trống đang bị web đếm sai là 0.
- Không chỉnh sửa dữ liệu thật trong giai đoạn này.

---

## Phase 1 — Sửa thuật toán “Vắng không báo”

**Mục đích:** Một ca đã có VÀO/RA hoặc VẮNG không được xuất hiện ở Lỗi tháng là “Vắng không báo”; đồng thời xử lý cả những sai sót cùng loại có thể tái diễn với nhân viên, tên ca, số ca/ngày hoặc bố cục lịch khác.

### Phạm vi rà soát phòng ngừa
- Không chỉ kiểm dữ liệu Ms. Vân Anh: quét toàn bộ đường đọc `LICHLAM` (báo cáo ngày, báo cáo tháng, Lỗi tháng, xuất Bảng lương, Giờ tuần) để tất cả dùng cùng quy tắc ghép ca.
- Không phụ thuộc vị trí cột hay số cột; đọc các cột lịch theo tiêu đề và chấp nhận cột phụ ở cuối.
- Chuẩn hóa nhãn ca/giờ để tránh sai do khoảng trắng, gạch nối hoặc cách hiển thị giờ; nhưng không gộp đoán mò hai ca trùng tên khác giờ.
- Thêm regression test cho: một ca, nhiều ca/ngày, ca trùng tên khác giờ, lịch theo ngày/thứ/cả ngày, `Online` TRUE/FALSE/trống, dữ liệu ngày dạng Date và dạng chữ.
- Khi dữ liệu không thể ghép chắc chắn, báo “Cần kiểm tra khớp ca” thay vì phán nhầm “Vắng không báo”.

### Cách làm
1. Tạo một bộ ghép ca dùng chung trong `Code.gs`.
2. Khóa ghép ưu tiên theo: **Mã NV + Ngày + Tên ca + Giờ bắt đầu + Giờ kết thúc**.
3. Chuẩn hóa tên ca (khoảng trắng/dấu gạch) chỉ làm phương án dự phòng cho dữ liệu cũ.
4. Mỗi ca lịch trả về một trong bốn trạng thái:
   - **Đã chấm đủ:** có VÀO + RA.
   - **Đã báo vắng:** có VẮNG.
   - **Chưa có dấu chấm:** mới được tính “Vắng không báo”.
   - **Cần kiểm tra khớp ca:** dữ liệu lịch và chấm không đủ chắc chắn để ghép.
5. Thay `tinhVangKhongBao()` và đường tạo `Lỗi tháng` dùng bộ ghép này.
6. Đồng bộ đường export Bảng lương dùng chung bộ ghép để web và file không thể kết luận trái nhau.

### Test bắt buộc
- Ms. Vân Anh: 02, 04, 05, 06, 09, 11/11 không còn “Vắng không báo”.
- Một ngày hai ca: chỉ ca thật sự không có IN/VẮNG mới bị báo.
- Hai ca trùng tên nhưng khác giờ không gộp nhầm.
- Có IN nhưng thiếu OUT: báo “Quên check out”, không báo “Vắng không báo”.

### Kết quả người dùng nhìn thấy
- Báo cáo tháng và `Lỗi tháng 11/2026` tính lại đúng theo CHECK IN.
- Dữ liệu chấm gốc giữ nguyên.

---

## Phase 2 — Tối ưu Giờ tuần

**Mục đích:** Tab **📅 Giờ tuần** không còn dựng toàn bộ báo cáo tháng rồi mới lọc ra 7 ngày.

### Cách làm
1. Tạo `getBaoCaoGioTuanNhanh_()` trong `Code.gs`.
2. Hàm chỉ đọc các ngày từ Thứ Hai đến Chủ Nhật của tuần đang chọn.
3. Chỉ mở những Sheet tháng có giao với 7 ngày đó:
   - Dùng bản chốt `CHECK IN - Tháng MM-yyyy` / `LICHLAM - Tháng MM-yyyy` khi tồn tại.
   - Nếu tuần vắt tháng mà thiếu dữ liệu tháng kề: hiện rõ **“Chưa đủ dữ liệu tuần vắt tháng”**, không tự đoán tổng giờ.
4. Nhóm theo `Mã NV + ngày + ca`; chỉ tính giờ thực tế khi đủ VÀO/RA.
5. Đọc trạng thái Exception một lần để tách:
   - Giờ Exception **đã duyệt**.
   - Giờ Exception **chờ duyệt**.
   - Giờ Exception **không duyệt**.
6. Trên web:
   - Khóa nút Tuần trước/Tuần sau khi đang tải.
   - Nếu đổi tuần liên tục, kết quả tuần cũ không được ghi đè tuần mới.
   - Có thông báo lỗi rõ, không để quay vòng “Đang tải…”.

### Test bắt buộc
- Hàm Giờ tuần không được gọi `getPayrollWorkbookData()`.
- Fixture nhiều tháng/nhiều nhân viên vẫn chỉ đọc dữ liệu giao với 7 ngày cần xem.
- Tuần thường, tuần vắt tháng có đủ bản chốt, tuần vắt tháng thiếu bản chốt.
- Ca đủ VÀO/RA, thiếu một đầu chấm, Exception chờ duyệt, Exception đã duyệt.

### Mục tiêu vận hành
- Tải theo dữ liệu của một tuần, không phụ thuộc vào toàn bộ tháng.
- Nếu dữ liệu Google Sheet lớn bất thường vẫn phải trả lỗi/thiếu dữ liệu rõ ràng, không treo giao diện.

---

## Phase 3 — Chuẩn hóa Duyệt Exception

**Mục đích:** 3 ca đang trống Quyết định trong ảnh phải được web nhận là **3 ca chờ duyệt**.

### Quy tắc trạng thái chốt
| Tình trạng trong Sheet | Trạng thái hệ thống | Giờ đề xuất tính công |
|---|---|---|
| Quyết định trống | 🟡 Chờ duyệt | Chưa cộng |
| Đã duyệt tính giờ + có Người duyệt | ✅ Đã duyệt tính giờ | Cộng đúng số giờ Exception |
| Không duyệt + có Người duyệt | ⛔ Không duyệt | 0 giờ |
| Đã duyệt/Không duyệt nhưng thiếu Người duyệt | ⚠️ Cần hoàn thiện | Chưa cộng |

### Cách làm
1. Có một helper duy nhất chuẩn hóa trạng thái; mọi ô trống hoặc chữ không hợp lệ đều là **Chờ duyệt**.
2. Dùng cùng helper cho:
   - Đếm ca trên web.
   - Bảng trạng thái trên web.
   - Dữ liệu xuất Bảng lương.
   - Tổng giờ tuần.
3. Khi chọn Quyết định hợp lệ và Người duyệt:
   - Tự ghi **Duyệt lúc**.
4. Khi đổi Quyết định về Chờ duyệt:
   - Xóa Duyệt lúc.
   - Xóa Người duyệt để không gây hiểu nhầm.
5. Nếu quản lý xóa hẳn dòng trong `DUYET_EXCEPTION`:
   - Lần đồng bộ kế tiếp tạo lại ca từ CHECK IN/OUT ở trạng thái Chờ duyệt.
   - Không bao giờ xóa dòng Exception gốc trong CHECK IN.
6. Thêm nút **↻ Cập nhật trạng thái Exception** ở Báo cáo tháng: nút chỉ đồng bộ/đọc, không thay quản lý duyệt ca.

### Test bắt buộc
- 3 dòng Quyết định trống = web đếm 3 ca chờ.
- Chọn Đã duyệt + Người duyệt = ca được cộng giờ vào cột **Giờ đề xuất tính công** trong dữ liệu xuất.
- Chọn Không duyệt = 0 giờ đề xuất.
- Xóa Quyết định = trở lại Chờ duyệt, không báo 0 ca.
- Xóa hẳn một dòng DUYET_EXCEPTION = đồng bộ tạo lại đúng một dòng, không nhân đôi.

---

## Phase 4 — Giao diện quản lý và quy trình vận hành

**Mục đích:** Web không chỉ báo một số, mà hướng dẫn đúng việc cần làm.

### Giao diện đề xuất
- **Không có ca:**
  - `✅ Không có ca Exception chờ duyệt.`
- **Có ca chờ duyệt:**
  - `🟡 Có 3 ca Exception cần quản lý kiểm tra.`
  - Hiện danh sách: Mã NV, tên, ngày, lý do, giờ VÀO–RA, tổng giờ, link ảnh.
  - Nút/hướng dẫn: `Mở Google Sheet → tab DUYET_EXCEPTION → chọn Quyết định + Người duyệt`.
- **Sau khi duyệt:**
  - `✅ Đã duyệt tính giờ: X ca / Y giờ.`
  - `⛔ Không duyệt: X ca.`
  - `⚠️ Cần hoàn thiện: X ca.`
  - Mỗi ca đã duyệt có nhãn: **“Đã tính vào Giờ đề xuất tính công khi xuất Bảng lương.”**

### Quy trình cho anh
1. Nhân viên chấm VÀO và RA Exception.
2. Web báo có ca → anh vào `DUYET_EXCEPTION` xem giờ và ảnh.
3. Anh chọn **Đã duyệt tính giờ** hoặc **Không duyệt**, rồi chọn **Người duyệt**.
4. Quay lại web, bấm **↻ Cập nhật trạng thái Exception**.
5. Khi cần đối chiếu Bảng lương, xuất Excel và xem tab **Chi tiết ca**:
   - `Kết quả công = Tính theo giờ Exception đã duyệt`.
   - `Giờ đề xuất tính công` có số giờ.
   - `Trạng thái Exception = Đã duyệt tính giờ`.
6. Nếu muốn xem lại: đổi trạng thái về **Chờ duyệt**, không xóa dòng.

---

## Phase 5 — Kiểm chứng, đưa lên hệ thống và thử thật

### Kiểm chứng kỹ thuật
1. Viết test trước mọi sửa đổi (RED → GREEN).
2. Kiểm tra cú pháp `Code.gs` bằng Node.
3. Chạy toàn bộ `test_*.js`, yêu cầu 100% PASS.
4. Kiểm dữ liệu tái hiện Ms. Vân Anh và 3 Exception trong ảnh.
5. Kiểm không có đường báo cáo/xuất nào tự sửa CHECK IN gốc.

### Đưa lên hệ thống
1. Em đưa bản đã kiểm tra lên GitHub.
2. Anh mở `D:\CLASP\cham_cong` và bấm `sync-deploy.bat`.
3. Chỉ coi là xong khi cửa sổ báo `clasp push` thành công.
4. Anh mở đúng trang web đang dùng và bấm `Ctrl + Shift + R`.
5. Test thật:
   - Mở Báo cáo tháng 11: Ms. Vân Anh không còn vắng sai.
   - Mở Giờ tuần: có dữ liệu hoặc lý do thiếu dữ liệu rõ ràng, không treo.
   - Mở Tổng hợp Tháng: 3 Exception trong ảnh hiển thị “Có 3 ca cần quản lý kiểm tra”.

---

## Thứ tự triển khai đề xuất

- **Đợt 1:** Phase 0 + Phase 1 — chặn sai báo cáo/Lỗi tháng trước.
- **Đợt 2:** Phase 2 — sửa Giờ tuần chậm/treo.
- **Đợt 3:** Phase 3 + Phase 4 — hoàn thiện vận hành Duyệt Exception.
- **Đợt 4:** Phase 5 — kiểm tra thực tế và điều chỉnh nhỏ nếu có dữ liệu đặc biệt.

## Những phần không làm trong đợt này

- Không sửa dữ liệu chấm công gốc.
- Không tự duyệt Exception thay quản lý.
- Không dùng dữ liệu xuất để chốt lương trước khi anh kiểm file Excel thật.
