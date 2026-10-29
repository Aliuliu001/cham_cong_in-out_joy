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

## Next action

Bắt đầu Task 1 trong `TASKS.md`: cập nhật docs và viết test RED cho helper đánh giá ca; chưa sửa logic sản xuất trước test.