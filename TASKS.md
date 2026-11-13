# TASKS — Chấm công IN/OUT Joy

> Chỉ tick khi đã chạy test và kiểm tra kết quả thật. Mọi thay đổi giữ luồng một chiều Check IN/OUT → file xuất → Bảng lương.

## Ưu tiên L: khôi phục lịch làm việc tự động (PLAN.md, 13/11/2026)

> Chưa triển khai. Không tick chỉ vì mã trên GitHub đã sửa; phải phân biệt kiểm tra tại máy Windows, Apps Script và Telegram thật. Tạm ngưng xóa từng file `test_` thủ công và không chạy `setup()`.

- [ ] **L1 — Kiểm kê:** xác nhận file anh bấm `D:\CLASP\cham_cong\sync-deploy.bat`, cấu hình `.clasp.json`, danh sách tệp Apps Script hiện tại (kể cả `Code.gs_add.gs` và file anh đã xóa), trigger lịch, lịch sử lỗi, 3 Script Properties không lộ token; lưu bằng chứng trước/sau.
- [ ] **L2 — Chặn file thử:** tạo và thử `.claspignore` chỉ đưa `Code.gs`, `Index.html`, `BaoCao.html`, `appsscript.json` lên Apps Script; giữ `generate_v4_sample.js` và các `test_*.js` ở GitHub; xác minh `clasp` thực sự nhận đúng 4 file trước khi push và không làm mất `Code.gs_add.gs` nếu nó có hàm sản xuất.
- [ ] **L3 — Sửa file cập nhật:** đổi `PROJECT_DIR` từ `D:\cham_cong` sang `D:\CLASP\cham_cong`; kiểm tra sạch trước `git pull`, đúng script ID/deployment ID/link thật, log rõ và không tự đóng. Xác nhận file anh bấm ở Windows thật sự mang thay đổi này trước khi chạy.
- [ ] **L4 — Kiểm thử local:** mô phỏng launcher trong Windows CMD trên bản sao cả nhánh thành công/thất bại, kiểm tên file sẽ đưa lên, `node test_lichlam_telegram.js`, các `test_*.js`, syntax `Code.gs`, `git diff --check`; push GitHub chỉ khi PASS. Không coi push là sửa xong bản live.
### Chặn trước L5: sửa launcher tự đóng (PLAN.md, 13/11/2026)

- [ ] **B0 — Tái hiện có bằng chứng:** mở đúng `D:\CLASP\cham_cong\sync-deploy.bat` bằng Notepad, kiểm dấu nhận dạng/path; chạy từ CMD với `call` và xem log dừng ở đâu; xác nhận `where clasp` là `.cmd` hay executable.
- [x] **B1 — RED/GREEN:** test bắt buộc `call clasp` cho deployments/push/deploy đã RED đúng vì bản cũ thiếu `call`; tạo launcher mới `CAP_NHAT_CHAM_CONG.cmd` theo mẫu Dạy Bù (tự lấy mã mới → kiểm deployment → đẩy Apps Script → cập nhật link → dừng ở `Press any key`). GREEN: 14 Node tests, syntax `Code.gs`, `git diff --check` PASS trên Ubuntu. Test còn chặn mọi lệnh `clasp deployments/push/deploy` không có `call`.
- [ ] **B2 — Windows lỗi an toàn:** chạy bản sao batch có `PROJECT_DIR` sai trong CMD; phải dừng, ghi `LOI:`, không chạy push/deploy, và hiện `Press any key`. **Chờ kiểm trên máy Windows — Ubuntu không thể xác nhận hành vi CMD.**
- [ ] **B3 — Windows thật:** commit/push sau B2; chạy launcher đúng từ CMD, xác nhận log 4 bước và `XONG:`/`Press any key`; sau đó nhấp đúp kiểm y hệt. Nếu lỗi, gửi log, không chạy lại mù. **Chưa được chạy bản thật.**

- [ ] **L5 — Cập nhật Apps Script:** chỉ sau B3 PASS, cập nhật đúng dự án; xác nhận danh sách file chạy đã sạch (4 file chính hoặc file phụ đã chứng minh cần thiết), không còn `.gs` do Node test sinh ra, hàm lịch và `onEdit` còn; nếu đổi web app, deploy đúng link hiện dùng.
- [ ] **L6 — Tin thử có kiểm soát:** kiểm bot thật bằng `kiemTraBotLichLam()`, kiểm ID nhóm/topic, chạy `testGuiLichLamNow()` đúng một lần, đối chiếu tin Telegram/ca/ngày và nhật ký không còn `require`; không gửi bù hàng loạt.
- [ ] **L7 — Xác nhận tự động và phòng ngừa:** kiểm một lần chạy 21:00–22:00 VN tiếp theo có đúng một tin và log thành công; xác nhận `onEdit` không còn lỗi; cập nhật README tên bot theo thực tế, ghi hướng dẫn lọc file và kế hoạch cảnh báo thất bại. Sau đó mới tiếp tục A→E.

## Đã xong

- [x] Gộp IN / OUT / VẮNG vào một sheet CHECK IN.
- [x] Báo cáo ngày/tháng; phát hiện Vắng không báo.
- [x] Xuất CSV/XLSX chấm công một chiều; CSV UTF-8 BOM; ưu tiên `CHECK IN - Tháng MM-yyyy` nếu có.

## Liên kết một chiều với Bảng lương (04/11/2026)

