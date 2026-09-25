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
    ['Mã NV', 'Họ và tên', 'Ngày', 'Ca', 'Loại IN/OUT', 'Giờ check in', 'Giờ check out', 'Trễ (phút)', 'Ghi chú', 'Link ảnh', 'Khoảng cách (m)', 'Thiết bị']);
  ensureTab(ss, 'DANHSACH', ['Mã NV', 'Họ tên', 'Vai trò (Giáo viên/Văn phòng)']);
  ensureTab(ss, 'LICHLAM', ['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc']);
  ensureTab(ss, 'BAOCAO_THANG', ['Mã NV', 'Họ tên', 'Tổng giờ', 'Giờ tăng cường', 'Số ca', 'Số lần trễ', 'Số lần quên IN', 'Số lần quên OUT', 'KPI (%)']);
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

// Lịch của 1 nhân viên trong ngày hôm nay (theo cột Ngày T2..CN hoặc Cả ngày)
function getLichHomNay(ma) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LICHLAM');
  if (!sh) return [];
  var thu = weekDay(new Date()); // T2..CN
  var v = sh.getDataRange().getDisplayValues();
  var out = [];
  if (v.length < 2) return out;
  var ncols = v[0].length;
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() !== ma) continue;
    var ngayCell, caCell, bd, kt;
    if (ncols >= 7) { // sheet cũ 7 cột (A Mã B Tên C Thứ D Ngày E Ca F BD G KT)
      ngayCell = String(v[i][3]).trim();
      caCell = String(v[i][4] || '');
      bd = fmtTimeCell(v[i][5]); kt = fmtTimeCell(v[i][6]);
      if (!matchDay(String(v[i][2]).trim(), thu)) continue;
    } else { // sheet chuẩn 6 cột (A Mã B Tên C Ngày D Ca E BD F KT)
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

  var dist = haversine(p.lat, p.lng, CENTER_LAT, CENTER_LNG);
  var distM = Math.round(dist);
  if (dist > RADIUS_M) {
    return { ok: false, outOfRange: true, distance: distM,
      msg: 'Bạn đang ở ngoài khu vực check-in. Khoảng cách hiện tại: ' + distM + ' m.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CHECK IN');
  var todayStr = fmtD(new Date(p.openTs || new Date().getTime()));

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
    var ngayStr = fmtD(new Date(p.openTs));
    // Thứ tự cột mới: Mã, Tên, Ngày, Ca, Loại, Giờ in, Giờ out, Trễ, Ghi chú, Ảnh, Khoảng cách, Thiết bị
    sh.appendRow([p.ma, a.ten, ngayStr, a.ca, 'OUT', '', a.outTime, 0, '⚠️ Quên check out (Hệ thống tự OUT)', '', '', p.device || '']);
  }
  
  if (p.autoOutDone) note = 'VÀO ca mới sau khi hệ thống tự OUT ca trước';

  var lateMin = 0;
  if (p.type === 'IN' && p.caBd) {
    var chuan = chuanTime(p.caBd, p.openTs);
    lateMin = Math.max(0, Math.round((p.openTs - chuan) / 60000));
  }

  // 1 máy chấm cho 2 người cùng ngày = cheat: vẫn cho qua, nhưng ghi rõ vào Ghi chú.
  var canhBaoChungMay = kiemTraChungMay(p.ma, todayStr, p.device || '');

  var folder = getFolder();
  var ext = 'jpg';
  var fname = p.ma + '_' + fmtFile(new Date(p.openTs)) + '_' + p.type + '.' + ext;
  var blob = Utilities.newBlob(Utilities.base64Decode(p.photo), 'image/jpeg', fname);
  var file = folder.createFile(blob);

  // Thứ tự cột mới: Mã, Tên, Ngày, Ca, Loại IN/OUT, Giờ check in, Giờ check out, Trễ, Ghi chú, Link ảnh, Khoảng cách, Thiết bị
  var ngayStr = fmtD(new Date(p.openTs));
  var checkInTime = p.type === 'IN' ? cellHM(new Date(p.openTs)) : '';
  var checkOutTime = p.type === 'OUT' ? cellHM(new Date(p.openTs)) : '';
  var noteFull = [note, canhBaoChungMay.ghiChu].filter(function (x) { return x; }).join(' | ');
  
  sh.appendRow([p.ma, p.ten, ngayStr, p.caLabel || '', p.type, checkInTime, checkOutTime, lateMin, noteFull, file.getUrl(), distM, p.device || '']);

  return { ok: true, time: p.openText, distance: distM, lateMin: lateMin, type: p.type,
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
  var nc = lv[0].length;
  var lich = {};
  for (var i = 1; i < lv.length; i++) {
    if (!lv[i][0]) continue;
    var ma = String(lv[i][0]).trim();
    var ngayCell, caCell, bd;
    if (nc >= 7) {
      if (!matchDay(String(lv[i][2]).trim(), thu)) continue;
      ngayCell = String(lv[i][3]).trim();
      caCell = String(lv[i][4] || ''); bd = fmtTimeCell(lv[i][5]);
    } else {
      ngayCell = String(lv[i][2]).trim();
      caCell = String(lv[i][3] || ''); bd = fmtTimeCell(lv[i][4]);
    }
    if (!matchDay(ngayCell, thu)) continue;
    if (!lich[ma]) lich[ma] = { ma: ma, ten: String(lv[i][1] || ''), cas: [] };
    lich[ma].cas.push({ caName: String(caCell).trim(), text: (caCell ? caCell + ' ' : '') + bd, kt: (nc >= 7 ? fmtTimeCell(lv[i][6]) : fmtTimeCell(lv[i][5])) });
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
    soLanQuenIN: 0, soLanQuenRA: 0, soVangCoPhep: 0, soVangKhongBao: 0, vangKhongBaoChiTiet: [], kpi: 100, chiTiet: [] };
  if (!sh || sh.getLastRow() < 2) return res;
  var v = sh.getDataRange().getDisplayValues();
  var rows = [];
  // Cột mới: 0:Mã, 1:Tên, 2:Ngày, 3:Ca, 4:Loại, 5:Giờ in, 6:Giờ out, 7:Trễ, 8:Ghi chú
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    if (String(v[i][0]).trim() !== ma) continue;
    var day = cellDay(v[i][2]);
    var month = cellMY(v[i][2]);
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
      }
    });
    if (openIn) res.soLanQuenRA++;
  }
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
  var lv = shL.getDataRange().getDisplayValues();
  var nc = lv[0].length;
  var lichTuan = {};
  for (var i = 1; i < lv.length; i++) {
    if (String(lv[i][0]).trim() !== ma) continue;
    var thuCell, ngayCell, caCell, bd, kt;
    if (nc >= 7) {
      thuCell = String(lv[i][2]).trim(); ngayCell = String(lv[i][3]).trim();
      caCell = String(lv[i][4] || ''); bd = fmtTimeCell(lv[i][5]); kt = fmtTimeCell(lv[i][6]);
    } else {
      thuCell = ''; ngayCell = String(lv[i][2]).trim();
      caCell = String(lv[i][3] || ''); bd = fmtTimeCell(lv[i][4]); kt = fmtTimeCell(lv[i][5]);
    }
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
    for (var i = 1; i < v.length; i++) {
      if (!v[i][0]) continue;
      var ngay = cellDay(v[i][2]);
      var month = cellMY(v[i][2]);
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
      // 1c. VẮNG đúng giờ — chỉ ghi nhận, không trừ KPI
      if (loai === 'VẮNG' && !(tre > 0)) {
        errRows.push([ngay, ma, ten, ca, 'Vắng có phép', '', note]);
      }
      // 2. Quên OUT / Hệ thống tự OUT
      if (note.indexOf('Quên check out') !== -1 || note.indexOf('tự OUT') !== -1) {
        errRows.push([ngay, ma, ten, ca, 'Quên check out', '', note]);
      }
      // 2b. 1 máy chấm cho 2 người cùng ngày
      if (note.indexOf('1 máy chấm cho 2 người') !== -1) {
        errRows.push([ngay, ma, ten, ca, '1 máy – 2 người', '', note]);
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
  if (errRows.length > 0) {
    shErr.getRange(3, 1, errRows.length, errRows[0].length).setValues(errRows);
  }
  shErr.setFrozenRows(2);
  
  return { ok: true, msg: 'Đã xuất thành công 2 sheet: ' + sheetName + ' và ' + errSheetName };
}

// Hàm chạy tự động ngày 1 hàng tháng
function autoBackupThangTruoc() {
  var d = new Date();
  // Nếu là ngày 1, backup tháng trước
  if (d.getDate() === 1) {
    var prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    var thangStr = Utilities.formatDate(prev, TZ, 'MM/yyyy');
    var thangFile = Utilities.formatDate(prev, TZ, 'MM-yyyy');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
  }
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

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('CHECK IN');
  if (!sh) return { ok: false, msg: 'Sheet CHECK IN không tồn tại. Vui lòng chạy setup() trước.' };

  var ngayStr = fmtD(new Date(p.openTs || new Date().getTime()));

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
    var chuan = chuanTime(p.caBd, p.openTs || new Date().getTime());
    treVang = Math.max(0, Math.round(((p.openTs || new Date().getTime()) - chuan) / 60000));
  }

  var ghiChu = (p.lyDo || 'Phụ huynh xin nghỉ') + ' (Báo vắng từ xa: ' + fmtDT(new Date(p.openTs || new Date().getTime())) + ')';

  // Thứ tự cột: Mã, Tên, Ngày, Ca, Loại, Giờ in, Giờ out, Trễ, Ghi chú, Ảnh, Khoảng cách
  sh.appendRow([p.ma, p.ten, ngayStr, p.caLabel, 'VẮNG', '', '', treVang, ghiChu, '', '']);

  var msg = 'Đã ghi nhận báo vắng ca [' + p.caLabel + '] thành công!';
  if (treVang > 0) msg += ' (Báo trễ ' + treVang + ' phút)';
  return { ok: true, msg: msg, lateMin: treVang };
}
