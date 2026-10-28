# Chấm công → Bảng lương: giờ thực tế, miễn trừ quên chấm, Exception — Plan đã điều chỉnh

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Hoàn thiện repo `cham_cong_in-out_joy` thành nguồn chấm công rõ ràng cho app Bảng lương: tính đúng giờ thực tế, biết ca nào được tính công, theo dõi phép/KPI theo từng ngày, kiểm soát mốc 42/46 giờ mỗi tuần, và xử lý ca đột xuất không có lịch.

**Architecture:** Check IN/OUT là nguồn dữ liệu gốc. App Bảng lương chỉ nhận dữ liệu một chiều để xem, duyệt Exception và tính tiền ở repo riêng. Không có thao tác từ Bảng lương ghi ngược hoặc tự đổi CHECK IN, LICHLAM, KPI, báo cáo cũ.

---

## 1. Quy tắc đã chốt

### A. Giờ thực tế và giới hạn tuần

- Tuần tính từ **Thứ Hai đến Chủ nhật**.
- Mốc hợp đồng: **46 giờ/tuần** cho giáo viên.
- Có đủ IN + OUT thì tính **giờ thực tế = OUT − IN**.
  - IN 08:10, OUT 11:00 = **2.83 giờ**.
  - Đi trễ: vẫn có giờ thực tế, nhưng ảnh hưởng KPI theo luật trễ.
  - Ra sớm: tính đến đúng giờ OUT thực tế, không làm tròn đủ ca.
- Không chặn giáo viên chấm nếu vượt giờ.
- Khi tổng giờ hợp lệ của tuần đã **từ 40 giờ trở lên**, trước lúc giáo viên CHECK IN hệ thống hiện cảnh báo:

> **Bạn hãy liên hệ Ms. Vân Anh. Lịch của bạn cần được kiểm tra lại.**

- Khi vượt 46 giờ, báo cáo hiện rõ `Vượt X giờ`; không tự tính hay trả overtime.

### B. Quên IN/OUT — 4 lần miễn trừ mỗi năm

- Một ca chỉ có IN hoặc chỉ có OUT được gọi là một lần quên chấm.
- Mỗi giáo viên có **4 lần miễn trừ quên chấm trong một năm dương lịch**.
- Trong 4 lần miễn trừ đầu:
  - Vẫn **tính giờ/công theo quy tắc miễn trừ** để không làm mất công của giáo viên.
  - Trừ 1 lượt quota, hiển thị `Đã dùng x/4 lần miễn trừ`.
  - Ghi rõ ngày, ca, thiếu IN hay thiếu OUT để quản lý đối chiếu.
- Từ lần quên thứ 5 trong năm:
  - **Không tính công** cho ca đó.
  - Trừ KPI.
  - Hiện đúng lời nhắc:

> **Ú oà!!! Đi làm mà quên chấm công nè.**
> **Mình trừ KPI của bạn rồi. Đừng buồn nhé.**
> **Thương.**

- Quota tự reset vào **01/01 mỗi năm**, cho 2027 và mọi năm sau; code không được hard-code từng năm.
- Riêng năm 2026: tính quota mới từ **01/11/2026** đến 31/12/2026.
- Lần chấm tiếp theo phải hiện popup nhắc ca gần nhất bị thiếu, thiếu IN/OUT gì và quota còn lại `x/4`.

> **Cách tính giờ miễn trừ cần làm rõ khi code:** chỉ có một dấu giờ thì không thể tự biết chính xác số giờ thực tế. Đề xuất: lần miễn trừ đầu 1–4 dùng **giờ lịch của ca** làm giờ công tạm tính, gắn nhãn `Miễn trừ quên chấm — giờ lịch`, để Bảng lương/anh nhìn được đó không phải dấu giờ đầy đủ. Từ lần 5 không tính công. Đây là phương án không bịa giờ thực tế.

### C. VẮNG, phép và KPI

