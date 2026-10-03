/**
 * CHECK-IN JOY — Code.gs (backend)
 * 1 file này + Index.html + BaoCao.html + appsscript.json
 * Setup lần đầu: chạy hàm setup() 1 lần để tự tạo đủ tabs trong Sheets.
 */

var CENTER_LAT = 11.937044;
var CENTER_LNG = 108.444760;
var RADIUS_M = 100;
var DRIVE_FOLDER = 'CHECK IN - ANH NHAN VIEN';
var TZ = 'Asia/Ho_Chi_Minh';

/* ---------- Báo tin Telegram (topic Check IN/OUT) ---------- */
// Chìa khóa bot KHÔNG nằm trong code này.
// Bạn dán chìa khóa vào: Apps Script > Cài đặt dự án > Thuộc tính tập lệnh (Script Properties)
// Thêm 1 dòng: Tên = TELEGRAM_BOT_TOKEN, Giá trị = dãy chữ của bot phụ.
var TELEGRAM_CHAT_ID = '-1003955550981';
var TELEGRAM_THREAD_ID = '665'; // topic Check IN/OUT trong nhóm joy_office

function guiTinTelegram(text) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '';
    if (!token) { Logger.log('THIEU TOKEN: chua nhap TELEGRAM_BOT_TOKEN'); return 'THIEU TOKEN'; }
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      payload: { chat_id: TELEGRAM_CHAT_ID, message_thread_id: TELEGRAM_THREAD_ID, text: text },
      muteHttpExceptions: true
    });
    Logger.log('GUI TIN: ' + resp.getContentText());
    return resp.getContentText();
  } catch (e) { Logger.log('LOI GUI TIN: ' + e.message); return 'LOI: ' + e.message; }
}

function guiAnhTelegram(photoB64, caption) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '';
    if (!token) return;
    if (!photoB64) { guiTinTelegram(caption); return; }
    var blob = Utilities.newBlob(Utilities.base64Decode(photoB64), 'image/jpeg', 'checkin.jpg');
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
      method: 'post',
      payload: { chat_id: TELEGRAM_CHAT_ID, message_thread_id: TELEGRAM_THREAD_ID,
        caption: caption, photo: blob },
      muteHttpExceptions: true
    });
  } catch (e) { guiTinTelegram(caption); }
}

/* Test gửi tin: chạy hàm này 1 lần, xem Nhật ký là biết lỗi ở đâu.
   Chạy xong nhớ Triển khai > Phiên bản mới lại. */
function testGuiTin() {
  return guiTinTelegram('🤖 Test từ Apps Script: ' + new Date());
}

/* ---------- Web ---------- */

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'index';
  var out;
  if (page === 'baocao') {
    out = HtmlService.createHtmlOutputFromFile('BaoCao').setTitle('Báo cáo chấm công');
  } else {
    out = HtmlService.createHtmlOutputFromFile('Index').setTitle('Check-in Joy');
  }
  out.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return out;
}

/* ---------- Setup 1 lần ---------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTab(ss, 'CHECK IN',
    ['Mã NV', 'Họ và tên', 'Ngày', 'Ca', 'Loại IN/OUT', 'Giờ check in', 'Giờ check out', 'Trễ (phút)', 'Ghi chú', 'Link ảnh', 'Khoảng cách (m)', 'Thiết bị']);
  ensureTab(ss, 'DANHSACH', ['Mã NV', 'Họ tên', 'Vai trò (Giáo viên/Văn phòng)']);
  ensureTab(ss, 'LICHLAM', ['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc']);
  ensureTab(ss, 'BAOCAO_THANG', ['Mã NV', 'Họ tên', 'Tổng giờ', 'Giờ tăng cường', 'Số ca', 'Số lần trễ', 'Số lần quên IN', 'Số lần quên OUT', 'KPI (%)']);
  ensureTab(ss, 'GIA_LUONG', ['Loại', 'Mã', 'Giá trị', 'Ghi chú']);
  seedGiaLuong(ss); // chỉ ghi khi sheet còn trống, có dữ liệu rồi thì không đụng
  ensureTab(ss, 'LUONG_TAY', ['Tháng', 'Mã NV', 'Họ tên', 'Số lớp chính', 'Số buổi dạy (part)', 'Ngày công chuẩn', 'Phép', 'Nghỉ không lương', 'Điểm %', 'Tiền VP', 'Giờ VP', 'Ghi chú']);
  ensureTab(ss, 'LUONG_KEM', ['Tháng', 'Mã NV', 'Lớp', 'Số buổi', 'Số giờ', 'Đơn giá', 'Thành tiền', 'Ghi chú']);
  // Sheet đã có từ trước thì thêm cột mới vào cuối header nếu còn thiếu
  themCotNeuThieu(ss, 'CHECK IN', 12, 'Thiết bị');
}

function themCotNeuThieu(ss, tenSheet, cot, tieuDe) {
  var sh = ss.getSheetByName(tenSheet);
  if (!sh || sh.getLastRow() === 0) return;
  if (!String(sh.getRange(1, cot).getValue()).trim()) sh.getRange(1, cot).setValue(tieuDe);
}

function ensureTab(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); }
}

/* ---------- Bảng giá lương (ghi 1 lần, dùng cả năm) ---------- */
// Chỉ ghi khi sheet còn trống (mới có header). Đã có dữ liệu thì không đụng.
function seedGiaLuong(ss) {
  var sh = ss.getSheetByName('GIA_LUONG');
  if (!sh || sh.getLastRow() > 1) return;
  var rows = [
    ['BAC', 'HOCVIEC', 80000, 'Học việc: 80k/buổi'],
    ['BAC', '1', 100000, 'Bậc 1'],
    ['BAC', '2', 120000, 'Bậc 2'],
    ['BAC', '3', 150000, 'Bậc 3'],
    ['BAC', '4', 180000, 'Bậc 4'],
    ['BAC', '5', 200000, 'Bậc 5'],
    ['BAC', '6', 220000, 'Bậc 6'],
    ['BAC', '7', 250000, 'Bậc 7'],
    ['CHE_DO', 'NV0101', 'Fulltime', 'Tuấn Ngọc'],
    ['CHE_DO', 'NV2301', 'Fulltime', 'Uyên Vi'],
    ['CHE_DO', 'NV0204', 'Fulltime', 'Vân Anh (HCNS)'],
    ['CHE_DO', 'NV2707', 'Fulltime', 'Đức Anh'],
    ['CHE_DO', 'NV0904', 'Fulltime', 'Khánh Vân'],
    ['CHE_DO', 'NV1308', 'Fulltime', 'Hồng Anh (làm hết 10/2026)'],
    ['CHE_DO', 'NV2412', 'Part - time', 'Bảo Trâm'],
    ['CHE_DO', 'NV2503', 'Part - time', 'Hạnh Nhung'],
    ['CHE_DO', 'NV0801', 'Part - time', 'Chí Khôi'],
    ['BAC_NV', 'NV0101', 5, 'Tuấn Ngọc bậc 5'],
    ['BAC_NV', 'NV2301', 5, 'Uyên Vi bậc 5'],
    ['BAC_NV', 'NV2707', 5, 'Đức Anh bậc 5'],
    ['BAC_NV', 'NV1308', 5, 'Hồng Anh bậc 5'],
    ['BAC_NV', 'NV0904', 6, 'Khánh Vân bậc 6'],
    ['BAC_NV', 'NV2412', 3, 'Bảo Trâm bậc 3'],
    ['BAC_NV', 'NV2503', 2, 'Hạnh Nhung bậc 2'],
    ['KIEM_NHIEM', 'NV0101', 5000000, 'Tuấn Ngọc'],
    ['KIEM_NHIEM', 'NV2301', 5000000, 'Uyên Vi'],
    ['VP_GIO', 'NV2503', 42000, 'Giá giờ văn phòng của Nhung'],
    ['BHXH_MUC', 'MAC_DINH', 5100000, 'Mức đóng mặc định'],
    ['BHXH_MUC', 'NV2301', 10000000, 'Uyên Vi đóng trên 10tr'],
    ['TY_LE', 'BHXH', 0.105, 'Trừ 10.5%'],
    ['TY_LE', 'CUNG', 0.7, '70% lương cứng'],
    ['TY_LE', 'THUONG', 0.3, '30% thưởng'],
    ['MOC_THUONG', '85', 1, '>=85% hưởng 100%'],
    ['MOC_THUONG', '70', 0.75, '70-84% hưởng 75%'],
    ['MOC_THUONG', '50', 0.5, '50-69% hưởng 50%'],
    ['NGHI_TU', 'NV1308', '11/2026', 'Hồng Anh nghỉ từ tháng 11/2026'],
    ['NGAY_CHUAN', '09/2026', 26, 'Tháng 9: 26 ngày (nghỉ T3)'],
    ['NGAY_CHUAN', '10/2026', 27, 'Tháng 10: 27 ngày (4 ngày T3)']
  ];
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
}

