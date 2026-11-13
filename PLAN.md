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
- Exception đủ IN/OUT: `Chờ duyệt Exception`, **chưa cộng vào giờ đề xuất trả lương**; giờ đã chấm vẫn nằm trong tổng **theo dõi giới hạn 40/46 giờ** để quản lý thấy nguy cơ quá giờ. Chỉ duyệt kèm Người duyệt mới chuyển sang giờ đề xuất tính công; không cộng đôi giờ chồng ca.
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

## Kế hoạch sửa báo cáo, cập nhật và chuyển ca (12/11/2026 — đã chốt phạm vi, chưa triển khai)

**Xác nhận của anh Trương:** Chốt A (đường cập nhật), B (Hôm nay), C (Giờ tuần), D (duyệt Exception), E (chuyển ca). Ca nào bắt đầu sau thì nhân viên vẫn **tự bấm CHECK OUT khi kết thúc ca đó**; hệ thống chỉ tự OUT **ca trước đang mở tại thời điểm chuyển ca đã xác nhận**, không tự OUT ca mới theo giờ lịch. Giờ ca trước tính đến đúng thời điểm chuyển; Exception đủ IN/OUT chờ quản lý duyệt mới vào giờ đề xuất trả lương. Đây là quy tắc đã chốt, không cần hỏi lại trước khi bắt đầu triển khai; sau khi cập nhật tài liệu phải báo anh trước rồi mới làm mã.

**Mục tiêu:** Hôm nay trả dữ liệu hoặc lỗi rõ thay vì treo trên 600 giây; Giờ tuần giảm từ mốc đo ~196–198 giây và được đối chiếu dữ liệu thật. Giữ nguyên phần Tháng đang tải nhanh; DUYET_EXCEPTION hiển thị đúng ca chờ; file cập nhật Windows cập nhật đúng link; chuyển ca có xác nhận và không mất giờ đã làm. Không sửa lịch sử chấm công gốc để thử nghiệm.

### A. Sửa đường cập nhật trước — tránh kiểm nhầm bản cũ

- **Đã xác định:** file anh đang nhấp là `D:\CLASP\cham_cong\sync-deploy.bat` bản cũ (ảnh Notepad: không có nhật ký; `clasp deploy` không chọn ID). Bản mới em đã đẩy GitHub nằm trong repo nhưng **chưa tới đúng file anh chạy**; `D:\cham_cong` là thư mục mã mà batch cũ chuyển tới, khác thư mục đặt batch. Không coi `clasp push` là trang `/exec` đã đổi.
- Kiểm xem `D:\CLASP\cham_cong` và `D:\cham_cong` là hai bản sao khác nhau hay một liên kết; xem `.clasp.json` ở thư mục nào và tên file batch thật anh nhấp. Không đoán đường dẫn bằng ảnh Notepad.
- Cấp một file cập nhật thay thế tải được, đặt **đúng `D:\CLASP\cham_cong\sync-deploy.bat`** sau khi giữ bản cũ để phòng. File dùng `cd /d D:\cham_cong` nếu mã nguồn đúng ở đó; ghi nhật ký cạnh file batch, kiểm từng bước `git pull` → `clasp push` → `clasp deploy -i <ID của URL anh đang dùng>`, hiện thành công/thất bại và dừng màn hình. Cần kiểm ID với `clasp deployments` trước khi áp dụng, không suy luận ID chỉ từ URL. Bảo đảm lối chạy bằng `cmd /k` hoặc shortcut giữ cửa sổ mở kể cả khi batch có lỗi cú pháp. Không lưu token trong log.
- Test một lượt mô phỏng thành công và một lượt lỗi trên **bản sao**; xác nhận nhật ký tạo ra ở đúng thư mục người dùng nhìn thấy. Sau cập nhật thật, so sánh fingerprint giao diện/hàm tại URL `AKfycbzdMM-3xoEi1O5wJ3enPHBga3Y464J6rrt9RV7Sv978DocXXX5rgIE9AmHjI_22EY-o` với mã đã đẩy; không lặp chạy batch vô ích.

### B. Sửa Hôm nay (Ngày)

