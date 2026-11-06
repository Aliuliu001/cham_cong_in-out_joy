# Khôi phục xuất Sheet, xuất Excel một lần bấm và báo cáo giờ tuần

> **For Hermes:** Implement task-by-task, test each task before commit; this is a plan only.

**Goal:** Giữ chấm công là nguồn giờ VÀO/RA, KPI chấm công và dữ liệu gợi ý phép; trả lại nút xuất Sheet bị xóa nhầm; giảm thao tác tải Excel; thêm trang Tuần và cảnh báo Telegram khi vượt 40 giờ.

**Architecture:** Các việc độc lập: (1) ghi báo cáo vào Google Sheet đang dùng, (2) xuất Excel chấm công một chiều sang Bảng lương, (3) xem giờ theo tuần, (4) gửi cảnh báo ngưỡng giờ đến nhóm quản lý. Repo chấm công vẫn đánh giá KPI của mình và xuất gợi ý phép, nhưng không thực hiện trừ phép hoặc tính tiền lương; bên Bảng lương quyết định khoản trừ sau khi kiểm tra. Chỉ sửa mã tính giờ/nguồn dữ liệu sau khi đối chiếu cho thấy sai.

**Tech Stack:** Google Apps Script `Code.gs`, HTML/JS `BaoCao.html`, Node tests hiện có.

---

## Hiện trạng đã đọc (commit de652a6)

- `BaoCao.html:48-83` chỉ có tab Ngày/Tháng; nút `Xuất về Sheet BAOCAO_THANG` đã biến mất, nhưng hàm `xuatBaoCaoSheet(thangStr)` vẫn tồn tại ở `Code.gs:1243`. Hàm hiện ghi `BAOCAO_THANG - MM/yyyy` và `Lỗi tháng MM/yyyy`, xóa nội dung hai sheet đích nếu đã có; không được gọi nhầm khi tải Excel.
- `BaoCao.html:239-269` tạo file Drive qua server sau lần bấm đầu, lần bấm thứ hai mới mở URL tải. `Code.gs:1005-1014` tạo một spreadsheet mới mỗi lần; không có cơ chế tái dùng file đã tạo. Màn hình dài vì máy chủ phải gom tháng, các ngày ca lịch, các tuần và tạo workbook.
- Workbook đang có `Tong hop GV`, `Chi tiet ca` (25 cột), `Gio tuan`. Nhưng phần xuất hiện còn trường KPI/phép ở `Code.gs:1017-1024`, `1085-1096`: cần xử lý tương thích trước khi bỏ hoặc đổi tên cột; không âm thầm làm hỏng app Bảng lương đang đọc file.
- Cảnh báo 40/46 giờ hiện có trong dữ liệu xuất (`Code.gs:1094`) và trước khi IN (`Code.gs:372`), nhưng trang báo cáo không có tab Tuần để quản lý xem. Các tuần vắt tháng và Exception chưa duyệt cần hiển thị tách biệt, không cộng đôi khoảng giờ trùng.

## Quy tắc sản phẩm

1. Repo này ghi nhận giờ vào/ra thực tế, giờ thiếu dấu, giờ ca Exception, **KPI chấm công** và nguồn đối chiếu. Không tự trừ phép, không tính tiền lương. Excel giữ KPI/lý do/ngày cụ thể. Cột phép chỉ là **`Gợi ý Bảng lương xem xét`**, không phải phép đã trừ hay quyết định thanh toán. Phân biệt rõ `giờ thực tế có đủ VÀO/RA`, `giờ cần kiểm tra`, `giờ Exception chờ duyệt`; không trình bày giờ tạm/giờ lịch như giờ thực tế.
2. Giữ nguyên chức năng `📤 Xuất về Sheet BAOCAO_THANG` (giải thích ghi vào Sheet, KHÔNG tải file). Giữ `🔒 Chốt tháng` riêng, và `📥 Tải Excel chấm công cho Bảng lương` riêng; 3 hành động không dùng chung trạng thái/nút.
3. Tuần = Thứ Hai–Chủ nhật, gồm cả tuần bắc qua ranh giới tháng; trên màn hình **từ 40 giờ** hiện cảnh báo sớm, **trên 46 giờ** cảnh báo đỏ; đúng 46 giờ là vừa mốc. Telegram gửi khi **vượt 40 giờ** (`>40:00`, không gửi ở đúng 40:00) theo câu chữ anh dùng; hai ngưỡng phải test riêng để tránh nhập nhằng. Giờ Exception chờ duyệt không phải giờ được duyệt trả lương. Khi thiếu dữ liệu hoặc tuần chưa kết thúc, ghi `chưa đủ dữ liệu`, không cho số 0 giả là kết luận cuối.
4. Bot gửi sang **topic quản lý** anh chỉ định (`https://t.me/c/4452694903/2`), dùng cấu hình địa chỉ riêng của thông báo giờ tuần, không đổi nơi nhận tin IN/OUT hằng ngày. URL là đường dẫn topic, **không tự coi `4452694903` là chat_id Bot API hoặc `2` là message_thread_id**; xác nhận ID thật từ tin bot nhìn thấy trong topic/test gửi trước. Khử trùng theo nhân viên + tuần + ngưỡng, không gửi lại do refresh/bấm xem báo cáo/chạy lặp; có cơ chế gửi lại khi tăng sang mức >46 giờ.