// Đọc bảng giá về dạng object dùng chung cho tính lương.
function giaLuong() {
  var g = { bac: {}, cheDo: {}, bacNV: {}, kiemNhiem: {}, bhxhMuc: {}, mocThuong: [], ngayChuan: {} };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GIA_LUONG');
  if (!sh || sh.getLastRow() < 2) return g;
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    var loai = String(v[i][0] || '').trim(), ma = String(v[i][1] || '').trim(), val = v[i][2];
    if (!loai) continue;
    if (loai === 'BAC') g.bac[ma === 'HOCVIEC' ? 0 : Number(ma)] = Number(val);
    else if (loai === 'CHE_DO') g.cheDo[ma] = String(val);
    else if (loai === 'BAC_NV') g.bacNV[ma] = Number(val);
    else if (loai === 'KIEM_NHIEM') g.kiemNhiem[ma] = Number(val);
    else if (loai === 'VP_GIO') g.vpGio = { ma: ma, gia: Number(val) };
    else if (loai === 'BHXH_MUC') g.bhxhMuc[ma] = Number(val);
    else if (loai === 'TY_LE') g.tyLe = g.tyLe || {}, g.tyLe[ma] = Number(val);
    else if (loai === 'MOC_THUONG') g.mocThuong.push({ moc: Number(ma), tyLe: Number(val) });
    else if (loai === 'NGHI_TU') g.nghiTu = g.nghiTu || {}, g.nghiTu[ma] = String(val);
    else if (loai === 'NGAY_CHUAN') g.ngayChuan[ma] = Number(val);
  }
  g.mocThuong.sort(function (a, b) { return b.moc - a.moc; });
  return g;
}

function testGiaLuong() {
  var g = giaLuong();
  Logger.log('Bac 5 = ' + g.bac[5] + ' (ky vong 200000)');
  Logger.log('Che do NV2503 = ' + g.cheDo['NV2503'] + ' (ky vong Part - time)');
  Logger.log('Kiem nhiem NV0101 = ' + g.kiemNhiem['NV0101'] + ' (ky vong 5000000)');
  Logger.log('Ngay chuan 09/2026 = ' + g.ngayChuan['09/2026'] + ' (ky vong 26)');
}

/* ---------- Giờ server + danh sách ---------- */

function getStartTime() {
  var n = new Date();
  return { ts: n.getTime(), text: fmtDT(n) };
}

function getNhanVienList() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DANHSACH');
  if (!sh) return [];
  var v = sh.getDataRange().getDisplayValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim()) out.push({ ma: String(v[i][0]).trim(), ten: String(v[i][1] || ''), role: String(v[i][2] || 'Giáo viên') });
  }
  return out;
}

// Tìm vị trí cột LICHLAM theo tên header (chịu được thêm/xóa cột).
// Văn phòng thêm cột tính toán phía sau thì máy vẫn đọc đúng 6 cột gốc.
function cotLichLam(header) {
  var col = { ma: 0, thu: -1, ngay: 2, ca: 3, bd: 4, kt: 5 };
  for (var c = 0; c < header.length; c++) {
    var h = String(header[c] || '').toLowerCase().replace(/\s+/g, '');
    if (h.indexOf('mã') === 0 || h.indexOf('ma') === 0) col.ma = c;
    else if (h === 'thứ' || h === 'thu') col.thu = c;
    else if (h.indexOf('ngày') === 0 || h.indexOf('ngay') === 0) col.ngay = c;
    else if (h === 'ca') col.ca = c;
    else if (h.indexOf('bắtđầu') >= 0 || h.indexOf('batdau') >= 0) col.bd = c;
    else if (h.indexOf('kếtthúc') >= 0 || h.indexOf('ketthuc') >= 0) col.kt = c;
  }
  return col;
}

// Lịch của 1 nhân viên trong ngày hôm nay (theo cột Ngày T2..CN hoặc Cả ngày)
// AUDIT 03/10: đọc theo TÊN CỘT (Mã, Ngày, Ca, Giờ BD, Giờ KT), không đọc theo
// vị trí — văn phòng có thêm cột tính toán phía sau cũng không lệch.
function getLichHomNay(ma) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LICHLAM');
  if (!sh) return [];
  var thu = weekDay(new Date()); // T2..CN
  var v = sh.getDataRange().getDisplayValues();
  var out = [];
  if (v.length < 2) return out;
  var col = cotLichLam(v[0]);
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][col.ma]).trim() !== ma) continue;
    var ngayCell = col.ngay >= 0 ? String(v[i][col.ngay] || '').trim() : '';
    var caCell = col.ca >= 0 ? String(v[i][col.ca] || '') : '';
    var bd = col.bd >= 0 ? fmtTimeCell(v[i][col.bd]) : '';
    var kt = col.kt >= 0 ? fmtTimeCell(v[i][col.kt]) : '';
    if (col.thu >= 0 && !matchDay(String(v[i][col.thu] || '').trim(), thu)) continue;
    if (!matchDay(ngayCell, thu)) continue;
    out.push({ ca: caCell.trim(), bd: bd, kt: kt });
  }
  // Sắp xếp ca gần giờ hiện tại nhất lên đầu để GV chỉ cần tick ca đầu
  var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  out.forEach(function (o) {
    var m = o.bd.match(/(\d\d):(\d\d)/);
    o.gap = m ? Math.abs((Number(m[1]) * 60 + Number(m[2])) - nowMin) : 9999;
  });
  out.sort(function (a, b) { return a.gap - b.gap; });
  return out;
}

function fmtTimeCell(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'HH:mm');
  var s = String(x == null ? '' : x).trim();
  var m = s.match(/(\d{1,2})\s*:\s*(\d\d)/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  return s;
}
function cellDay(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'dd/MM/yyyy');
  return String(x || '').substring(0, 10);
}
function cellHM(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'HH:mm');
  var s = String(x || '');
  var m = s.match(/(\d\d:\d\d)/);
  return m ? m[1] : s;
}
// Giờ IN/OUT hiển thị trong báo cáo: nhận mọi kiểu Sheets trả về
// (Date, số thập phân 0.333 = 8:00, chữ "8:00") -> luôn ra "HH:mm:ss".
function fmtGioHMS(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'HH:mm:ss');
  if (typeof x === 'number' && !isNaN(x)) {
    if (x > 0 && x < 1) {
      var tot = Math.round(x * 86400);
      var hh = Math.floor(tot / 3600), mm = Math.floor((tot % 3600) / 60), ss = tot % 60;
      return ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2) + ':' + ('0' + ss).slice(-2);
    }
    return String(x);
  }
  var s = String(x == null ? '' : x).trim();
  if (!s) return '';
  if (/^\d*\.\d+$/.test(s)) {
    var n = Number(s);
    if (n > 0 && n < 1) return fmtGioHMS(n);
  }
  var m = s.match(/(\d{1,2})\s*:\s*(\d\d)(?:\s*:\s*(\d\d))?/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2] + ':' + (m[3] || '00');
  return s;
}
function cellMY(x) { // 'MM/yyyy'
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'MM/yyyy');
  return String(x || '').substring(3, 10);
}
// B4: đọc Ngày chịu được cả Date gốc lẫn chữ hiển thị.
// Dùng kèm getValues() (lấy Date gốc) thì đổi định dạng cột Ngày cũng không rớt dòng.
function ngayCuaO(cell) {
  if (cell instanceof Date && !isNaN(cell)) return Utilities.formatDate(cell, TZ, 'dd/MM/yyyy');
  return cellDay(cell);
}
function thangCuaO(cell) {
  if (cell instanceof Date && !isNaN(cell)) return Utilities.formatDate(cell, TZ, 'MM/yyyy');
  return cellMY(cell);
}
function cellDT(x) { // 'dd/MM/yyyy HH:mm:ss'
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'dd/MM/yyyy HH:mm:ss');
  return String(x || '');
}
function parseVNDate(s) {
  var m = String(s).match(/(\d\d)\/(\d\d)\/(\d{4})/);
  return m ? new Date(m[3], m[2] - 1, m[1]) : new Date();
}
function matchDay(cell, thu) {
  if (!cell) return true;
  var c = cell.toLowerCase();
  if (c === 'cả ngày' || c === 'ca ngay' || c === 'cả tuần' || c === 'ca tuan' || c === 'all') return true;
  return cell.trim() === thu;
}