- **Bằng chứng:** `BaoCao.html:164-225` hiện gọi `getBaoCaoNgay()` rồi đợi `getChuaCham()` mới vẽ toàn bộ; hai lệnh phụ thuộc nối tiếp. `Code.gs:667-713` và `715+` đọc nguyên CHECK IN; cần đo riêng từng lời gọi trên trang thật cùng thời gian Google Apps Script. Giờ tuần đã đo trực tiếp ~198 giây mới trả 6 dòng, nên test Node trước đây chưa chứng minh tốc độ thực tế.
- Viết test UI RED: `getBaoCaoNgay` trả trước nhưng `getChuaCham` chậm/lỗi thì phần đã chấm vẫn xuất hiện; báo riêng `Chưa chấm đang tải/không tải được`; hai lần chọn ngày liên tiếp không bị kết quả cũ ghi đè. Sau đó tách hai request song song hoặc trả một gói dữ liệu được đọc một lần; ưu tiên hiển thị dữ liệu đã chấm ngay. Có thông báo quá lâu và nút thử lại, không tự ghi kết luận `0` khi request lỗi.
- Đo số lần/quy mô đọc Sheet thực sự, loại bỏ đọc trùng CHECK IN hoặc thu hẹp bằng nguồn dữ liệu/đánh chỉ mục phù hợp sau khi đo. Không tối ưu bằng cách bỏ sót các ca nhiều lần trong ngày. Kiểm hôm nay và một ngày có nhiều ca/VẮNG trên URL thật.

### C. Sửa Giờ tuần ở nguồn đọc

- **Bằng chứng:** `Code.gs:1223-1242` dù đã loại tháng khác vẫn đọc `getDisplayValues()` **và** `getValues()` toàn bộ `CHECK IN` hiện hành, rồi mới lọc 7 ngày; `getExceptionApprovalMap_` cũng đọc tab duyệt. Bản live tuần 09–15/11 trả 6 dòng sau ~198 giây. Cần phân rã thời gian từng chặng ở Apps Script (lấy Sheet, đọc range, ghép ca, đọc duyệt), không đoán chặng chậm.
- Viết test RED/benchmark fixture có CHECK IN lớn, hai tháng vắt tuần, hai ca trùng tên/giờ khác nhau và Exception chờ/đã duyệt; khẳng định số lượng dòng/Sheet được đọc theo thiết kế mới. Đề xuất **chỉ mục ngày cho báo cáo** được cập nhật khi ghi chấm công, hoặc Sheet báo cáo ngày/tuần gọn với khóa sự kiện ổn định; lần đầu xây chỉ mục có thanh tiến độ/chạy theo lô, không bắt người xem đợi quét lịch sử. Cân nhắc khả năng sửa tay trong CHECK IN và cơ chế làm mới chỉ mục trước khi chọn kỹ thuật; không dùng cache khiến số giờ sai.
- Tách dữ liệu tuần khỏi hàm xuất lương/tháng; gộp các khoảng thời gian giao nhau trước khi cộng; giờ Exception chờ chỉ vào tổng theo dõi 40/46, không vào lương. Khi thiếu nguồn tuần vắt tháng hiện rõ `Chưa đủ dữ liệu`; khóa hoặc đánh số request để tuần cũ không ghi đè. Kiểm tốc độ trên URL thật với cùng tuần trước/sau, đối chiếu tổng giờ với dữ liệu gốc.

### D. Duyệt Exception — không sửa dữ liệu gốc khi xem báo cáo

- Mã hiện tại `Code.gs:1094-1132` coi ô Quyết định trống là Chờ duyệt khi **đã có dòng**; `dongBoDuyetException()` lại quét toàn bộ CHECK IN/snapshot để tìm ca và có thể rất chậm. Trang thật từng trả `count:0` trong ~4 giây; cần kiểm đúng Sheet dự án, tiêu đề 13 cột, ID ẩn, số cặp EXCEPTION_IN/OUT và phiên bản chạy tại đúng URL. Không suy từ số 0 rằng anh đã nhập sai.
- Viết test RED cho ba tình huống: quyết định trống nhưng có dòng; xoá **cả dòng** rồi đồng bộ phục hồi đúng một ca; không tìm thấy cặp/ID thì báo `Cần kiểm tra dữ liệu Exception` thay vì `không có ca`. Tách hàm xem báo cáo (chỉ đọc, không tạo/chỉnh tab) khỏi thao tác `↻ Đồng bộ ca Exception` có trạng thái/số dòng rõ. Kiểm tháng đang xem và trạng thái đã duyệt/từ chối; chỉ quản lý mới ra quyết định.

### E. Chuyển từ ca lịch đang mở sang Exception — có hỏi trước