- [x] Giao diện Báo cáo tháng chỉ còn một nút tải Excel v4 và một nút xem trước; CSV/bảng gọn giữ ở mã tương thích, không hiện nút gây nhầm.
- [x] Hiện trạng thái đang xử lý, kết quả/lỗi và link tải dự phòng; nút Chốt tháng tách riêng, không tự chạy khi xuất.
- [x] Kiểm thử giao diện giả lập và toàn bộ bảy bộ Node test; không đổi `Code.gs` hay dữ liệu chấm công.
- [ ] Cập nhật đúng bản triển khai Apps Script của trang Báo cáo tháng đang dùng, rồi tải file Excel thật và kiểm tra 3 sheet/25 cột với Bảng lương trước khi tính lương.

## Rà soát an toàn v4 (chạy Node, chờ kiểm thử Apps Script thật)

- [x] Hai ca lịch cùng tên khác giờ và hai Exception cũ cùng ngày không bị gộp trong file xuất.
- [x] Quota ca quên thứ 5 cùng ngày bật tín hiệu KPI.
- [x] Tuần vắt tháng đọc tháng kề khi có dữ liệu; thiếu thì cảnh báo chưa đủ dữ liệu.
- [x] Giờ Exception chồng nhau không cộng đôi trong tổng kiểm soát của tháng được xuất.
- [x] Chốt lại lỗi giữa hai bản snapshot phục hồi tên bản cũ trong kiểm thử mô phỏng.
- [ ] Kiểm thử với Google Sheets/Apps Script thật: tải XLSX, mở lại, đối chiếu sheet/cột/dữ liệu và thử bot nhận file.
- [ ] Kiểm thử chốt tháng trên bản sao Sheets trước khi dùng trên dữ liệu thật; không thử lỗi nhân tạo trên bản thật.
- [ ] Đối chiếu tuần vắt tháng có ca trùng/chồng ở tháng kề và dữ liệu cũ chưa có ID; nếu bất định, yêu cầu quản lý kiểm tra trước khi tính lương.

## Đợt nâng cấp đã chốt

### 1. Tài liệu và hợp đồng dữ liệu
- [ ] Cập nhật README/PLAN/context theo luật miễn trừ 4 lần, phép/KPI, Exception, 40/46 giờ và snapshot tháng.
- [ ] Ghi contract Excel 3 sheet + CSV gọn; giữ CSV 12 cột cũ không đổi.

### 2. Tính từng ca, miễn trừ và KPI
- [ ] Viết test RED: IN/OUT đầy đủ, trễ, ra sớm, quên IN, quên OUT, lần 1–4, lần 5, reset qua năm.
- [ ] Ca đủ IN/OUT tính theo giờ thực tế; trễ không mất giờ.
- [ ] Ca lịch thiếu IN/OUT lần 1–4 không tự tính công, ghi quota + Chờ quản lý kiểm tra; lần 5 vẫn không công + KPI + câu nhắc đã chốt.
- [ ] Popup lần chấm sau: ca thiếu gần nhất + quota còn lại.

### 3. Kiểm soát giờ giáo viên
- [ ] Tổng giờ tuần Thứ Hai–Chủ nhật.
- [ ] CHECK IN từ 40 giờ/tuần trở lên cảnh báo liên hệ Ms. Vân Anh, không chặn chấm.
- [ ] Báo cáo mốc 46 giờ: còn lại / đủ / vượt; không tự tính overtime.

### 4. Vắng, phép và KPI theo ngày
- [ ] Ốm/việc gia đình + PH xin nghỉ báo trước giờ ca: không KPI, ghi Trừ phép/ghi chú đúng.
- [ ] Báo sau giờ ca: ghi số phút báo trễ + KPI.
- [ ] Nghỉ không báo: không công + KPI.
- [ ] File xuất liệt kê ngày, ca, lý do của từng ảnh hưởng KPI/phép.

### 5. Chốt tháng
- [ ] Nút `🔒 Chốt tháng MM/yyyy` tạo CHECK IN + LICHLAM snapshot dễ nhìn.
- [ ] Không ghi đè snapshot khi chưa xác nhận.
- [ ] Export tháng cũ ưu tiên cả hai snapshot; cảnh báo nếu thiếu lịch snapshot.

### 6. Exception
- [ ] Nút CHECK IN/OUT CA ĐỘT XUẤT, lý do bắt buộc, ảnh + GPS.
- [ ] Exception đủ dấu: Chờ duyệt, không tự cộng 46 giờ/lương.
- [ ] Exception thiếu đầu 1–3 trong tháng: Chờ duyệt; từ lần thiếu đầu thứ 4: không tính giờ.
- [ ] Exception không dùng quota 4 lần miễn trừ ca lịch.
- [ ] Chặn Exception mở trùng/chồng giờ.

### 7. Báo cáo và file xuất
- [ ] Khối `⚠️ Cần xử lý`, `🕒 Giờ giáo viên theo tuần`, `✅ Ca được tính giờ?`.
- [ ] Excel `Tong hop GV`, `Chi tiet ca`, `Gio tuan`.
- [ ] CSV gọn theo Chi tiet ca; giữ CSV 12 cột cũ.

### 8. Kiểm tra và bàn giao
- [ ] Node test PASS + kiểm tra syntax Code.gs/Index.html/BaoCao.html + git diff --check.
- [ ] Push GitHub.
- [ ] Anh dán Code.gs/Index.html/BaoCao.html vào Apps Script và triển khai Phiên bản mới.
- [ ] Test thật toàn bộ tình huống và xác nhận không có thao tác xem/xuất nào ghi sửa dữ liệu nguồn.