function getRole(ma) {
  var list = getNhanVienList();
  for (var i = 0; i < list.length; i++) if (list[i].ma === ma) return list[i].role;
  return 'Giáo viên';
}

/* ---------- Submit check-in ---------- */

function submitCheckin(p) {
  if (!p.ma || !p.ten) return { ok: false, msg: 'Vui lòng nhập mã và họ tên.' };
  if (!p.lat || !p.lng) return { ok: false, msg: 'Không lấy được vị trí GPS.' };
  if (!p.photo) return { ok: false, msg: 'Vui lòng chụp ảnh khuôn mặt.' };
  if (!p.type || (p.type !== 'IN' && p.type !== 'OUT')) return { ok: false, msg: 'Vui lòng chọn VÀO hoặc RA.' };

  // Giờ chấm = giờ bấm nút (submitTs do web gửi), KHÔNG dùng giờ mở trang.
  // Chống gian lận mở web ở nhà rồi tới nơi mới bấm.
  var nowTs = p.submitTs || new Date().getTime();
  var gioCham = new Date(nowTs);

  var dist = haversine(p.lat, p.lng, CENTER_LAT, CENTER_LNG);
  var distM = Math.round(dist);
  if (dist > RADIUS_M) {
    return { ok: false, outOfRange: true, distance: distM,
      msg: 'Bạn đang ở ngoài khu vực check-in. Khoảng cách hiện tại: ' + distM + ' m.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CHECK IN');
  var todayStr = fmtD(gioCham);

  // CHẶN SPAM: cùng 1 người + 1 ngày + 1 ca chỉ được 1 lần (IN hoặc VẮNG)
  // Nới rộng điều kiện trong đoạn cũ — không thêm vòng lặp mới.
  if (p.type === 'IN' && !p.autoOutDone && !p.confirmed) {
    var rows = sh.getDataRange().getDisplayValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (!rows[i][0]) continue;
      var rowDay = cellDay(rows[i][2]); // Ngày
      if (String(rows[i][0]).trim() === p.ma && rowDay === todayStr) {
        // Kiểm tra xem đã có IN hoặc VẮNG cùng ca này chưa
        var existingCa = String(rows[i][3]); // Ca
        var existingType = String(rows[i][4]); // Loại (IN/OUT/VẮNG)
        if (existingCa === p.caLabel && (existingType === 'IN' || existingType === 'VẮNG')) {
          if (existingType === 'VẮNG') {
            return { ok: false, msg: '❌ Ca [' + p.caLabel + '] đã báo VẮNG rồi, không thể check-in nữa!' };
          }
          return { ok: false, msg: '❌ Bạn đã check-in ca [' + p.caLabel + '] ngày hôm nay rồi, không thể check-in lại!' };
        }
      }
      if (String(rows[i][0]).trim() === p.ma && rowDay !== todayStr) break;
    }
  }

  // Tự động OUT ca cũ nếu quên OUT (khi vào ca KHÁC)
  var note = '';
  var autoOutRow = null;
  if (p.type === 'IN' && !p.autoOutDone) {
    var rows = sh.getDataRange().getDisplayValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (!rows[i][0]) continue;
      var rowDay = cellDay(rows[i][2]); // Ngày
      if (String(rows[i][0]).trim() === p.ma && rowDay === todayStr) {
        if (rows[i][4] === 'IN') { // Loại IN
          var caCu = String(rows[i][3]); // Ca cũ
          if (caCu !== p.caLabel) { // Nếu khác ca mới thì mới hỏi auto out
            var caKtCu = caKtFromLabel(caCu);
            if (!caKtCu) caKtCu = '17:00';
            return { ok: false, needAutoOut: true, caCu: caCu, caKtCu: caKtCu,
              msg: 'Ca trước (' + caCu + ') chưa OUT. Hệ thống sẽ tự động OUT lúc ' + caKtCu };
          }
        }
        break;
      }
      if (String(rows[i][0]).trim() === p.ma && rowDay !== todayStr) break;
    }
  }
  
  // Xử lý auto OUT
  if (p.autoOutDone && p.autoOutData) {
    var a = p.autoOutData;
    var ngayStr = fmtD(gioCham);
    // Thứ tự cột mới: Mã, Tên, Ngày, Ca, Loại, Giờ in, Giờ out, Trễ, Ghi chú, Ảnh, Khoảng cách, Thiết bị
    sh.appendRow([p.ma, a.ten, ngayStr, a.ca, 'OUT', '', a.outTime, 0, '⚠️ Quên check out (Hệ thống tự OUT)', '', '', p.device || '']);
  }
  
  if (p.autoOutDone) note = 'VÀO ca mới sau khi hệ thống tự OUT ca trước';

  var lateMin = 0;
  if (p.type === 'IN' && p.caBd) {
    var chuan = chuanTime(p.caBd, nowTs);
    lateMin = Math.max(0, Math.round((nowTs - chuan) / 60000));
  }

  // 1 máy chấm cho 2 người cùng ngày = cheat: vẫn cho qua, nhưng ghi rõ vào Ghi chú.
  var canhBaoChungMay = kiemTraChungMay(p.ma, todayStr, p.device || '');

  var folder = getFolder();
  var ext = 'jpg';
  var fname = p.ma + '_' + fmtFile(gioCham) + '_' + p.type + '.' + ext;
  var blob = Utilities.newBlob(Utilities.base64Decode(p.photo), 'image/jpeg', fname);
  var file = folder.createFile(blob);

  // Thứ tự cột mới: Mã, Tên, Ngày, Ca, Loại IN/OUT, Giờ check in, Giờ check out, Trễ, Ghi chú, Link ảnh, Khoảng cách, Thiết bị
  var ngayStr = fmtD(gioCham);
  var checkInTime = p.type === 'IN' ? cellHM(gioCham) : '';
  var checkOutTime = p.type === 'OUT' ? cellHM(gioCham) : '';
  var noteFull = [note, canhBaoChungMay.ghiChu].filter(function (x) { return x; }).join(' | ');
  
  sh.appendRow([p.ma, p.ten, ngayStr, p.caLabel || '', p.type, checkInTime, checkOutTime, lateMin, noteFull, file.getUrl(), distM, p.device || '']);

  // Báo tin vào topic Check IN/OUT (kèm ảnh). Gửi lỗi cũng không chặn chấm công.
  var chu = p.type === 'IN' ? 'VÀO' : 'RA';
  var tin = '🟢 ' + cellHM(gioCham) + ' — ' + p.ten + ' (' + p.ma + ') ' + chu +
    ' ca ' + (p.caLabel || '?') +
    (p.type === 'IN' && lateMin > 0 ? ', trễ ' + lateMin + 'p' : '') +
    (p.type === 'IN' && !lateMin ? ', đúng giờ' : '');
  guiAnhTelegram(p.type === 'IN' ? p.photo : '', tin);

  return { ok: true, time: fmtDT(gioCham), distance: distM, lateMin: lateMin, type: p.type,
    canhBao: canhBaoChungMay.popup, chungMay: canhBaoChungMay.chungMay };
}