- Luồng hiện hữu `Code.gs:565-573`: VÀO ca lịch khi Exception còn mở tự RA Exception rồi IN ca lịch. **Giữ nguyên chiều này.** Chiều ngược ở `submitException` `Code.gs:651-654` đang chặn nếu tìm thấy **bất kỳ IN ca lịch cùng ngày**, kể cả ca đã OUT — đó là điều kiện quá rộng, cần thay bằng dò **ca lịch thực sự đang mở** theo mã NV + ngày + nhãn/ID ca, ghép IN/OUT theo đúng ca; không ghép nhầm hai ca cùng tên khác giờ. Dò trên máy chủ từ CHECK IN thật, không tin trạng thái giao diện.
- Trường hợp Ms. Vân: IN ca lịch 13:15, dự kiến 15:15; bấm VÀO Exception lúc 15:00. Hiện: `Bạn đang trong ca [tên ca] (đã VÀO lúc 13:15). Nếu tiếp tục, hệ thống sẽ tự RA ca này lúc 15:00 rồi VÀO ca Exception lúc 15:00. Giờ ca lịch 13:15–15:00 vẫn được ghi nhận; giờ Exception từ 15:00 được theo dõi, chỉ đề xuất tính công khi bạn tự RA Exception và quản lý duyệt. Bạn muốn tiếp tục không?` Nút `Tiếp tục, tự RA ca trước` và `Hủy`. **Không cộng 15 phút chưa làm (15:00–15:15)**. Ca Exception là ca bắt đầu sau nên nhân viên phải **tự bấm CHECK OUT** khi kết thúc; hệ thống không tự RA Exception lúc giờ lịch hay lúc 16:00. Nếu chiều ngược Exception→ca lịch, hệ thống chỉ tự RA Exception đang mở ngay lúc IN ca lịch, rồi nhân viên tự RA ca lịch khi kết thúc. Tổng giờ thực tế là hợp các khoảng đã có dấu, không mất khoảng đã làm và không cộng trùng.
- Thiết kế xác nhận **hai bước**: bước 1 chỉ đọc và trả ca đang mở + mã xác nhận ngắn hạn; bước 2 kiểm tra lại trạng thái dưới `LockService` rồi ghi `OUT` ca lịch và `EXCEPTION_IN` cùng timestamp. Nếu người dùng Hủy, không ghi dòng/ảnh/Telegram. Nếu ca đã OUT ở thiết bị khác hoặc bấm lặp, không tự tạo OUT/IN trùng; thông báo trạng thái mới và yêu cầu tải lại. Kiểm quyền ảnh/GPS/lý do **trước** khi ghi hai dòng; khi một bước ghi lỗi phải báo rõ ca nào đã ghi, tránh xác nhận sai hoặc cộng đôi ở lần thử lại. Ghi chú mỗi dòng: `Hệ thống tự RA ca lịch khi VÀO Exception` + ID chuyển ca; gửi thông báo hai thao tác đúng một lần theo khả năng gửi. Nếu không có ca lịch mở, cho VÀO Exception như cũ; ca lịch đã OUT trước đó không chặn oan.
- Test bắt buộc: 13:15→15:00 (1h45 ca lịch), rồi 15:00→16:00 Exception khi nhân viên **tự RA lúc 16:00** (1h chờ duyệt); trước khi tự RA, Exception còn mở và chưa có giờ hoàn tất. Không trùng 15 phút; Hủy không ghi; có nhiều ca trong ngày; đã OUT không chặn; hai lần bấm/concurrent; GPS/ảnh thiếu không RA ca cũ; chiều Exception→ca lịch hiện tại không đổi nhưng ca lịch mới vẫn chờ nhân viên tự RA; báo cáo tuần và xuất không cộng đôi và không tự trả lương Exception chờ.

### F. Kiểm chứng và triển khai

1. Viết bài test tái hiện đúng từng lỗi trước (RED), sửa từng mục nhỏ rồi chạy lại (GREEN). Chạy toàn bộ `test_*.js`, kiểm cú pháp `Code.gs`/HTML, `git diff --check`; kiểm chuyển ca trên **bản sao Sheet** trước khi chạm dữ liệu thật.
2. Đẩy GitHub; dùng file batch **đúng đường dẫn đã xác nhận** để cập nhật deployment đúng URL; đối chiếu nhật ký và fingerprint trang sau triển khai. Không xem GitHub push là web đã cập nhật.
3. Kiểm trên URL thật: Hôm nay và tuần trả dữ liệu hoặc lỗi có hướng dẫn, đo thời gian; Exception trống quyết định có ca chờ tương ứng; thử chuyển ca có xác nhận trên môi trường thử trước, đối chiếu giờ và bản Excel. Chỉ đánh dấu xong khi anh thấy kết quả đúng trên trang.

**Rủi ro/mở:** Không có quyền đọc cấu hình clasp/Sheet trên máy Windows từ máy chủ này; cần định danh deployment bằng `clasp deployments` hoặc giao diện Apps Script. Chỉ mục nếu có phải xử lý các chỉnh sửa tay và bản chốt tháng mà không thay dữ liệu gốc. Ngoài phạm vi: tự chốt lương, tự duyệt Exception, bù 15 phút chưa làm thực tế.