| Trường hợp | Công | KPI | Ghi chú xuất sang Bảng lương |
|---|---:|---:|---|
| Ốm / việc gia đình, báo VẮNG trước giờ CHECK IN | Không tính công | Không trừ | `Trừ phép — báo trước` |
| Phụ huynh xin nghỉ, báo VẮNG trước giờ CHECK IN | Không tính công | Không trừ | `Phụ huynh xin nghỉ — báo trước` |
| Ốm / việc gia đình hoặc PH xin nghỉ, báo sau giờ CHECK IN | Không tính công | Trừ KPI như báo trễ | `Báo vắng trễ X phút — Trừ phép/PH xin nghỉ` |
| Có lịch nhưng không IN, OUT hoặc VẮNG | Không tính công | Trừ KPI | `Nghỉ không báo` |
| Lý do khác | Không tính công | Chờ quản lý xem | Giữ nguyên lý do |

- `Lịch trống (không có lớp)` không được coi là VẮNG; nếu không có ca trong LICHLAM thì không có ca để chấm.
- Output phải liệt kê **ngày cụ thể**, ca và lý do đối với mọi dòng có ảnh hưởng KPI hoặc phép.

### D. Exception — ca đột xuất

Hai nút cạnh VÀO / RA / VẮNG:

- `🟣 CHECK IN CA ĐỘT XUẤT`
- `🟣 CHECK OUT CA ĐỘT XUẤT`

Quy trình:

1. Giáo viên chọn mã, bấm CHECK IN CA ĐỘT XUẤT.
2. Chọn lý do: `Dạy thay`, `Họp đột xuất`, `Sự kiện trung tâm`, `Khác`.
3. `Khác` bắt buộc gõ lý do.
4. Bắt buộc ảnh + GPS như CHECK IN thường.
5. Lúc CHECK OUT cũng bắt buộc ảnh + GPS.
6. Có đủ hai dấu giờ: số giờ = OUT − IN.
7. Kết quả luôn là `Chờ duyệt Exception`: chưa tự cộng vào 46 giờ/tuần, tổng giờ tháng hoặc lương.
8. Thiếu CHECK OUT Exception: ghi `Chờ duyệt — thiếu CHECK OUT Exception`, có mặt ở khối Cần xử lý.
9. Không cho một người mở hai Exception cùng lúc; không cho CHECK OUT nếu chưa CHECK IN Exception.
10. Nếu Exception trùng khung giờ ca lịch, báo `⚠️ Trùng ca — quản lý cần duyệt` và không cộng đôi giờ.

### E. Quy tắc 3 tháng / 3 lần — cần chốt phạm vi trước khi lập trình

Anh nói: “Nếu 3 tháng quá 3 lần quên IN + OUT, 3 lần không phân biệt IN/OUT thì không tính công.”

Em ghi thành rule chờ chốt vì có thể hiểu theo hai cách:

- **Phương án em đề xuất:** áp dụng cho **Exception**: trong 3 tháng gần nhất, nếu một giáo viên có hơn 3 Exception thiếu IN hoặc OUT thì các Exception thiếu tiếp theo không được miễn trừ/không tính công.
- **Phương án khác:** áp dụng cho **mọi ca có lịch và cả Exception**.

Không được tự chọn một trong hai trước khi anh chốt, vì nó ảnh hưởng trực tiếp số công.

### F. Chốt tháng dễ nhìn

Trong Báo cáo tháng có nút `🔒 Chốt tháng MM/yyyy` dành cho quản lý.

Khi chốt:

1. Tạo `CHECK IN - Tháng MM-yyyy`.
2. Tạo `LICHLAM - Tháng MM-yyyy`.
3. Dòng đầu mỗi sheet ghi: `🔒 BẢN ĐÃ CHỐT — không sửa trực tiếp | Tháng: MM/yyyy | Chốt lúc: ...`.
4. Hai sheet này đặt gần CHECK IN và LICHLAM, có màu nền nhạt khác để anh nhận ra là bản đã khóa.
5. Nếu đã có bản chốt, không tự ghi đè; hiện hai lựa chọn rõ ràng:
   - `Giữ bản đã chốt`
   - `Chốt lại theo dữ liệu hiện tại`