## Task 1 — Khôi phục nút xuất Sheet (ưu tiên sửa sai)

**Files:** `BaoCao.html`, `test_baocao_ui.js`; chỉ sửa `Code.gs` nếu kiểm chứng hàm cũ có lỗi.

- Test đỏ: trong tab Tháng có cả ba nút; nút Sheet gọi đúng `xuatBaoCaoSheet(tháng đang chọn)`, không gọi `chotThangAnToan` hoặc hàm tải Excel; thông báo đang ghi/đã ghi/lỗi ở khu vực riêng, chặn bấm trùng.
- Gắn lại nút ở khu vực Báo cáo tháng với mô tả `Ghi vào BAOCAO_THANG và Lỗi tháng trong Google Sheet; không tải file`; trước khi chạy phải xác nhận vì `xuatBaoCaoSheet` hiện xóa và viết lại hai sheet của tháng. Khi cần, đổi thông báo trả về để nêu tên sheet thực tế (`BAOCAO_THANG - MM/yyyy`, không nói sai là tab gốc).
- Kiểm tháng không hợp lệ, tháng trống, lỗi server, bấm lại, và chắc chắn Chốt tháng vẫn có mặt. Không chạy hàm thật lên Sheet sản xuất trong test tự động.

## Task 2 — Excel giờ + KPI + gợi ý phép, không khấu trừ

**Files:** `Code.gs`, `test_payroll_v4.js`, `test_v4_regressions.js`, tài liệu README/TASKS sau khi duyệt.