## Tiếp tục trong chat mới

Sau `/new`, anh gửi đúng câu: **“Đọc `/home/ubuntu/cham_cong_in-out_joy/PLAN.md` (mục Kế hoạch sửa báo cáo, cập nhật và chuyển ca), `context.md`, `TASKS.md` và trạng thái Git; tiếp tục triển khai các mục A→E đã chốt, mỗi mục kiểm thử xong mới làm tiếp. Không hỏi lại các quyết định đã ghi trong PLAN.md; báo rõ phần đã làm và phần chưa làm.”** Trước khi chuyển chat giữa chừng, em phải cập nhật trạng thái thật và bước kế tiếp vào `context.md`/`TASKS.md` để chat mới không dựa vào trí nhớ. `/new` tạo cuộc trò chuyện mới; `/retry` chỉ gửi lại tin cuối, không khôi phục tiến độ công việc. Nếu chỉ gần đầy ngữ cảnh mà muốn ở nguyên cuộc trò chuyện, dùng `/compress` thay vì `/new`.

## Sự cố gửi lịch 06–13/11/2026 — kế hoạch khắc phục ưu tiên (chưa triển khai)

**Bằng chứng:** Topic 📅 Lịch làm việc trong Office–Joy nhận tin gần nhất lúc 21:10 ngày 05/11 (lịch 06/11) từ `@joy_lichlam_sotw_daybu_bot`. Lần chạy `sendTomorrowWorkSchedule` 21:10 ngày 06/11 và `onEdit` 22:52 cùng ngày đều thất bại: `ReferenceError: require is not defined` tại `generate_v4_sample:2:10`. Trong repo, `generate_v4_sample.js` dòng 2 gọi `require`, nhiều `test_*.js` cũng gọi `require`; chúng là file thử Node, không phải Apps Script. Chỉ riêng file đầu tiên được log không chứng minh lỗi khác đã được xử lý. Trước đây đã hướng dẫn anh xóa thủ công nhiều file; **dừng cách xóa từng file**, vì lần `clasp push` sau có thể mang chúng trở lại.

**Ranh giới dự án:** Mã nguồn gửi lịch ở repo `Aliuliu001/cham_cong_in-out_joy` (`Code.gs:139–256`), đọc `LICHLAM`, trigger `sendTomorrowWorkSchedule` khoảng 21:00–22:00 VN, chống gửi trùng bằng `LICH_LAM_SENT_dd/MM/yyyy`. Topic gửi lịch được code kiểm tra `LICH_LAM_CHAT_ID=-1004378772858`, `LICH_LAM_THREAD_ID=50`; **phải xác minh lại trên Telegram/Apps Script thật**, không suy từ ảnh hoặc chỉ từ repo. Bot hiện trên ảnh là `@joy_lichlam_sotw_daybu_bot`; README ghi `@joy_victini_bot` nên tài liệu đã lệch thực tế, kiểm tra `kiemTraBotLichLam()` rồi mới sửa README/đổi token. Repo `joy_day_bu` xử lý SOTW; không sửa logic SOTW để chữa lịch. Anh Trương xác nhận các **trao đổi/yêu cầu thay đổi SOTW về sau diễn ra trong topic hội thoại hiện tại**; đây không mặc nhiên là topic bot đăng SOTW (`SOTW_3`) và không đổi `SOTW_THREAD_ID` khi chưa có yêu cầu rõ.

**Đường dẫn được xác nhận bằng ảnh:** Windows làm việc và bấm cập nhật tại `D:\CLASP\cham_cong\sync-deploy.bat`; bản batch đang theo dõi trong repo đặt `PROJECT_DIR=D:\cham_cong` (cũ). Cần kiểm tra chính file ở đường dẫn anh bấm (bản sao/đường dẫn thật), không đoán file GitHub tự thay thế file Windows. Không chạy batch trước khi kiểm chứng đường dẫn và cấu hình lọc file.

### Thứ tự triển khai (mỗi bước có bằng chứng, không đổi dữ liệu chấm công)