// 1 máy chấm cho 2 mã trong cùng ngày: quét các dòng IN/VẮNG hôm nay có cùng
// mã máy nhưng khác mã NV thì gắn cờ. Vẫn cho qua, chỉ ghi chú + popup.
function kiemTraChungMay(ma, todayStr, device) {
  var out = { ghiChu: '', popup: '', chungMay: false };
  if (!device) return out;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN');
  if (!sh || sh.getLastRow() < 2) return out;
  var v = sh.getDataRange().getDisplayValues();
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    if (cellDay(v[i][2]) !== todayStr) continue;
    var loai = String(v[i][4]);
    if (loai !== 'IN' && loai !== 'VẮNG') continue;
    if (String(v[i][11] || '').trim() !== device.trim()) continue;
    if (String(v[i][0]).trim() === String(ma).trim()) continue;
    var maKia = String(v[i][0]).trim() + ' ' + String(v[i][1] || '').trim();
    out.chungMay = true;
    out.ghiChu = '⚠️ 1 máy chấm cho 2 người (kia: ' + maKia + ')';
    out.popup = 'Hủm! Máy này hôm nay đã chấm cho ' + maKia + ' rồi đó. Bạn đang chấm giùm phải không? Hệ thống đã ghi lại nhé 😄';
    return out;
  }
  return out;
}

function getFolder() {
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (it.hasNext()) return it.next();
  var f = DriveApp.createFolder(DRIVE_FOLDER);
  return f;
}

/* ---------- Báo cáo ngày / tháng ---------- */

function getBaoCaoNgay(ngayStr) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN');
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getDisplayValues();
  var map = {};
  // Thứ tự cột mới: 0:Mã, 1:Tên, 2:Ngày, 3:Ca, 4:Loại, 5:Giờ in, 6:Giờ out, 7:Trễ, 8:Ghi chú, 9:Link ảnh, 10:Khoảng cách
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var day = cellDay(v[i][2]);
    if (day !== ngayStr) continue;
    var ma = String(v[i][0]).trim();
    if (!map[ma]) map[ma] = { ma: ma, ten: String(v[i][1]), logs: [] };
    // Convert mọi kiểu Sheets trả về (Date / số thập phân / chữ) thành HH:mm:ss
    var gioIn = v[i][5] ? fmtGioHMS(v[i][5]) : '';
    var gioOut = v[i][6] ? fmtGioHMS(v[i][6]) : '';
    map[ma].logs.push({ gioIn: gioIn, gioOut: gioOut, type: String(v[i][4]),
      ca: String(v[i][3]), tre: Number(v[i][7] || 0), kc: Number(v[i][10] || 0),
      anh: String(v[i][9] || ''), note: String(v[i][8] || '') });
  }
  var out = [];
  for (var k in map) {
    var r = map[k];
    r.logs.sort(function (a, b) { 
      var timeA = a.gioIn || a.gioOut;
      var timeB = b.gioIn || b.gioOut;
      return timeA < timeB ? -1 : 1; 
    });
    r.caps = r.logs.map(function(l) {
      return { 
        vao: l.gioIn, 
        ra: l.gioOut, 
        ca: l.ca, 
        tre: l.tre, 
        type: l.type,
        thieuRA: l.gioIn && !l.gioOut, 
        anh: l.anh,
        kc: l.kc,
        note: l.note
      };
    });
    r.soLanTre = r.caps.filter(function (c) { return c.tre > 0; }).length;
    r.quenRA = r.caps.filter(function (c) { return c.thieuRA; }).length;
    out.push(r);
  }
  out.sort(function (a, b) { return a.ma < b.ma ? -1 : 1; });
  return out;
}

function getChuaCham(ngayStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shL = ss.getSheetByName('LICHLAM');
  var shC = ss.getSheetByName('CHECK IN');
  if (!shL || shL.getLastRow() < 2) return [];
  var thu = weekDay(parseVNDate(ngayStr));
  var lv = shL.getDataRange().getDisplayValues();
  var colL2 = cotLichLam(lv[0]); // AUDIT 03/10: đọc theo tên cột
  var lich = {};
  for (var i = 1; i < lv.length; i++) {
    if (!lv[i][colL2.ma]) continue;
    var ma = String(lv[i][colL2.ma]).trim();
    if (colL2.thu >= 0 && !matchDay(String(lv[i][colL2.thu] || '').trim(), thu)) continue;
    var ngayCell = colL2.ngay >= 0 ? String(lv[i][colL2.ngay] || '').trim() : '';
    var caCell = colL2.ca >= 0 ? String(lv[i][colL2.ca] || '') : '';
    var bd = colL2.bd >= 0 ? fmtTimeCell(lv[i][colL2.bd]) : '';
    var kt = colL2.kt >= 0 ? fmtTimeCell(lv[i][colL2.kt]) : '';
    if (!matchDay(ngayCell, thu)) continue;
    if (!lich[ma]) lich[ma] = { ma: ma, ten: String(lv[i][1] || ''), cas: [] };
    lich[ma].cas.push({ caName: String(caCell).trim(), text: (caCell ? caCell + ' ' : '') + bd, kt: kt });
  }
  var daChamHoacVang = {};
  var caDaChamTheoNgay = {}; // ngay -> danh sách ca đã có IN/VẮNG (dạng full label)
  if (shC && shC.getLastRow() >= 2) {
    var cv = shC.getDataRange().getDisplayValues();
    // Cột: 0:Mã, 1:Tên, 2:Ngày, 3:Ca, 4:Loại
    for (var j = 1; j < cv.length; j++) {
      var day = cellDay(cv[j][2]);
      var loai = String(cv[j][4]);
      // Loại bỏ cả người đã IN và người đã báo VẮNG (khớp tên ca hoặc full label bắt đầu bằng tên ca)
      if (day === ngayStr && (loai === 'IN' || loai === 'VẮNG')) {
        daChamHoacVang[String(cv[j][0]).trim() + '_' + String(cv[j][3]).trim()] = 1;
        var k2 = String(cv[j][0]).trim() + '|' + day;
        if (!caDaChamTheoNgay[k2]) caDaChamTheoNgay[k2] = [];
        caDaChamTheoNgay[k2].push(String(cv[j][3]).trim());
      }
    }
  }
  function caDaCham(maNv, caTen) {
    var k2 = maNv + '|' + ngayStr;
    var arr = caDaChamTheoNgay[k2] || [];
    for (var q = 0; q < arr.length; q++) {
      if (arr[q] === caTen || arr[q].indexOf(caTen + ' ') === 0 || arr[q].indexOf(caTen) === 0) return true;
    }
    return daChamHoacVang[maNv + '_' + caTen] ? true : false;
  }
  var out = [];
  for (var k in lich) {
    var item = lich[k];
    var activeCas = [];
    var quaGioCas = [];
    item.cas.forEach(function(c) {
      if (!caDaCham(item.ma, c.caName)) {
        if (isQuaGioCa(ngayStr, c.kt)) quaGioCas.push(c.text);
        else activeCas.push(c.text);
      }
    });
    if (activeCas.length > 0 || quaGioCas.length > 0) {
      out.push({ ma: item.ma, ten: item.ten, cas: activeCas, casQuaGio: quaGioCas });
    }
  }
  out.sort(function (a, b) { return a.ma < b.ma ? -1 : 1; });
  return out;
}

// Ca đã hết giờ chưa? Ngày quá khứ -> true. Hôm nay -> so giờ hiện tại với giờ kết thúc ca.
function isQuaGioCa(ngayStr, kt) {
  try {
    var today = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
    if (ngayStr !== today) {
      var d1 = parseVNDate(ngayStr).getTime();
      var d0 = parseVNDate(today).getTime();
      return d1 < d0;
    }
    if (!kt) return false;
    var m = String(kt).match(/(\d\d):(\d\d)/);
    if (!m) return false;
    var now = new Date();
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]), Number(m[2]), 0);
    return now.getTime() > end.getTime();
  } catch (e) { return false; }
}