- Chụp hợp đồng file hiện hành (3 sheet/25 cột/`attendance-export-v4`); kiểm tra repo Bảng lương đang đọc theo tên hay vị trí. **Giữ KPI chấm công, lý do và ngày ảnh hưởng KPI**; không xóa KPI khỏi báo cáo hoặc Excel. Gợi ý phép không phải số phép đã trừ. Nếu phải đổi tên/thêm cột thì phiên bản hóa hợp đồng file và kiểm test nhập của bên nhận trước khi dùng thật.
- Quên **một dấu** VÀO *hoặc* RA ở ca thường: tiêu dùng một lượt trong 4 lượt miễn trừ/năm của nhân viên; hiển thị `còn 4 → 3 → 2 → 1 → 0`, kèm ngày, ca, loại dấu thiếu, thứ tự lần. Lần thứ 5 trở đi giữ chính sách chấm công đã chốt (không tính giờ công, ghi ảnh hưởng KPI); **không suy ra trừ phép chỉ vì vượt quota**. Exception có quy định riêng, không tiêu dùng 4 lượt này. Năm 2026 giữ mốc bắt đầu đặc biệt 01/11/2026 đã chốt trước; năm sau reset 01/01. Không đếm trùng từ CHECK IN và snapshot tháng.
- **Mỗi ca có lịch bị thiếu mà không có báo VẮNG** phải xuất kèm ngày/thứ, ca, lý do và **gợi ý Bảng lương xem xét trừ X phép**; không hạch toán phép tại repo này. Với trường hợp cả ngày không có VÀO/RA và không báo VẮNG, ghi `Vắng không báo`; đề xuất `1 phép` cho T2–T6 và `2 phép` cho T7/CN như anh chốt. Ngày không có lịch không bị coi là vắng. Nếu có VẮNG hoặc chỉ thiếu một dấu thì ghi đúng loại lỗi riêng, KPI (nếu có) và gợi ý phép tương ứng; không che mất sự kiện bằng tổng tháng.
- **Mức gợi ý phép đã chốt:** tạo một hàm quy tắc duy nhất, không rải công thức ở Excel. Mỗi ca thiếu/chưa báo vào **T2–T6**: `Gợi ý trừ 1 phép`. Với **T7/CN**, xác định ca theo khung giờ lịch: chỉ ca sáng thiếu = `1 phép`; chỉ ca chiều thiếu = `1 phép`; cả sáng và chiều đều thiếu trong cùng ngày = `2 phép`. Cùng ngày T7/CN có một ca khác đã chấm hợp lệ thì chỉ gợi ý phép của buổi thiếu. Nếu ca không xác định được sáng/chiều, gắn `Cần Bảng lương duyệt — chưa xác định buổi`, không tự đoán. Đây là gợi ý rõ ràng để Bảng lương duyệt, không phải phép đã trừ.
- Đối chiếu ca đủ VÀO/RA, thiếu một dấu, thiếu cả ca khi cùng ngày có ca khác, không chấm cả ngày, VẮNG, Exception đủ/thiếu RA, trùng giờ, tháng chốt/chưa chốt, 31/12→01/01. Giờ chính xác đến phút; tổng phải khớp dòng chi tiết. Trong Excel ghi riêng `Gợi ý phép`, `Lý do/Ngày`, `Ảnh hưởng KPI`, `Cần Bảng lương duyệt`; cột phép hiện có phải được chú giải/đổi tương thích, không mang nghĩa `đã trừ`.
- Sheet `Gio tuan`: đối chiếu tuần vắt tháng với tháng kề; nếu chưa đủ dữ liệu ghi cảnh báo. Ghi tháng, nguồn bản chốt/dữ liệu hiện tại và phiên bản quy tắc, giữ một Excel cho bên nhận. Tháng đã chốt giữ kết quả theo quy tắc lúc chốt; muốn tính lại phải chủ động chốt/xuất lại, không âm thầm đổi số.

## Task 3 — Tối ưu chờ và tải Excel

**Files:** `BaoCao.html`, `Code.gs` nếu thêm cơ chế tái dùng file; `test_baocao_ui.js`, `test_payroll_export.js`.

- Đo và log thời gian cho các chặng đọc dữ liệu, tính ca/tuần, tạo Sheet, nhận link; xử lý chặng chậm nhất trước (tránh lặp đọc toàn bộ Sheet theo từng ca/ngày; `getAnnualMissedBefore` hiện được gọi trong vòng lặp mỗi ca).
- Phương án khuyến nghị: khi người dùng mở báo cáo tháng, **chỉ chuẩn bị Excel ở nền nếu họ chọn xuất**, hoặc cho phép nút `Chuẩn bị file`? Vì anh muốn đúng một nút, dùng `📥 Tải Excel chấm công`: lần bấm đầu tạo file, hiện tiến trình; sau khi xong ưu tiên kích hoạt tải từ hành động đã mở sẵn trong lần bấm đó (thử cửa sổ tải được mở ngay bằng click, sau đó điều hướng khi server trả link). Kiểm thật trong iframe Apps Script và trình duyệt chính; nếu popup/iframe bị chặn, giữ link tải xuất hiện rõ, không hứa chắc tải tự động sẽ luôn chạy. Khi file sẵn và tháng/nguồn không đổi, lần bấm sau tải ngay, không tạo bản sao mới.
- Cache chỉ an toàn nếu có dấu nhận diện dữ liệu CHECK IN + LICHLAM/snapshot và thời điểm tạo, đồng thời có nút/cơ chế tạo lại khi dữ liệu đổi; không dùng một file cũ sau khi sửa giờ hoặc chốt lại tháng. Trong lúc chờ, thông báo trạng thái và thời gian; lỗi không sửa dữ liệu gốc. Dọn file nháp thất bại/trùng để không rác Drive.
- Đánh giá phương án thay thế nếu cửa sổ chờ không khả thi: chuẩn bị sẵn file sau khi xem tháng rồi hiển thị duy nhất **một nút Tải Excel** khi sẵn; ghi rõ tạo nền và cập nhật mới khi dữ liệu đổi. Không tải từ callback mà không thử trực tiếp trên Apps Script.

