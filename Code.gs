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
    ['Mã NV', 'Họ tên', 'Giờ mở trang', 'Vĩ độ', 'Kinh độ', 'Link ảnh',
     'Khoảng cách (m)', 'Giờ bấm nút', 'Loại IN/OUT', 'Ca', 'Trễ (phút)', 'Ghi chú']);
  ensureTab(ss, 'DANHSACH', ['Mã NV', 'Họ tên', 'Vai trò (Giáo viên/Văn phòng)']);
  ensureTab(ss, 'LICHLAM', ['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc']);
}

function ensureTab(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); }
}

/* ---------- Giờ server + danh sách ---------- */

function getStartTime() {
  var n = new Date();
  return { ts: n.getTime(), text: fmtDT(n) };
}

function getNhanVienList() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DANHSACH');
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i][0]) out.push({ ma: String(v[i][0]).trim(), ten: String(v[i][1] || ''), role: String(v[i][2] || 'Giáo viên') });
  }
  return out;
}

// Lịch của 1 nhân viên trong ngày hôm nay (theo cột Ngày T2..CN hoặc Cả ngày)
// Sheet chuẩn 6 cột: A Mã, B Tên, C Ngày, D Ca, E GiờBD, F GiờKT
// Tương thích ngược sheet 7 cột cũ (có thêm cột Thứ): tự nhận diện.
function getLichHomNay(ma) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LICHLAM');
  if (!sh) return [];
  var thu = weekDay(new Date()); // T2..CN
  var v = sh.getDataRange().getValues();
  var out = [];
  if (v.length < 2) return out;
  var ncols = v[0].length;
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() !== ma) continue;
    var ngayCell, caCell, bd, kt;
    if (ncols >= 7) { // sheet cũ: A Mã B Tên C Thứ D Ngày E Ca F BD G KT
      ngayCell = String(v[i][3]).trim();
      caCell = String(v[i][4] || '');
      bd = fmtTimeCell(v[i][5]); kt = fmtTimeCell(v[i][6]);
      if (!matchDay(String(v[i][2]).trim(), thu)) continue;
    } else { // sheet chuẩn 6 cột
      ngayCell = String(v[i][2]).trim();
      caCell = String(v[i][3] || '');
      bd = fmtTimeCell(v[i][4]); kt = fmtTimeCell(v[i][5]);
    }
    if (!matchDay(ngayCell, thu)) continue;
    out.push({ ca: String(caCell).trim(), bd: bd, kt: kt });
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

// Chuẩn hóa ô giờ: Sheets hay trả về Date dài dòng kiểu
// "Sat Dec 30 1899...GMT+0642 (Indochina Time)" -> rút về "HH:mm"
function fmtTimeCell(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'HH:mm');
  var s = String(x == null ? '' : x).trim();
  var m = s.match(/(\d{1,2})\s*:\s*(\d\d)/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  return s;
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

  var dist = haversine(p.lat, p.lng, CENTER_LAT, CENTER_LNG);
  var distM = Math.round(dist);
  if (dist > RADIUS_M) {
    return { ok: false, outOfRange: true, distance: distM,
      msg: 'Bạn đang ở ngoài khu vực check-in. Khoảng cách hiện tại: ' + distM + ' m.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CHECK IN');
  var todayStr = fmtD(new Date(p.openTs || new Date().getTime()));

  // Chống VÀO 2 lần khi chưa RA: tìm IN hôm nay chưa có OUT sau nó
  var note = '';
  if (p.type === 'IN' && !p.confirmed) {
    var rows = sh.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]).trim() === p.ma && String(rows[i][2]).indexOf(todayStr) === 0) {
        if (rows[i][8] === 'IN') {
          return { ok: false, needConfirm: true,
            msg: 'Ca trước bạn chưa bấm RA. Có chắc muốn VÀO ca mới không?' };
        }
        break; // log gần nhất trong ngày đã là OUT -> ok
      }
      if (String(rows[i][2]).indexOf(todayStr) !== 0 && String(rows[i][0]).trim() === p.ma) break;
    }
  }
  if (p.confirmed) note = 'VÀO ca mới khi ca trước chưa RA (quên RA)';

  // Tính trễ (chỉ cho IN có ca)
  var lateMin = 0;
  if (p.type === 'IN' && p.caBd) {
    var role = getRole(p.ma);
    var thu = weekDay(new Date(p.openTs));
    var chuan = chuanTime(p.caBd, role, thu, p.openTs);
    lateMin = Math.max(0, Math.round((p.openTs - chuan) / 60000));
  }

  // Lưu ảnh -> Drive
  var folder = getFolder();
  var ext = 'jpg';
  var fname = p.ma + '_' + fmtFile(new Date(p.openTs)) + '_' + p.type + '.' + ext;
  var blob = Utilities.newBlob(Utilities.base64Decode(p.photo), 'image/jpeg', fname);
  var file = folder.createFile(blob);

  sh.appendRow([p.ma, p.ten, p.openText, p.lat, p.lng, file.getUrl(),
    distM, p.submitText, p.type, p.caLabel || '', lateMin, note]);

  return { ok: true, time: p.openText, distance: distM, lateMin: lateMin, type: p.type };
}