6. Khi export/thống kê tháng cũ, ưu tiên đọc đủ 2 sheet chốt.
7. Nếu thiếu `LICHLAM - Tháng MM-yyyy`, hiện nhãn vàng: `⚠️ Lịch tháng này chưa được chốt — đang đối chiếu bằng lịch hiện tại.`

---

## 2. Output đề xuất cho app Bảng lương

Tạo một Excel: `Cham_cong_tinh_luong_MM-YYYY.xlsx` gồm 3 sheet. Mỗi dòng lỗi/phép đều chỉ ra **ngày cụ thể**, không chỉ tổng số.

### Sheet 1 — `Tong hop GV`

Một giáo viên một dòng:

1. Mã NV
2. Họ tên
3. Vai trò
4. Tổng giờ hợp lệ tháng
5. Giờ miễn trừ quên chấm
6. Số ca không tính công
7. Số Exception chờ duyệt
8. Quên chấm năm nay (`x/4`)
9. Giờ tuần cao nhất
10. Tình trạng 46 giờ
11. Ngày cần xem KPI
12. Ngày trừ phép
13. Cần quản lý xem

Ví dụ cột `Ngày cần xem KPI`:
`05/11 — Quên OUT; 12/11 — Báo vắng trễ 20 phút; 19/11 — Nghỉ không báo`.

Ví dụ cột `Ngày trừ phép`:
`07/11 — Ốm / việc gia đình (báo trước); 21/11 — PH xin nghỉ (báo trước)`.

### Sheet 2 — `Chi tiet ca`

Một ca một dòng, đủ bằng chứng để Bảng lương đối chiếu:

1. Mã NV
2. Họ tên
3. Ngày
4. Loại ca (`Ca lịch` / `Ca đột xuất`)
5. Tên ca
6. Giờ VÀO
7. Giờ RA
8. Số giờ thực tế / giờ lịch miễn trừ
9. Kết quả công
10. Lý do
11. Ảnh hưởng KPI (`Có` / `Không` / `Chờ xem`)
12. Lý do KPI
13. Phép (`Không` / `Trừ phép`)
14. Quên chấm năm nay
15. Trạng thái Exception
16. Ghi chú
17. Nguồn dữ liệu (`Bản chốt` / `Dữ liệu hiện tại`)
18. Lịch đối chiếu (`Lịch đã chốt` / `Lịch hiện tại`)
19. Phiên bản file (`attendance-export-v3`)

`Kết quả công` chỉ dùng đúng ba giá trị:

- `Tính theo giờ thực tế`
- `Tính theo giờ lịch miễn trừ`
- `Không tính công`
- `Chờ duyệt Exception`

### Sheet 3 — `Gio tuan`

Một giáo viên + một tuần:

1. Mã NV
2. Họ tên
3. Tuần từ
4. Tuần đến
5. Giờ thực tế hợp lệ
6. Giờ miễn trừ
7. Tổng giờ dùng kiểm soát lịch
8. Mốc hợp đồng (46)
9. Còn lại/Vượt
10. Cảnh báo

Cảnh báo gồm `Trên 42 giờ — liên hệ Ms. Vân Anh` hoặc `Vượt 46 giờ — cần quản lý kiểm tra`.

### CSV

- Giữ nguyên CSV 12 cột cũ để tương thích app Bảng lương hiện tại.
- Thêm CSV gọn `Cham_cong_tinh_luong_gon_MM-YYYY.csv`, cùng nội dung Sheet `Chi tiet ca`.
- CSV luôn UTF-8 BOM.

---

## 3. Các task thực hiện

### Task 1 — Cập nhật tài liệu và contract dữ liệu

**Files:** `README.md`, `PLAN.md`, `TASKS.md`

- Cập nhật luật 4 lần **miễn trừ**, 42/46 giờ, phép/KPI theo ngày, chốt 2 sheet, Exception.
- Bổ sung contract 3-sheet Excel + CSV gọn và giữ CSV 12 cột cũ.
- Commit: `docs: define payroll attendance export rules`

### Task 2 — Helper tính ca và test RED/GREEN

**Files:** `Code.gs`, `test_payroll_export.js`

Test trước rồi implement:

- IN 08:10/OUT 11:00 → 2.83 giờ thực tế.
- Trễ 0/19/20/60 phút: đủ hai dấu vẫn là giờ thực tế, có lý do KPI.
- Quên IN hoặc OUT lần 1–4: `Tính theo giờ lịch miễn trừ`, quota tăng đúng.
- Lần 5: `Không tính công`, KPI có ảnh hưởng, đúng lời nhắc.
- 01/01 năm mới reset quota; 01/11/2026 bắt đầu quota riêng.
- Vắng báo trước/báo trễ/nghỉ không báo đúng phép/KPI.

Commit: `feat: calculate attendance outcomes and exemptions`

### Task 3 — Popup quota và cảnh báo 42 giờ

**Files:** `Code.gs`, `Index.html`, `test_payroll_export.js`

- Khi chọn mã, trả dữ liệu ca thiếu gần nhất/quota còn lại/giờ tuần hiện tại.
- Hiện popup nhắc quên chấm.
- Nếu giờ tuần >42, hiện đúng cảnh báo liên hệ Ms. Vân Anh; chỉ nhắc, không khóa chấm.
- Commit: `feat: warn about missed checks and weekly hours`

### Task 4 — Vắng, phép và KPI theo ngày

**Files:** `Code.gs`, `Index.html`, `BaoCao.html`, `test_payroll_export.js`

- Phân biệt báo trước/báo trễ theo giờ bắt đầu ca.
- Ghi `Trừ phép` cho ốm/việc gia đình báo trước.
- PH xin nghỉ báo trước không KPI.
- Xuất đúng ngày/ca/lý do KPI và phép.
- Commit: `feat: classify leave and kpi effects by date`

### Task 5 — Snapshot tháng CHECK IN + LICHLAM

**Files:** `Code.gs`, `BaoCao.html`, `test_payroll_export.js`, `README.md`

- Thêm nút chốt tháng, header dễ nhìn, xác nhận khi chốt lại.
- Export ưu tiên hai snapshot và cảnh báo thiếu snapshot lịch.
- Commit: `feat: lock monthly attendance and schedule snapshots`

### Task 6 — Exception

**Files:** `Index.html`, `Code.gs`, `BaoCao.html`, `test_payroll_export.js`

- Hai nhãn chính xác CHECK IN/OUT CA ĐỘT XUẤT.
- Lý do, ảnh, GPS; cặp IN/OUT; chặn trùng/chồng giờ.
- Thiếu OUT = chờ duyệt + Cần xử lý.
- Không tự cộng lương/46 giờ.
- Áp dụng rule 3 tháng/3 lần sau khi anh chốt phạm vi.
- Commit: `feat: record exception shifts pending approval`

### Task 7 — Excel 3 sheet, CSV gọn, báo cáo tháng

**Files:** `Code.gs`, `BaoCao.html`, `test_payroll_export.js`

- Thêm `Cần xử lý`, `Giờ giáo viên theo tuần`, `Ca được tính giờ?`.
- Tạo Excel 3 sheet và CSV gọn theo contract trên.
- Duy trì CSV 12 cột cũ không đổi.
- Commit: `feat: export payroll review workbook`

### Task 8 — Verify, push, triển khai

- Chạy test Node + syntax Code.gs/Index.html/BaoCao.html + `git diff --check`.
- Push main.
- Anh dán 3 file vào Apps Script, chọn **Triển khai → Quản lý các lượt triển khai → Phiên bản mới → Triển khai**.
- Test thật: đủ IN/OUT, quên trong 4 lần, quên lần 5, vắng báo trước, vắng trễ, nghỉ không báo, vượt 42/46 giờ, Exception đủ/thiếu OUT, export tháng chốt.

---

## 4. Câu hỏi còn cần anh chốt trước Task 6

Quy tắc **“trong 3 tháng quá 3 lần quên IN/OUT thì không tính công”** áp dụng:

- Chỉ với **Exception**, như em đề xuất; hay
- Với **tất cả ca** gồm ca lịch và Exception?

Ngoài điểm này, các luật còn lại đã được ghi đủ trong plan.