1. **Chốt trạng thái đầu vào:** sao lưu/ghi danh sách tệp hiện có trong Apps Script, kiểm tra liệu anh đã xóa vài file `test_`/`generate_v4_sample` bằng tay chưa; kiểm tra `Code.gs_add.gs` và các `.gs` lạ trước khi quyết định giữ/xóa. Kiểm tra trigger `sendTomorrowWorkSchedule` còn đúng một lần, cấu hình bot/nhóm/topic có đủ, và `Lần thực thi` sau 06/11 có lỗi khác không. Không in bot token hoặc bí mật trong tài liệu/ảnh. Không chạy `setup()`.
2. **Chặn tái diễn tại nguồn:** tạo `.claspignore` trong repo theo allowlist chính xác 4 file `Code.gs`, `Index.html`, `BaoCao.html`, `appsscript.json` (kiểm tra cú pháp thực tế với `clasp` trên máy Windows; dấu phủ định/ngoại lệ phải hoạt động). Giữ Node tests và `generate_v4_sample.js` ở GitHub, không đẩy sang Apps Script. Lưu ý `clasp push` cập nhật toàn bộ nội dung dự án: so sánh trước/sau, không xóa file Apps Script hợp lệ nếu `Code.gs_add.gs` đang chứa hàm sản xuất.
3. **Sửa đúng launcher:** sửa `sync-deploy.bat` `PROJECT_DIR=D:\CLASP\cham_cong`; chỉ `git pull` nếu working tree sạch, dừng rõ khi lỗi; từ thư mục này kiểm tra `.clasp.json` trỏ đúng project ID `1FUf9yVSki_-dSpM4UfBsdsBuDf2pSdaKNq66ioSYIr12BQfe_qLJolex`. Dùng `clasp deployments` xác nhận deployment ID ứng với link báo cáo thật trước `clasp deploy -i`; giữ log không chứa token, dấu thành công/thất bại và cửa sổ không tự đóng. Nếu launcher anh bấm nằm ngoài repo/sao chép, thay đúng file đó rồi mở Notepad xác nhận dòng `PROJECT_DIR` mới **trước khi chạy**.
4. **Kiểm thử an toàn trước cập nhật:** viết/ chạy test kiểm danh sách file được phép đưa lên, mô phỏng batch thành công và thất bại trong CMD trên bản sao (không đụng Sheet/deployment thật); chạy `node test_lichlam_telegram.js`, các `test_*.js`, kiểm cú pháp `Code.gs`, `git diff --check`. Đẩy các thay đổi source/config lên GitHub; xác nhận GitHub push **không** tự cập nhật Apps Script.
5. **Cập nhật live có kiểm soát:** dùng chính launcher đã xác thực hoặc thay thế thủ công an toàn; xác nhận Apps Script chỉ còn 4 file cho phép (hoặc file bổ sung đã chứng minh là cần thiết), không còn `generate_v4_sample.gs`/`test_*.gs`, hàm gửi lịch và `onEdit` vẫn hiện. Chỉ khi cần web app mới triển khai đúng deployment hiện dùng; trigger chạy trên mã HEAD đã lưu, không phụ thuộc Phiên bản 44.
6. **Xác nhận gửi lịch:** chạy `kiemTraBotLichLam()` (không lộ token), rồi `testGuiLichLamNow()` **chỉ một lần** sau khi kiểm tra đầu vào; xác minh Telegram có đúng bot, nhóm, Topic, ngày và ca. Hàm thử không đánh dấu đã gửi nhưng gửi tin thật, tránh bấm lặp. Kiểm `Lần thực thi` không còn lỗi `require`. Quan sát lần tự chạy 21:00–22:00 tiếp theo: đúng một tin lịch ngày mai, trạng thái hoàn thành, không gửi trùng; nếu không thành công, ghi nguyên lỗi mới rồi xử lý riêng.
7. **Phòng ngừa:** bổ sung tài liệu triển khai (file nào được đẩy, kiểm tra trước deploy), và cân nhắc cảnh báo lỗi khi trigger thất bại sau khi đã xác nhận kênh cảnh báo/quyền truy cập; không hứa cơ chế này đã có. Sửa README tên bot theo kết quả kiểm tra thật. Không tự gửi bù hàng loạt cho các ngày đã qua.

**Đạt yêu cầu khi:** có log thử thành công + ảnh/tin trong Topic lịch đúng nơi + log tự động đêm tiếp theo thành công, không còn lỗi `require` ở `onEdit`; launcher sau `git pull` không thể tái tải file Node vào Apps Script. Nếu không truy cập được máy Windows hoặc Apps Script, ghi rõ bước chờ anh thao tác, không đánh dấu đã sửa live.

## Việc tiếp theo

Ưu tiên chuỗi sửa lịch ở trên, bắt đầu xác nhận file launcher và cấu hình file được đưa lên Apps Script; sau khi có bằng chứng gửi lịch tự động thành công mới quay lại các mục A→E ở kế hoạch báo cáo/chuyển ca. Xem `TASKS.md` và `context.md` để biết trạng thái từng bước.