## Task 4 — Tab `📅 Xem giờ tuần`

**Files:** `Code.gs`, `BaoCao.html`, `test_v4_week.js`, `test_baocao_ui.js`.

- Test đỏ với tuần 02/11–08/11, đổi tuần bằng ngày chọn, đúng 39:59 / 40:00 / 46:00 / 46:01; thứ Hai–Chủ nhật, tuần vắt tháng/năm, ca qua nửa đêm, ca đang mở, thiếu dấu, ca Exception trùng giờ và ngoại lệ chưa duyệt.
- Viết hàm báo cáo tuần riêng dùng chung phép gộp khoảng giờ với dữ liệu xuất (không tính lương); trả từng GV: giờ thực tế đủ dấu, Exception chờ duyệt, tổng giờ cần theo dõi, còn đến 46 giờ, cờ thiếu dữ liệu, danh sách ca để bấm xem chi tiết. Tuần đang diễn ra chỉ tính giờ đã có đủ dấu, hiển thị giờ còn chờ và không dùng số tổng này làm kết luận tuần.
- Giao diện thêm tab `📅 Giờ tuần` cạnh Ngày/Tháng, chọn một ngày để xác định tuần, có nút tuần trước/tuần sau, mặc định tuần hiện tại. Thẻ rõ ràng `Bình thường (<40h)`, `⚠️ Từ 40h — kiểm tra lịch`, `🔴 Trên 46h — quản lý kiểm tra`, `Chưa đủ dữ liệu`; tên GV và tổng giờ nổi bật, bấm được xem ca/ngày/giờ gốc.

## Task 5 — Bot cảnh báo giờ tuần trong topic quản lý

**Files:** `Code.gs`, `test_v4_week.js`, `test_lichlam_telegram.js`, `appsscript.json` nếu thiếu scope; không đổi `BaoCao.html` nếu không cần.

- Tạo cấu hình `WEEKLY_HOURS_CHAT_ID` và `WEEKLY_HOURS_THREAD_ID` trong Script Properties; dùng token bot đang chạy nhưng **không** dùng chung địa chỉ với tin IN/OUT. Xác minh bot có trong group quản lý, được gửi vào topic chỉ định, có thể lấy chat/thread ID thực bằng một tin thử/getUpdates hoặc cơ chế xác thực tương đương; không suy ID Bot API từ URL Telegram. Có hàm test không đối số để chạy thử một tin và log kết quả; thất bại báo lỗi rõ, không lộ token.
- Nguồn giờ cảnh báo = giờ VÀO/RA hợp lệ đã ghi, tuần T2–CN; không lấy giờ lịch tương lai, không cộng giờ Exception chưa duyệt vào **giờ đã xác nhận**. Nếu cần theo dõi cả Exception, ghi riêng `X giờ Exception chờ duyệt` và chỉ dùng tổng giờ *theo dõi* có giải thích; không biến thành giờ trả lương. Chỉ kích hoạt khi **mới vượt 40:00**; cảnh báo lần hai khi **mới vượt 46:00** trong cùng tuần. Trường hợp xuất hiện ngày/ca sửa về dưới ngưỡng rồi lại vượt: không gửi trùng; người quản lý xem giờ hiện tại trong tab Tuần.
- **Không gọi gửi tin từ thao tác Xem báo cáo/refresh.** Khuyến nghị chạy sau khi một dấu RA được ghi thành công, cộng thêm trình kiểm tra định kỳ có khóa chống chạy đồng thời để bắt các sửa/chốt lại dữ liệu; cả hai dùng chung một dấu `đã gửi [mã NV, tuần bắt đầu, ngưỡng]` trong một Sheet log riêng hoặc Script Properties. Dấu chỉ lưu sau khi Telegram trả `ok:true`; lỗi gửi có thể thử lại, tránh gửi trùng khi hai người cùng chấm. Việc gửi không được làm hỏng thao tác RA nếu Telegram lỗi.
- Nội dung tin: `⚠️ GIỜ TUẦN — [Tên/Mã NV]`, tuần từ–đến, giờ thực tế đã ghi, mức >40 hay >46, giờ Exception chờ duyệt (nếu có), ca cuối/giờ RA mới nhất, nhắc quản lý kiểm tra lịch; **không có ảnh/GPS/thông tin cá nhân khác**. Không gắn suy luận phép/KPI vào tin giờ tuần.
- Test ngưỡng 40:00/40:01/46:00/46:01, hai người cùng tuần, tuần mới, lặp sự kiện, không có cấu hình, Telegram lỗi, sửa lại giờ, Exception chờ duyệt và gửi đúng topic. Kiểm tra bằng một tin thử vào topic thật trước khi bật tự động.