function getBaoCaoThang(ma, thangStr) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN');
  var res = { ma: ma, ten: '', thang: thangStr, tongGio: 0, gioTangCuong: 0, soCa: 0, soLanTre: 0,
    soLanQuenIN: 0, soLanQuenRA: 0, soVangCoPhep: 0, soVangKhongBao: 0, vangKhongBaoChiTiet: [], kpi: 100, chiTiet: [],
    ngayCong: 0, gioTheoTuan: {}, soNgayQuet: 0 };
  if (!sh || sh.getLastRow() < 2) return res;
  var v = sh.getDataRange().getDisplayValues();
  var vRaw = sh.getDataRange().getValues(); // B4: cột Ngày lấy Date gốc
  var rows = [];
  // Cột mới: 0:Mã, 1:Tên, 2:Ngày, 3:Ca, 4:Loại, 5:Giờ in, 6:Giờ out, 7:Trễ, 8:Ghi chú
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    if (String(v[i][0]).trim() !== ma) continue;
    var day = ngayCuaO(vRaw[i][2]);
    var month = thangCuaO(vRaw[i][2]);
    if (month !== thangStr) continue;
    var gio = v[i][5] || v[i][6];
    rows.push({ ngay: day, gio: String(gio), type: String(v[i][4]), ca: String(v[i][3]),
      bd: caBdFromLabel(String(v[i][3])), kt: caKtFromLabel(String(v[i][3])), tre: Number(v[i][7] || 0), note: String(v[i][8] || '') });
  }
  var byDay = {};
  rows.forEach(function (r) {
    var d = r.ngay;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  });
  
  // Theo dõi các ca đã tính trễ trong ngày để tránh tính trùng khi nhân viên check-in nhiều lần cùng 1 ca
  for (var d in byDay) {
    var day = byDay[d], openIn = null;
    var caDaTinhTre = {}; // Lưu danh sách ca đã tính trễ trong ngày này
    
    day.forEach(function (r) {
      if (r.type === 'IN') {
        if (openIn) { res.soLanQuenRA++; }
        openIn = r;
        res.soCa++;
        
        // CHỈ TÍNH TRỄ 1 LẦN DUY NHẤT CHO MỖI CA TRONG 1 NGÀY (lấy lần IN đầu tiên của ca đó)
        var caName = r.ca || 'Ca chung';
        if (r.tre > 0 && !caDaTinhTre[caName]) {
          res.soLanTre++;
          caDaTinhTre[caName] = true;
        }
      } else if (r.type === 'VẮNG') {
        // Vắng có phép: 0 giờ, không tính ca làm, nhưng VẮNG bấm muộn vẫn tính trễ như đi trễ.
        res.soVangCoPhep++;
        var caV = r.ca || 'Ca chung';
        if (r.tre > 0 && !caDaTinhTre[caV]) {
          res.soLanTre++;
          caDaTinhTre[caV] = true;
        }
      } else if (r.type === 'OUT' && openIn) {
        var h = gioLam(openIn, r, d);
        res.tongGio += h;
        res.chiTiet.push({ ngay: d, ca: openIn.ca, gio: h });
        openIn = null;
      } else if (r.type === 'OUT' && !openIn) {
        // B7: tin RA mà trước đó không có giờ VÀO -> tính là quên giờ VÀO
        res.soLanQuenIN++;
      }
    });
    if (openIn) res.soLanQuenRA++;
  }
  // AUDIT 03/10: tổng kết ngày công + giờ theo tuần (để so với văn phòng chấm tay).
  // Đếm ngày công = số ngày khác nhau có IN/VẮNG; giờ tuần gom theo tuần T2-CN.
  var ngayCoMat = {};
  rows.forEach(function (r) {
    if (r.type === 'IN' || r.type === 'VẮNG') ngayCoMat[r.ngay] = true;
  });
  res.ngayCong = Object.keys(ngayCoMat).length;
  res.soNgayQuet = rows.length;
  res.chiTiet.forEach(function (c) {
    var w = tuanCuaNgay(c.ngay);
    res.gioTheoTuan[w] = Math.round(((res.gioTheoTuan[w] || 0) + c.gio) * 100) / 100;
  });
  // VẮNG KHÔNG BÁO: so lịch (LICHLAM) với thực tế — ca nào trong lịch mà
  // không có dòng IN/VẮNG trong CHECK IN thì tính như 1 lần trễ để trừ KPI,
  // chỉ hiện trong báo cáo tháng + Lỗi tháng, KHÔNG ghi thêm dòng vào Sheet.
  tinhVangKhongBao(ma, thangStr, res);
  res.tongGio = Math.round(res.tongGio * 100) / 100;
  
  // KPI mới tính trên số lần CHECK IN trễ (mỗi ca tối đa 1 lần trễ/ngày): 0 lần=100%, 1=80%, 2-3=60%, 4=40%, ≥5=0%
  if (res.soLanTre === 0) res.kpi = 100;
  else if (res.soLanTre === 1) res.kpi = 80;
  else if (res.soLanTre <= 3) res.kpi = 60;
  else if (res.soLanTre === 4) res.kpi = 40;
  else res.kpi = 0;
  return res;
}

// So LICHLAM với CHECK IN: ca nào có lịch mà không có IN/VẮNG => vắng không báo.
// Tính như 1 lần trễ để trừ KPI. Chỉ hiện trên báo cáo + Lỗi tháng, không ghi thêm dòng.
function tinhVangKhongBao(ma, thangStr, res) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shL = ss.getSheetByName('LICHLAM');
  var shC = ss.getSheetByName('CHECK IN');
  if (!shL || shL.getLastRow() < 2 || !shC || shC.getLastRow() < 2) return;
  var p = String(thangStr).split('/');
  if (p.length !== 2) return;
  var mm = Number(p[0]), yyyy = Number(p[1]);
  var daysInMonth = new Date(yyyy, mm, 0).getDate();
  // Gom lịch theo thứ trong tuần: ma|thu -> [{ca, bd, kt}]
  // AUDIT 03/10: đọc theo TÊN CỘT (chịu được cột tính toán thêm phía sau LICHLAM).
  var lv = shL.getDataRange().getDisplayValues();
  var colL = cotLichLam(lv[0]);
  var lichTuan = {};
  for (var i = 1; i < lv.length; i++) {
    if (String(lv[i][colL.ma]).trim() !== ma) continue;
    var thuCell = colL.thu >= 0 ? String(lv[i][colL.thu] || '').trim() : '';
    var ngayCell = colL.ngay >= 0 ? String(lv[i][colL.ngay] || '').trim() : '';
    var caCell = colL.ca >= 0 ? String(lv[i][colL.ca] || '') : '';
    var bd = colL.bd >= 0 ? fmtTimeCell(lv[i][colL.bd]) : '';
    var kt = colL.kt >= 0 ? fmtTimeCell(lv[i][colL.kt]) : '';
    var thus = [];
    if (thuCell) { thus = [thuCell]; }
    else { thus = ['T2','T3','T4','T5','T6','T7','CN']; }
    thus.forEach(function (t) {
      var key = t;
      if (!lichTuan[key]) lichTuan[key] = [];
      lichTuan[key].push({ ca: String(caCell).trim(), ngayCell: ngayCell, bd: bd, kt: kt });
    });
    if (thuCell) continue;
  }
  // Gom các dòng IN/VẮNG đã có: ngay -> [ca...]
  var cv = shC.getDataRange().getDisplayValues();
  var daCo = {};
  for (var j = 1; j < cv.length; j++) {
    if (!cv[j][0] || String(cv[j][0]).trim() !== ma) continue;
    if (cellMY(cv[j][2]) !== thangStr) continue;
    var loai = String(cv[j][4]);
    if (loai !== 'IN' && loai !== 'VẮNG') continue;
    var k = cellDay(cv[j][2]);
    if (!daCo[k]) daCo[k] = [];
    daCo[k].push(String(cv[j][3]).trim());
  }
  var homNay = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
  var homNayTs = parseVNDate(homNay).getTime();
  for (var dd = 1; dd <= daysInMonth; dd++) {
    var dt = new Date(yyyy, mm - 1, dd);
    // Bỏ ngày tương lai
    if (dt.getTime() > homNayTs) break;
    var thu = weekDay(dt);
    var arr = lichTuan[thu] || [];
    if (!arr.length) continue;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var ngayStr = pad(dd) + '/' + pad(mm) + '/' + yyyy;
    arr.forEach(function (c) {
      if (!matchDay(c.ngayCell, thu)) return;
      var co = daCo[ngayStr] || [];
      var found = false;
      for (var q = 0; q < co.length; q++) {
        if (co[q] === c.ca || co[q].indexOf(c.ca + ' ') === 0 || co[q].indexOf(c.ca) === 0) { found = true; break; }
      }
      if (!found) {
        res.soVangKhongBao++;
        res.soLanTre++; // tính như 1 lần trễ
        res.soLanQuenIN++;
        res.vangKhongBaoChiTiet.push({ ngay: ngayStr, ca: c.ca });
      }
    });
  }
}

function getBaoCaoThangTatCa(thangStr) {
  var list = getNhanVienList();
  var out = [];
  list.forEach(function (n) {
    var r = getBaoCaoThang(n.ma, thangStr);
    r.ten = n.ten; // Fix undefined
    out.push(r);
  });
  out.sort(function (a, b) { return a.ma < b.ma ? -1 : 1; });
  return out;
}