function getFolder() {
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (it.hasNext()) return it.next();
  var f = DriveApp.createFolder(DRIVE_FOLDER);
  // Mặc định Restricted (chỉ người được share mới xem) — đúng ý trung tâm
  return f;
}

/* ---------- Báo cáo ngày / tháng ---------- */

function getBaoCaoNgay(ngayStr) { // 'dd/MM/yyyy'
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN');
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][2]).indexOf(ngayStr) !== 0) continue;
    var ma = String(v[i][0]);
    if (!map[ma]) map[ma] = { ma: ma, ten: String(v[i][1]), logs: [] };
    map[ma].logs.push({ gio: String(v[i][2]).slice(11), type: String(v[i][8]),
      ca: String(v[i][9]), tre: Number(v[i][10] || 0), kc: Number(v[i][6] || 0), note: String(v[i][11] || '') });
  }
  var out = [];
  for (var k in map) {
    var r = map[k], lastIn = null, quenRA = 0;
    r.logs.forEach(function (l) {
      if (l.type === 'IN') { if (lastIn) quenRA++; lastIn = l; } else { lastIn = null; }
    });
    if (lastIn) quenRA++;
    r.quenRA = quenRA > 0 ? quenRA - (r.logs[r.logs.length - 1].type === 'IN' ? 0 : 0) : 0;
    r.quenRA = lastIn ? quenRA : quenRA;
    out.push(r);
  }
  return out;
}

function getBaoCaoThang(ma, thangStr) { // thangStr 'MM/yyyy'
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN');
  var res = { ma: ma, thang: thangStr, tongGio: 0, soCa: 0, soLanTre: 0, soLanQuenRA: 0, kpi: 100, chiTiet: [] };
  if (!sh || sh.getLastRow() < 2) return res;
  var v = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() !== ma) continue;
    if (String(v[i][2]).slice(3) !== thangStr && String(v[i][2]).substring(3, 10) !== thangStr) continue;
    rows.push({ gio: String(v[i][2]), type: String(v[i][8]), ca: String(v[i][9]),
      bd: caBdFromLabel(String(v[i][9])), kt: caKtFromLabel(String(v[i][9])), tre: Number(v[i][10] || 0) });
  }
  // Ghép cặp IN->OUT theo ngày
  var byDay = {};
  rows.forEach(function (r) {
    var d = r.gio.substring(0, 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  });
  for (var d in byDay) {
    var day = byDay[d], openIn = null;
    day.forEach(function (r) {
      if (r.type === 'IN') {
        if (openIn) { res.soLanQuenRA++; } // IN mới khi chưa RA
        openIn = r;
        res.soCa++;
        if (r.tre > 0) res.soLanTre++;
      } else if (r.type === 'OUT' && openIn) {
        var h = gioLam(openIn, r, d);
        res.tongGio += h;
        res.chiTiet.push({ ngay: d, ca: openIn.ca, gio: h });
        openIn = null;
      }
    });
    if (openIn) res.soLanQuenRA++; // IN không có OUT
  }
  res.tongGio = Math.round(res.tongGio * 100) / 100;
  res.kpi = res.soLanTre >= 4 ? 0 : (res.soCa ? Math.round((res.soCa - res.soLanTre) / res.soCa * 100) : 100);
  return res;
}

// Giờ 1 ca = min(OUT thực, giờ KT ca) − giờ BD ca
function gioLam(inR, outR, ngayStr) {
  if (!inR.bd || !inR.kt) return 0;
  var bdTs = parseVN(ngayStr + ' ' + inR.bd);
  var ktTs = parseVN(ngayStr + ' ' + inR.kt);
  var outTs = parseVN(outR.gio);
  if (!bdTs || !ktTs || !outTs) return 0;
  var end = Math.min(outTs, ktTs);
  return Math.max(0, (end - bdTs) / 3600000);
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

// Giờ chuẩn: GV lùi 15', VP T7/CN lùi 30', VP ngày thường chuẩn 08:00
function chuanTime(caBd, role, thu, openTs) {
  var d = new Date(openTs);
  var parts = caBd.split(':');
  d.setHours(Number(parts[0]), Number(parts[1] || 0), 0, 0);
  var lui = 0;
  if (role === 'Văn phòng' || role === 'VanPhong') {
    lui = (thu === 'T7' || thu === 'CN') ? 30 : 0;
    if (thu !== 'T7' && thu !== 'CN') { d.setHours(8, 0, 0, 0); }
  } else { lui = 15; }
  return d.getTime() - lui * 60000;
}

function parseVN(s) { // 'dd/MM/yyyy HH:mm' hoặc có :ss
  var m = s.match(/(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d)/);
  if (!m) return 0;
  return new Date(m[3], m[2] - 1, m[1], m[4], m[5]).getTime();
}

function caBdFromLabel(label) { var m = label.match(/(\d\d:\d\d)\s*[-–]/); return m ? m[1] : ''; }
function caKtFromLabel(label) { var m = label.match(/[-–]\s*(\d\d:\d\d)/); return m ? m[1] : ''; }
