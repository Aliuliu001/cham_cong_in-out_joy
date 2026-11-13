# Context — Chấm công IN/OUT Joy

## Trạng thái

- Repo: `Aliuliu001/cham_cong_in-out_joy`
- Branch: `main`
- Hợp đồng xuất v4: `HUONG_DAN_CHO_BOT_BANG_LUONG.md`; mẫu offline dữ liệu giả `Cham_cong_tinh_luong_11-2026_MAU_V4.xlsx`. Cần xác nhận file từ Apps Script thật trước khi Bot Bảng lương dùng tính.
- App Bảng lương là repo riêng; Check IN/OUT chỉ xuất dữ liệu một chiều.
- Plan chi tiết mới nhất: `.hermes/plans/2026-10-28_163000-cham-cong-bang-luong-plan-da-dieu-chinh.md`.

## Quyết định không được làm sai

1. Đủ IN + OUT: tính OUT − IN thực tế, trễ vẫn tính giờ; ra sớm tính đến giờ OUT.
2. Ca lịch quên IN/OUT: 4 lần miễn trừ/năm chỉ để quản lý check tay; vẫn không tự tính công vì thiếu dấu. Lần 5 trong năm vẫn không tính công + chắc chắn trừ KPI. Reset 01/01; riêng 2026 reset từ 01/11.
3. Vắng Ốm/việc gia đình hoặc PH xin nghỉ trước giờ ca: không công, không KPI, ghi Trừ phép/ghi chú. Báo sau giờ ca: KPI. Không báo: Nghỉ không báo + KPI.
4. Tuần T2–CN; >=40 giờ cảnh báo liên hệ Ms. Vân Anh, >46 giờ cảnh báo báo cáo, không chặn chấm/không tự overtime.
5. Exception: bắt buộc lý do, GPS, ảnh; đủ dấu = Chờ duyệt, không tự cộng giờ/lương. Trong tháng, Exception thiếu đầu 1–3 chờ duyệt; từ lần 4 thiếu đầu không tính giờ. Không dùng quota 4 lần của ca lịch.
6. Chốt tháng phải tạo cả CHECK IN và LICHLAM snapshot; không ghi đè im lặng.
7. Export phải chỉ đọc và nêu ngày + ca + lý do đối với KPI/phép.

## Điểm kỹ thuật cần nhớ

- CHECK IN hiện có 12 cột, cột cuối Thiết bị. Không chèn cột giữa.
- Apps Script không tự cập nhật khi push GitHub. Sau push: dán file, Lưu, Triển khai → Quản lý các lượt triển khai → Phiên bản mới → Triển khai.
- Bản export hiện tại ở `Code.gs`: `getPayrollAttendanceRows`, CSV BOM, Excel sheet `Cham cong`.
- Test hiện tại: `node test_payroll_export.js`.

## Ưu tiên khẩn: lịch làm việc ngừng gửi (13/11/2026)

- Nguồn chứng cứ: tin cuối lúc 21:10 ngày 05/11 (lịch 06/11); `sendTomorrowWorkSchedule` và `onEdit` thất bại ngày 06/11 với `ReferenceError: require is not defined` tại `generate_v4_sample:2:10` trong Apps Script project `1FUf9yVSki_-dSpM4UfBsdsBuDf2pSdaKNq66ioSYIr12BQfe_qLJolex`. Cả các `test_*.js` cũng là mã kiểm tra Node, không được đưa lên Apps Script.
- Thư mục Windows anh xác nhận: `D:\CLASP\cham_cong`, file anh bấm: `D:\CLASP\cham_cong\sync-deploy.bat`. Batch trong repo vẫn đặt `PROJECT_DIR=D:\cham_cong` (cũ), phải kiểm tra và sửa **đúng file Windows** trước khi chạy. Chưa xác minh `.clasp.json`, deployment ID hoặc file `Code.gs_add.gs` trên Apps Script. Đừng chạy batch hay xóa từng file trên Apps Script lúc này.
- Repo `cham_cong_in-out_joy` chịu trách nhiệm thông báo lịch, repo `joy_day_bu` phụ trách SOTW. Ảnh lịch ghi bot `@joy_lichlam_sotw_daybu_bot`, nhưng README lịch vẫn ghi `@joy_victini_bot`; chưa xác minh token thực tế. Topic lịch do code kiểm tra thread `50`, cần xác minh trên hệ thống thật.
- Anh Trương nói **mọi thảo luận/thay đổi SOTW về sau sẽ trao đổi trong topic Telegram hiện tại (Office joy_office, thread 3456)**. Không đồng nhất topic trao đổi này với topic bot đăng SOTW (`SOTW_3`); không đổi đích thông báo khi chưa có yêu cầu rõ.
- Kế hoạch từng bước và điều kiện hoàn thành ở `PLAN.md` mục “Sự cố gửi lịch 06–13/11/2026”; checklist ở `TASKS.md`. Commit `855b305` đã có `.claspignore` allowlist 4 tệp production, launcher trỏ `D:\CLASP\cham_cong`, chốt an toàn và `test_deploy_guard.js`. **B1 đã hoàn thành tại nguồn:** test RED thất bại vì ba lệnh `clasp deployments/push/deploy` chưa có `call`; đã tạo launcher chính `CAP_NHAT_CHAM_CONG.cmd` theo đúng kiểu Dạy Bù: tự lấy mã mới từ GitHub → kiểm deployment → đẩy Apps Script → cập nhật link web → giữ cửa sổ ở `Press any key`. Ba lệnh `clasp` đều dùng `call`; `sync-deploy.bat` cũ chỉ mở launcher `.cmd` mới để anh bấm file cũ cũng không chạy nhầm. Test nay chặn mọi lệnh triển khai thiếu `call`. Đủ 14 Node tests, kiểm cú pháp `Code.gs` và `git diff --check` đều PASS trên Ubuntu. **Chưa kiểm thật trên Windows.** Sau khi bản này lên GitHub, cần B2: tải code về Windows nhưng chạy *bản sao* có `PROJECT_DIR` sai từ CMD để chứng minh hiện `LOI:` + `Press any key` và không gọi push/deploy. Chỉ sau B2 PASS mới chạy launcher thật ở B3. Chưa cập nhật Apps Script/chưa có tin thử thành công. Các mục A→E tạm xếp sau việc cứu lịch.

## Next action

Kiểm tra phiên bản/đường dẫn thật của launcher và cấu hình `clasp` trên Windows (ảnh Notepad hoặc file nguyên bản nếu cần), trạng thái file Apps Script sau thao tác xóa trước đó, rồi triển khai Task L1–L7 trong `TASKS.md` từng mục một. Không chạy `setup()`; không in token; không đánh dấu xong trước khi kiểm được gửi tự động đêm tiếp theo.