/* ---------- Tính lương tháng ---------- */
// Đọc 1 dòng LƯƠNG TAY theo mã + tháng. Thiếu thì trả object 0.
function docLuongTay(ma, thangStr) {
  var tay = { soLop: 0, soBuoi: 0, chuan: 0, phep: 0, nghiKL: 0, diem: 0, tienVP: 0, gioVP: 0 };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LUONG_TAY');
  if (!sh || sh.getLastRow() < 2) return tay;
  var v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0] || '').trim() !== thangStr) continue;
    if (String(v[i][1] || '').trim() !== ma) continue;
    tay.soLop = Number(v[i][3] || 0);
    tay.soBuoi = Number(v[i][4] || 0);
    tay.chuan = Number(v[i][5] || 0);
    tay.phep = Number(v[i][6] || 0);
    tay.nghiKL = Number(v[i][7] || 0);
    tay.diem = Number(v[i][8] || 0);
    tay.tienVP = Number(v[i][9] || 0);
    tay.gioVP = Number(v[i][10] || 0);
    break;
  }
  return tay;
}

// Cộng tiền dạy kèm trong sheet LƯƠNG KEM theo mã + tháng.
// Thành tiền trống thì = Số buổi x Đơn giá; có số thì lấy số bạn gõ.
function tongLuongKem(ma, thangStr) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LUONG_KEM');
  if (!sh || sh.getLastRow() < 2) return 0;
  var v = sh.getDataRange().getValues();
  var tong = 0;
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0] || '').trim() !== thangStr) continue;
    if (String(v[i][1] || '').trim() !== ma) continue;
    var thanhTien = Number(v[i][6] || 0);
    if (!thanhTien) thanhTien = Number(v[i][3] || 0) * Number(v[i][5] || 0);
    tong += thanhTien;
  }
  return Math.round(tong);
}

// Tính lương 1 người trong 1 tháng.
function getLuong1Nguoi(ma, thangStr) {
  var g = giaLuong();
  var bc = getBaoCaoThang(ma, thangStr);
  var tay = docLuongTay(ma, thangStr);
  var tyLeCung = (g.tyLe && g.tyLe['CUNG']) || 0.7;
  var tyLeThuong = (g.tyLe && g.tyLe['THUONG']) || 0.3;
  var tyLeBH = (g.tyLe && g.tyLe['BHXH']) || 0.105;
  var cheDo = g.cheDo[ma] || 'Fulltime';
  var giaBuoi = g.bac[g.bacNV[ma]] || 0;
  var tienLop = (cheDo === 'Fulltime')
    ? giaBuoi * 8 * (tay.soLop || 0)
    : giaBuoi * (tay.soBuoi || 0);
  var luongCung = tienLop * tyLeCung;
  var mauSo = tay.chuan || g.ngayChuan[thangStr] || 26;
  var ngayThuc = (bc.ngayCong || 0) + (tay.phep || 0);
  var luongThang = mauSo ? (luongCung / mauSo * ngayThuc) : 0;
  // AUDIT 03/10: part-time KHÔNG chấm theo ngày công — tiền lớp đã đếm buổi
  // thật nên lương tháng lấy thẳng 70%, không chia theo ngày (kẻo phạt 2 lần).
  if (cheDo !== 'Fulltime') luongThang = tienLop * tyLeCung;
  var tienKem = tongLuongKem(ma, thangStr);
  var kiemNhiem = g.kiemNhiem[ma] || 0;
  // Trường hợp riêng Hạnh Nhung
  if (ma === 'NV2503' && thangStr === '09/2026' && !tay.tienVP) {
    var giaVP = (g.vpGio && g.vpGio.gia) || 42000;
    kiemNhiem = (tay.soBuoi || 0) * 120000 + (tay.gioVP || 0) * giaVP; // kỳ vọng 387k
  } else if (ma === 'NV2503' && (tay.tienVP || 0)) {
    kiemNhiem = tay.tienVP; // tháng 10 trở đi: 2.35tr + lớp tính ở tienLop
  }
  // Thưởng theo mốc điểm (điểm nhập 0-1 hoặc 0-100 đều được)
  // AUDIT 03/10: điểm 0 = chưa nhập -> KHÔNG thưởng (không phải 0% thật).
  // Muốn cho 0% thật thì nhập 0.001 hoặc ghi chú riêng.
  var mucThuong = tienLop * tyLeThuong;
  var tienThuong = 0;
  if ((tay.diem || 0) > 0) {
    var diem100 = tay.diem <= 1 ? tay.diem * 100 : tay.diem;
    var mocs = g.mocThuong.length ? g.mocThuong : [{ moc: 85, tyLe: 1 }, { moc: 70, tyLe: 0.75 }, { moc: 50, tyLe: 0.5 }];
    var tyLe = 0;
    for (var i = 0; i < mocs.length; i++) { if (diem100 >= mocs[i].moc) { tyLe = mocs[i].tyLe; break; } }
    tienThuong = mucThuong * tyLe;
  }
  var tong = luongThang + kiemNhiem + tienKem + tienThuong;
  var mucBH = g.bhxhMuc[ma] || g.bhxhMuc['MAC_DINH'] || 5100000;
  var truBH = Math.round(mucBH * tyLeBH);
  return { ma: ma, cheDo: cheDo, tienLop: Math.round(tienLop), luongThang: Math.round(luongThang),
    kiemNhiem: Math.round(kiemNhiem), tienKem: Math.round(tienKem),
    tienThuong: Math.round(tienThuong), tong: Math.round(tong),
    truBH: truBH, thucNhan: Math.round(tong - truBH),
    ngayCong: bc.ngayCong || 0, tongGio: bc.tongGio || 0, diem: tay.diem || 0 };
}

// Cả bảng lương 1 tháng (bỏ người đã nghỉ). Kèm giờ tuần để so với văn phòng.
function getBangLuongTatCa(thangStr) {
  var g = giaLuong();
  var list = getNhanVienList();
  var out = [];
  list.forEach(function (n) {
    if (g.nghiTu && g.nghiTu[n.ma] && thangSoSanh(thangStr) >= thangSoSanh(g.nghiTu[n.ma])) return;
    var r = getLuong1Nguoi(n.ma, thangStr);
    r.ten = n.ten;
    var bc = getBaoCaoThang(n.ma, thangStr);
    r.gioTheoTuan = bc.gioTheoTuan || {};
    out.push(r);
  });
  out.sort(function (a, b) { return a.ma < b.ma ? -1 : 1; });
  return out;
}

// 'MM/yyyy' -> số để so sánh tháng (VD 09/2026 -> 202609)
function thangSoSanh(t) {
  var p = String(t || '').split('/');
  if (p.length !== 2) return 0;
  return Number(p[1]) * 100 + Number(p[0]);
}

function testLuongT9() {
  // Kỳ vọng Nhung tháng 9: kiemNhiem = 387000 (2x120k + 3.5x42k) — cần có dòng LUONG_TAY 09/2026
  var g = giaLuong();
  Logger.log('Bac 5 = ' + g.bac[5] + ' (ky vong 200000)');
  var r = getLuong1Nguoi('NV0101', '09/2026');
  Logger.log('Ngoc 5 lop: tienLop = ' + r.tienLop + ' (ky vong 8000000 neu soLop=5)');
}

// Tuần của 1 ngày dd/MM/yyyy -> 'Tuan dd/MM-dd/MM' (T2-CN chứa ngày đó).
function tuanCuaNgay(ngayStr) {
  var m = String(ngayStr || '').match(/(\d\d)\/(\d\d)\/(\d{4})/);
  if (!m) return ngayStr;
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  var dow = (d.getDay() + 6) % 7; // T2=0..CN=6
  var t2 = new Date(d); t2.setDate(d.getDate() - dow);
  var cn = new Date(t2); cn.setDate(t2.getDate() + 6);
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return 'Tuần ' + p(t2.getDate()) + '/' + p(t2.getMonth() + 1) +
    '-' + p(cn.getDate()) + '/' + p(cn.getMonth() + 1);
}

function testTuanCuaNgay() {
  Logger.log(tuanCuaNgay('03/10/2026') + ' (ky vong Tuan 29/09-05/10)');
  Logger.log(tuanCuaNgay('30/09/2026') + ' (ky vong Tuan 28/09-04/10)');
}