## Task 6 — Kiểm nghiệm và bàn giao

**Files:** tests hiện có, `README.md`, `PLAN.md`, `TASKS.md` nếu đang là tài liệu chuẩn.

- Chạy `node test_baocao_ui.js`, `node test_payroll_export.js`, `node test_payroll_v4.js`, `node test_v4_week.js`, `node test_v4_regressions.js`, `node test_v4_snapshot.js`, `node test_exception_attendance.js`, `node test_lichlam_telegram.js`, `git diff --check`; kiểm tra cú pháp `Code.gs` bằng bản sao `.js` trong thư mục scratch. Ghi kết quả thật, không chỉ khẳng định PASS.
- Dùng tháng có dữ liệu để kiểm **file Excel tải thật**: mở được `.xlsx`, đúng 3 sheet, giờ/KPI/gợi ý phép rõ nghĩa, không ghi phép đã trừ; nếu thay đổi 25 cột thì phải kiểm thử app Bảng lương nhập được phiên bản mới. Kiểm file sinh một lần không phải bấm hai lần trong trình duyệt được thử; kiểm xuất Sheet thực tạo hai sheet đích, chốt tháng không bị gọi nhầm; tab Tuần đối chiếu ca thật với từng dấu VÀO/RA. Tránh ghi đè Sheet thật khi kiểm thử xuất Sheet nếu chưa sao lưu và được phép. Xác nhận một tin Telegram thử vào topic quản lý và kiểm không gửi trùng.
- Sau khi anh duyệt plan: làm từng task, commit/push; GitHub không tự cập nhật Apps Script. Hướng dẫn dán đúng file đổi trong Apps Script, Lưu → Triển khai → Quản lý triển khai → bút chì → **Phiên bản mới** → Triển khai, rồi Ctrl+Shift+R.

## Quyết định đã chốt và thông tin Telegram cần có

- Ca có lịch bị thiếu/chưa báo phải ghi chú **KPI/phép ảnh hưởng và gợi ý X phép** để Bảng lương duyệt, không trừ tại repo chấm công. Đã chốt: T2–T6 mỗi ca thiếu = `1 phép`; T7/CN ca sáng hoặc ca chiều thiếu = `1 phép`, thiếu cả sáng và chiều = `2 phép`. Nếu không nhận diện được buổi theo giờ lịch, xuất `Cần Bảng lương duyệt — chưa xác định buổi`.
- Để kết nối topic quản lý, cách chắc nhất là anh **forward một tin bất kỳ trong đúng topic đó vào đây**. Em sẽ đọc phần thông tin Telegram kèm theo để xác định có lấy được đúng group/topic không. Nếu forward không hiện được ID, em sẽ hướng dẫn anh một lần rất ngắn: thêm @joy_chamcong_bot vào nhóm/topic (nếu chưa có), gửi một tin `test giờ tuần`, rồi em bổ sung hàm `layDiaChiNhanGioTuan()` để anh bấm Chạy trong Apps Script và gửi lại đúng dòng kết quả `Group ID | Topic ID`. Không gửi token, không chụp/copy Script Properties.
- Anh cũng xác nhận bot được phép gửi tin vào topic quản lý. Link topic **không đủ** để xác nhận quyền hoặc ID Bot API.
- Ngưỡng Telegram theo câu `>40 tiếng`: đề xuất **40:01 mới gửi**, còn màn hình đã vàng từ 40:00. Nếu anh muốn đúng 40:00 cũng gửi thì đổi cả hai thành `>=40`.