function testCotLichLam() {
  var c1 = cotLichLam(['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc']);
  Logger.log('6 cot chuan: ' + JSON.stringify(c1));
  var c2 = cotLichLam(['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc', 'Giờ out - Giờ in', 'Tổng giờ tuần']);
  Logger.log('8 cot (them 2 cot tinh): ngay=' + c2.ngay + ' ca=' + c2.ca + ' bd=' + c2.bd + ' kt=' + c2.kt + ' (ky vong 2,3,4,5)');
}

function gioLam(inR, outR, ngayStr) {
  if (!inR.bd || !inR.kt) return 0;
  var bdTs = parseVN(ngayStr + ' ' + inR.bd);
  var ktTs = parseVN(ngayStr + ' ' + inR.kt);
  var outTs = parseVN(ngayStr + ' ' + outR.gio);
  if (!bdTs || !ktTs || !outTs) return 0;
  var end = Math.min(outTs, ktTs);
  return Math.max(0, (end - bdTs) / 3600000);
}

function testGioLam() {
  var h = gioLam({ bd: '08:00', kt: '11:00' }, { gio: '11:00' }, '01/10/2026');
  Logger.log('gioLam = ' + h + ' (ky vong 3)');
  var h2 = gioLam({ bd: '08:00', kt: '11:00' }, { gio: '10:00' }, '01/10/2026');
  Logger.log('gioLam som = ' + h2 + ' (ky vong 2)');
}

/* ---------- Helpers ---------- */

function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371000, d = Math.PI / 180;
  var a = Math.sin((lat2 - lat1) * d / 2) * Math.sin((lat2 - lat1) * d / 2) +
    Math.cos(lat1 * d) * Math.cos(lat2 * d) *
    Math.sin((lon2 - lon1) * d / 2) * Math.sin((lon2 - lon1) * d / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDT(dt) { return Utilities.formatDate(dt, TZ, 'dd/MM/yyyy HH:mm:ss'); }
function fmtD(dt) { return Utilities.formatDate(dt, TZ, 'dd/MM/yyyy'); }
function fmtFile(dt) { return Utilities.formatDate(dt, TZ, 'yyyyMMdd_HHmmss'); }

function weekDay(dt) {
  var map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return map[dt.getDay()];
}

function chuanTime(caBd, openTs) {
  // Trễ = giờ check-in trừ thẳng giờ bắt đầu ca trong LICHLAM.
  // Không trừ sớm 15'/30' — user tự set giờ ca thủ công trong LICHLAM.
  var d = new Date(openTs);
  var parts = String(caBd).split(':');
  d.setHours(Number(parts[0]), Number(parts[1] || 0), 0, 0);
  return d.getTime();
}

function parseVN(s) {
  var m = s.match(/(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d)/);
  if (!m) return 0;
  return new Date(m[3], m[2] - 1, m[1], m[4], m[5]).getTime();
}

function caBdFromLabel(label) { var m = label.match(/(\d\d:\d\d)\s*[-–]/); return m ? m[1] : ''; }
function caKtFromLabel(label) { var m = label.match(/[-–]\s*(\d\d:\d\d)/); return m ? m[1] : ''; }

/* ---------- Xuất báo cáo ra Sheet & Backup tự động ---------- */

function xuatBaoCaoSheet(thangStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var list = getNhanVienList();
  
  // 1. Tạo sheet BAOCAO_THANG - MM/YYYY
  var sheetName = 'BAOCAO_THANG - ' + thangStr;
  var sh = ss.getSheetByName(sheetName);
  if (!sh) { sh = ss.insertSheet(sheetName); }
  else { sh.clear(); }
  
  sh.appendRow(['BẢNG TỔNG HỢP CHẤM CÔNG THÁNG ' + thangStr]);
  sh.appendRow(['Mã NV', 'Họ và tên', 'Tổng giờ', 'Giờ tăng cường', 'Số ca', 'Số lần trễ', 'Số lần quên IN', 'Số lần quên OUT', 'Vắng có phép', 'Vắng không báo', 'KPI (%)']);
  
  var summaryRows = [];
  list.forEach(function (n) {
    var r = getBaoCaoThang(n.ma, thangStr);
    summaryRows.push([r.ma, n.ten, r.tongGio, r.gioTangCuong, r.soCa, r.soLanTre, r.soLanQuenIN, r.soLanQuenRA, r.soVangCoPhep, r.soVangKhongBao, r.kpi]);
  });
  if (summaryRows.length > 0) {
    sh.getRange(3, 1, summaryRows.length, summaryRows[0].length).setValues(summaryRows);
  }
  sh.setFrozenRows(2);
  
  // 2. Tạo sheet Quên check / Lỗi tháng
  var errSheetName = 'Lỗi tháng ' + thangStr;
  var shErr = ss.getSheetByName(errSheetName);
  if (!shErr) { shErr = ss.insertSheet(errSheetName); }
  else { shErr.clear(); }
  
  shErr.appendRow(['DANH SÁCH LỖI / QUÊN CHECK - THÁNG ' + thangStr]);
  shErr.appendRow(['Ngày', 'Mã NV', 'Họ và tên', 'Ca', 'Loại lỗi', 'Phút trễ', 'Ghi chú']);
  
  // Lấy dữ liệu CHECK IN trong tháng
  var shCheck = ss.getSheetByName('CHECK IN');
  var errRows = [];
  if (shCheck && shCheck.getLastRow() >= 2) {
    var v = shCheck.getDataRange().getDisplayValues();
    var vN = shCheck.getDataRange().getValues(); // B4: cột Ngày lấy Date gốc
    for (var i = 1; i < v.length; i++) {
      if (!v[i][0]) continue;
      var ngay = ngayCuaO(vN[i][2]);
      var month = thangCuaO(vN[i][2]);
      if (month !== thangStr) continue;

      var ma = String(v[i][0]);
      var ten = String(v[i][1]);
      var ca = String(v[i][3]);
      var loai = String(v[i][4]);
      var tre = Number(v[i][7] || 0);
      var note = String(v[i][8]);

      // Kiểm tra lỗi:
      // 1. Trễ IN (>0 phút)
      if (loai === 'IN' && tre > 0) {
        errRows.push([ngay, ma, ten, ca, 'Đi làm trễ', tre + 'p', note]);
      }
      // 1b. VẮNG bấm muộn (>0 phút) — trừ KPI như đi trễ
      if (loai === 'VẮNG' && tre > 0) {
        errRows.push([ngay, ma, ten, ca, 'Đi làm trễ (báo vắng muộn)', tre + 'p', note]);
      }
      // B6: VẮNG đúng giờ chỉ nằm ở bảng tổng hợp, KHÔNG ghi vào bảng lỗi.
      // 2. Quên OUT / Hệ thống tự OUT
      if (note.indexOf('Quên check out') !== -1 || note.indexOf('tự OUT') !== -1) {
        errRows.push([ngay, ma, ten, ca, 'Quên check out', '', note]);
      }
      // 2b. 1 máy chấm cho 2 người cùng ngày
      if (note.indexOf('1 máy chấm cho 2 người') !== -1) {
        errRows.push([ngay, ma, ten, ca, '1 máy – 2 người', '', note]);
      }
      // B7: tin RA mà không có giờ VÀO trước đó (tìm trong cùng ngày + ca)
      if (loai === 'OUT') {
        var coIn = false;
        for (var k = 1; k < v.length; k++) {
          if (k !== i && v[k][0] && String(v[k][0]).trim() === ma.trim() &&
              ngayCuaO(vN[k][2]) === ngay && String(v[k][3]) === ca && String(v[k][4]) === 'IN') {
            coIn = true; break;
          }
        }
        if (!coIn) errRows.push([ngay, ma, ten, ca, 'Quên check in (RA không có VÀO)', '', note]);
      }
    }
  }
  // 3. VẮNG KHÔNG BÁO: ca có lịch mà không có IN/VẮNG — tính như 1 lần trễ
  var baoThang = {};
  list.forEach(function (n) { baoThang[n.ma] = getBaoCaoThang(n.ma, thangStr); });
  list.forEach(function (n) {
    var r = baoThang[n.ma];
    (r.vangKhongBaoChiTiet || []).forEach(function (x) {
      errRows.push([x.ngay, n.ma, n.ten, x.ca, 'Vắng không báo', '', '']);
    });
  });
  // B6: xếp bảng lỗi theo ngày cho dễ đọc
  errRows.sort(function (a, b) {
    var pa = String(a[0]).split('/'), pb = String(b[0]).split('/');
    var ta = new Date(pa[2], pa[1] - 1, pa[0]).getTime();
    var tb = new Date(pb[2], pb[1] - 1, pb[0]).getTime();
    return ta - tb;
  });
  if (errRows.length > 0) {
    shErr.getRange(3, 1, errRows.length, errRows[0].length).setValues(errRows);
  }
  shErr.setFrozenRows(2);
  
  return { ok: true, msg: 'Đã xuất thành công 2 sheet: ' + sheetName + ' và ' + errSheetName };
}

// Hàm chạy tự động ngày 1 hàng tháng (+ tự chạy bù ngày 2-5 nếu trượt ngày 1)
function autoBackupThangTruoc() {
  var d = new Date();
  if (d.getDate() === 1) {
    var prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    backupMotThang(prev);
    return;
  }
  // B3: ngày 2-5: kiểm tra 3 tháng gần nhất, tháng nào còn sót (CHECK IN còn
  // dữ liệu mà chưa có sheet backup) thì chốt bù.
  if (d.getDate() >= 2 && d.getDate() <= 5) {
    backupBuThangSot();
  }
}

// Quét 3 tháng gần nhất, chốt bù tháng còn sót.
function backupBuThangSot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shCheck = ss.getSheetByName('CHECK IN');
  if (!shCheck || shCheck.getLastRow() < 2) return;
  var v = shCheck.getDataRange().getDisplayValues();
  var thangConSot = {};
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var m = cellMY(v[i][2]); // MM/yyyy
    if (/^\d\d\/\d{4}$/.test(m)) thangConSot[m] = true;
  }
  var homNayMM = Utilities.formatDate(new Date(), TZ, 'MM/yyyy');
  Object.keys(thangConSot).forEach(function (thangStr) {
    if (thangStr === homNayMM) return; // tháng hiện tại chưa chốt
    var p = thangStr.split('/');
    var prev = new Date(Number(p[1]), Number(p[0]) - 1, 1);
    var thangFile = Utilities.formatDate(prev, TZ, 'MM-yyyy');
    if (!ss.getSheetByName('CHECK IN - Tháng ' + thangFile)) {
      Logger.log('Chay bu thang sot: ' + thangStr);
      backupMotThang(prev);
    }
  });
}

// Chốt 1 tháng: copy CHECK IN -> xuất báo cáo -> xóa dữ liệu.
// Có cờ bảo vệ: tháng nào đã chốt rồi thì thoát ngay, không làm lại.
function backupMotThang(prev) {
    var thangStr = Utilities.formatDate(prev, TZ, 'MM/yyyy');
    var thangFile = Utilities.formatDate(prev, TZ, 'MM-yyyy');

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // B2: đã có sheet backup tháng này = đã chốt rồi -> thoát ngay.
    if (ss.getSheetByName('CHECK IN - Tháng ' + thangFile)) {
      Logger.log('Da chot thang ' + thangStr + ' roi, bo qua.');
      return { ok: false, msg: 'Đã chốt tháng ' + thangStr + ' rồi, bỏ qua.' };
    }
    
    // 1. Duplicate sheet CHECK IN
    var shCheck = ss.getSheetByName('CHECK IN');
    if (shCheck) {
      var newCheckName = 'CHECK IN - Tháng ' + thangFile;
      var existing = ss.getSheetByName(newCheckName);
      if (!existing) {
        var copy = shCheck.copyTo(ss);
        copy.setName(newCheckName);
      }
    }
    
    // 2. Xuất báo cáo tháng trước
    xuatBaoCaoSheet(thangStr);

    // 3. Xóa dữ liệu cũ trong sheet CHECK IN (giữ lại header)
    if (shCheck && shCheck.getLastRow() > 1) {
      shCheck.getRange(2, 1, shCheck.getLastRow() - 1, shCheck.getLastColumn()).clearContent();
    }

    // B6b: báo tin vào topic Check IN/OUT khi chốt tháng xong
    Logger.log('Da chot thang ' + thangStr + ' xong.');
    guiTinTelegram('📦 Đã chốt tháng ' + thangStr + ' xong (lưu bản copy + xuất báo cáo).');
    return { ok: true, msg: 'Đã chốt tháng ' + thangStr + ' xong.' };
}

// Đăng ký trigger chạy lúc 00:30 hàng ngày
function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoBackupThangTruoc') {
      exists = true;
      break;
    }
  }
  if (!exists) {
    ScriptApp.newTrigger('autoBackupThangTruoc')
      .timeBased()
      .everyDays(1)
      .atHour(0)
      .create();
  }
}

/* ---------- Báo vắng từ xa & Ra đột xuất ---------- */

function submitBaoVang(p) {
  if (!p.ma || !p.ten) return { ok: false, msg: 'Vui lòng chọn mã và tên nhân viên.' };
  if (!p.caLabel) return { ok: false, msg: 'Vui lòng chọn ca cần báo vắng.' };

  // Giờ báo = giờ bấm nút VẮNG, giống check-in (không dùng giờ mở trang).
  var nowTs = p.submitTs || p.openTs || new Date().getTime();
  var gioBao = new Date(nowTs);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CHECK IN');
  if (!sh) return { ok: false, msg: 'Sheet CHECK IN không tồn tại. Vui lòng chạy setup() trước.' };

  var ngayStr = fmtD(gioBao);

  // CHẶN TRÙNG: tái dùng đúng luật của check-in — 1 người + 1 ngày + 1 ca chỉ 1 dòng.
  // Nếu đã có IN hoặc VẮNG cùng ca thì từ chối, không ghi thêm.
  var cv = sh.getDataRange().getDisplayValues();
  for (var i = cv.length - 1; i >= 1; i--) {
    if (!cv[i][0]) continue;
    if (String(cv[i][0]).trim() === String(p.ma).trim() && cellDay(cv[i][2]) === ngayStr
        && String(cv[i][3]) === String(p.caLabel)) {
      var t = String(cv[i][4]);
      if (t === 'VẮNG') return { ok: false, msg: '❌ Ca [' + p.caLabel + '] đã báo vắng rồi, không thể báo lại!' };
      if (t === 'IN') return { ok: false, msg: '❌ Ca [' + p.caLabel + '] đã check-in rồi, không thể báo vắng nữa!' };
    }
    if (String(cv[i][0]).trim() === String(p.ma).trim() && cellDay(cv[i][2]) !== ngayStr) break;
  }

  // VẮNG bấm ở nhà được (không kiểm tra GPS/ảnh) nhưng giờ bấm vẫn so với giờ ca:
  // đúng giờ/sớm = trễ 0, muộn = ghi số phút trễ như check-in thường.
  var treVang = 0;
  if (p.caBd) {
    var chuan = chuanTime(p.caBd, nowTs);
    treVang = Math.max(0, Math.round((nowTs - chuan) / 60000));
  }

  var ghiChu = (p.lyDo || 'Phụ huynh xin nghỉ') + ' (Báo vắng từ xa: ' + fmtDT(gioBao) + ')';

  // Thứ tự cột: Mã, Tên, Ngày, Ca, Loại, Giờ in, Giờ out, Trễ, Ghi chú, Ảnh, Khoảng cách
  sh.appendRow([p.ma, p.ten, ngayStr, p.caLabel, 'VẮNG', '', '', treVang, ghiChu, '', '']);

  // Báo tin VẮNG vào topic Check IN/OUT (không có ảnh vì bấm ở nhà).
  guiTinTelegram('🟡 ' + cellHM(gioBao) + ' — ' + p.ten + ' (' + p.ma + ') VẮNG ca ' +
    p.caLabel + ' (' + (p.lyDo || 'Phụ huynh xin nghỉ') + ')' +
    (treVang > 0 ? ', báo trễ ' + treVang + 'p' : ''));

  var msg = 'Đã ghi nhận báo vắng ca [' + p.caLabel + '] thành công!';
  if (treVang > 0) msg += ' (Báo trễ ' + treVang + ' phút)';
  return { ok: true, msg: msg, lateMin: treVang };
}
