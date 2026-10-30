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
// Chìa khóa và địa chỉ nhận tin đều nằm trong Script Properties, không ghi vào code/GitHub.
// TELEGRAM_BOT_TOKEN: token @joy_chamcong_bot.
// CHECKIN_TELEGRAM_CHAT_ID + CHECKIN_TELEGRAM_THREAD_ID: group/topic Check In/Out hiện dùng.
function diaChiNhanCheckIn_() {
  var props = PropertiesService.getScriptProperties();
  return {
    chat: props.getProperty('CHECKIN_TELEGRAM_CHAT_ID') || '',
    thread: props.getProperty('CHECKIN_TELEGRAM_THREAD_ID') || ''
  };
}

function guiTinTelegram(text) {
  try {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('TELEGRAM_BOT_TOKEN') || '';
    var dest = diaChiNhanCheckIn_();
    if (!token) { Logger.log('THIEU TOKEN: chua nhap TELEGRAM_BOT_TOKEN'); return 'THIEU TOKEN'; }
    if (!dest.chat || !dest.thread) { Logger.log('THIEU DIA CHI NHAN CHECK IN/OUT'); return 'THIEU DIA CHI NHAN'; }
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      payload: { chat_id: dest.chat, message_thread_id: dest.thread, text: text },
      muteHttpExceptions: true
    });
    Logger.log('GUI TIN: ' + resp.getContentText());
    return resp.getContentText();
  } catch (e) { Logger.log('LOI GUI TIN: ' + e.message); return 'LOI: ' + e.message; }
}

// Chạy sau khi anh gửi một tin trong topic 🕘 Check In/ Out bằng @joy_chamcong_bot.
// Hàm chỉ hiện tên nhóm, ID nhóm và ID topic trong Nhật ký; không in token.
function layDiaChiNhanCheckIn() {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '';
  if (!token) return 'Chưa nhập TELEGRAM_BOT_TOKEN trong Script Properties.';
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates', {muteHttpExceptions:true});
  var data = JSON.parse(resp.getContentText());
  if (!data.ok) return 'Không đọc được tin bot: kiểm tra token rồi thử lại.';
  var msgs = (data.result || []).map(function(x) { return x.message || x.channel_post || {}; })
    .filter(function(m) { return m.chat && (m.chat.type === 'group' || m.chat.type === 'supergroup') && m.message_thread_id; });
  if (!msgs.length) return 'Chưa thấy tin trong topic. Gửi @joy_chamcong_bot test vào topic Check In/ Out rồi chạy lại.';
  var m = msgs[msgs.length - 1];
  var text = 'Nơi nhận gần nhất: ' + m.chat.title + ' | Group ID: ' + m.chat.id + ' | Topic ID: ' + m.message_thread_id;
  Logger.log(text);
  return text;
}

function testGuiTinCheckIn() {
  return guiTinTelegram('🤖 Test Check In/Out: ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'));
}

function guiAnhTelegram(photoB64, caption) {
  try {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('TELEGRAM_BOT_TOKEN') || '';
    var dest = diaChiNhanCheckIn_();
    if (!token || !dest.chat || !dest.thread) { guiTinTelegram(caption); return; }
    if (!photoB64) { guiTinTelegram(caption); return; }
    var blob = Utilities.newBlob(Utilities.base64Decode(photoB64), 'image/jpeg', 'checkin.jpg');
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
      method: 'post',
      payload: { chat_id: dest.chat, message_thread_id: dest.thread,
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

/* ---------- Lịch làm việc: 21:00 hôm trước, nhóm riêng ---------- */
// Cấu hình trong Script Properties: LICH_LAM_BOT_TOKEN, LICH_LAM_CHAT_ID;
// nếu nhóm có topic, thêm LICH_LAM_THREAD_ID. Không dùng bot/topic Check IN/OUT.
function formatTomorrowWorkSchedule(now) {
  now = now || new Date();
  var target = new Date(now.getTime());
  target.setDate(target.getDate() + 1);
  var dateText = Utilities.formatDate(target, TZ, 'dd/MM/yyyy');
  var dayCode = weekDay(target);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('LICHLAM');
  if (!sh) throw new Error('Không tìm thấy LICHLAM.');
  var v = sh.getDataRange().getDisplayValues(), nc = v.length ? v[0].length : 0;
  var items = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i];
    if (!String(r[0] || '').trim()) continue;
    var thu = nc >= 7 ? String(r[2] || '').trim() : '';
    var day = String(r[nc >= 7 ? 3 : 2] || '').trim();
    if (thu && !matchDay(thu, dayCode)) continue;
    if (!day || (!matchDay(day, dayCode) && cellDay(day) !== dateText)) continue;
    var ca = String(r[nc >= 7 ? 4 : 3] || '').trim();
    var bd = fmtTimeCell(r[nc >= 7 ? 5 : 4]);
    var kt = fmtTimeCell(r[nc >= 7 ? 6 : 5]);
    items.push({ten:String(r[1] || r[0]).trim(), ca:ca, bd:bd, kt:kt});
  }
  var byTeacher = {};
  items.forEach(function(x) {
    if (!byTeacher[x.ten]) byTeacher[x.ten] = [];
    byTeacher[x.ten].push(x);
  });
  var teachers = Object.keys(byTeacher).sort(function(a, b) { return a.localeCompare(b); });
  var body = teachers.map(function(ten) {
    var shifts = byTeacher[ten].sort(function(a, b) { return a.bd.localeCompare(b.bd) || a.kt.localeCompare(b.kt); });
    return '👤 ' + ten + ' (' + shifts.length + ' ca)\n' +
      shifts.map(function(x) { return '   • ' + x.bd + '–' + x.kt + ' | ' + x.ca; }).join('\n');
  }).join('\n\n');
  return '📅 LỊCH LÀM VIỆC ' + dateText + '\n' +
    (items.length ? body : 'Hôm nay không có ca đã xếp.');
}

function guiLichLam_(now, markSent) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('LICH_LAM_BOT_TOKEN');
  var chat = props.getProperty('LICH_LAM_CHAT_ID');
  var thread = props.getProperty('LICH_LAM_THREAD_ID');
  if (!token || !chat || !thread) { Logger.log('Thiếu LICH_LAM_BOT_TOKEN/LICH_LAM_CHAT_ID/LICH_LAM_THREAD_ID'); return {ok:false, msg:'Thiếu cấu hình bot, nhóm hoặc topic lịch.'}; }
  // Khi Apps Script tự chạy trigger, tham số là event object chứ không phải Date.
  var current = now && typeof now.getTime === 'function' ? now : new Date();
  var next = new Date(current.getTime());
  next.setDate(next.getDate() + 1);
  var key = 'LICH_LAM_SENT_' + Utilities.formatDate(next, TZ, 'dd/MM/yyyy');
  if (markSent && props.getProperty(key)) return {ok:true, skipped:true, msg:'Lịch ngày mai đã gửi.'};
  try {
    var payload = {chat_id:chat, message_thread_id:thread, text:formatTomorrowWorkSchedule(current)};
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {method:'post', payload:payload, muteHttpExceptions:true});
    var body = JSON.parse(resp.getContentText());
    if (resp.getResponseCode() !== 200 || !body.ok) {
      var detail = body.description || ('HTTP ' + resp.getResponseCode());
      Logger.log('Không gửi được lịch: ' + detail);
      return {ok:false, msg:'Telegram chưa nhận lịch: ' + detail};
    }
    if (markSent) props.setProperty(key, 'sent');
    return {ok:true, msg:markSent ? 'Đã gửi lịch ngày ' + Utilities.formatDate(next, TZ, 'dd/MM/yyyy') : 'Đã gửi tin kiểm tra lịch.'};
  } catch(e) { Logger.log('Lỗi gửi lịch: ' + e.message); return {ok:false, msg:e.message}; }
}

function sendTomorrowWorkSchedule(now) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return {ok:false, msg:'Đang gửi lịch ở phiên khác.'};
  try { return guiLichLam_(now, true); }
  finally { lock.releaseLock(); }
}

// Dùng để thử gửi NGAY BÂY GIỜ. Không đánh dấu lịch đã gửi, không ảnh hưởng trigger 21h.
function testGuiLichLamNow() {
  return guiLichLam_(new Date(), false);
}

// Xác nhận token lịch đang thuộc bot nào, không in token ra Nhật ký.
function kiemTraBotLichLam() {
  var token = PropertiesService.getScriptProperties().getProperty('LICH_LAM_BOT_TOKEN') || '';
  if (!token) return {ok:false, msg:'Chưa nhập LICH_LAM_BOT_TOKEN.'};
  try {
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getMe', {muteHttpExceptions:true});
    var body = JSON.parse(resp.getContentText());
    if (resp.getResponseCode() !== 200 || !body.ok || !body.result) return {ok:false, msg:(body && body.description) || ('HTTP ' + resp.getResponseCode())};
    Logger.log('Bot lịch đang dùng: @' + body.result.username);
    return {ok:true, username:body.result.username};
  } catch (e) { return {ok:false, msg:e.message}; }
}

// Chạy thủ công một lần sau khi gửi /id@joy_victini_bot trong nhóm.
// Chỉ trả ID nhóm qua Apps Script log, không đọc hoặc in token.
function layIdNhomLichLam() {
  var token = PropertiesService.getScriptProperties().getProperty('LICH_LAM_BOT_TOKEN');
  if (!token) return 'Chưa nhập LICH_LAM_BOT_TOKEN trong Script Properties.';
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates', {muteHttpExceptions:true});
  var data = JSON.parse(resp.getContentText());
  if (!data.ok) return 'Không đọc được tin bot: kiểm tra mã bot và thử lại.';
  var groups = (data.result || []).map(function(x){return (x.message || x.channel_post || {}).chat;}).filter(function(x){return x && (x.type === 'group' || x.type === 'supergroup');});
  if (!groups.length) return 'Chưa thấy tin nhóm. Gửi /id@joy_victini_bot vào nhóm rồi chạy lại.';
  var g = groups[groups.length - 1];
  var text = 'Nhóm gần nhất: ' + g.title + ' | ID: ' + g.id + '. Xác nhận đúng Lịch làm việc trước khi nhập LICH_LAM_CHAT_ID.';
  Logger.log(text);
  return text;
}

function setupLichLamTrigger() {
  var props = PropertiesService.getScriptProperties();
  var chat = props.getProperty('LICH_LAM_CHAT_ID');
  var thread = props.getProperty('LICH_LAM_THREAD_ID');
  if (!props.getProperty('LICH_LAM_BOT_TOKEN') || !chat || !thread)
    return {ok:false, msg:'Nhập token, ID nhóm và ID topic lịch trong Script Properties trước.'};
  if (chat !== '-1004378772858' || thread !== '50')
    return {ok:false, msg:'Địa chỉ chưa khớp Office – Joy / topic Lịch làm việc. Không bật lịch để tránh gửi nhầm.'};
  var found = ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === 'sendTomorrowWorkSchedule'; });
  if (!found) ScriptApp.newTrigger('sendTomorrowWorkSchedule').timeBased().everyDays(1).atHour(21).create();
  return {ok:true, msg:found ? 'Trigger lịch đã có.' : 'Đã bật gửi lịch khoảng 21:00–22:00 giờ Việt Nam mỗi tối.'};
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

// Nhắc quên chấm và mốc 40 giờ; chỉ đọc dữ liệu, không khóa thao tác.
function getCheckinNotice(ma) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), now = new Date(), year = String(now.getFullYear()), rows = [], sheets = ss.getSheets();
  sheets.forEach(function(sh) { if (sh.getName() === 'CHECK IN' || sh.getName().indexOf('CHECK IN - Tháng ') === 0) { var v=sh.getDataRange().getDisplayValues(); for(var i=1;i<v.length;i++) rows.push(v[i]); } });
  var by = {}, missed = 0, last = null;
  rows.forEach(function(r) { if(String(r[0]).trim()!==String(ma).trim() || String(cellDay(r[2])).slice(6)!==year) return; var day=cellDay(r[2]); if(year==='2026' && parseVNDate(day)<new Date(2026,10,1)) return; var key=day+'|'+String(r[3]), o=by[key]||(by[key]={day:day,ca:String(r[3]),in:false,out:false}); if(r[4]==='IN')o.in=true; if(r[4]==='OUT')o.out=true; });
  Object.keys(by).sort(function(a,b){return parseVNDate(by[a].day)-parseVNDate(by[b].day)||a.localeCompare(b);}).forEach(function(k){var o=by[k];if(o.in!==o.out && parseVNDate(o.day)<new Date(now.getFullYear(),now.getMonth(),now.getDate())){missed++;last=o;}});
  var weekStart=getWeekStart(fmtD(now)), weekEnd=new Date(now.getFullYear(),now.getMonth(),now.getDate()), weekHours=0, pairs={};
  rows.forEach(function(r){if(String(r[0]).trim()!==String(ma).trim())return;var day=cellDay(r[2]);if(parseVNDate(day).getTime()<parseVNDate(weekStart).getTime()||parseVNDate(day).getTime()>weekEnd.getTime())return;var k=day+'|'+String(r[3]),o=pairs[k]||(pairs[k]={day:day,ca:String(r[3]),vao:'',ra:''});if(r[4]==='IN')o.vao=cellHM(r[5]);if(r[4]==='OUT')o.ra=cellHM(r[6]);});
  Object.keys(pairs).forEach(function(k){var o=pairs[k];if(o.vao&&o.ra)weekHours+=Number(hoursBetween(o.day,o.vao,o.ra)||0);});
  weekHours=Math.round(weekHours*100)/100;
  var msg=[]; if(last) msg.push('Ca gần nhất chưa đủ chấm: '+last.day+' — '+last.ca+' (thiếu '+(last.in?'OUT':'IN')+'). Còn '+Math.max(0,4-missed)+'/4 lần miễn trừ năm nay.'); if(missed>=4) msg.push(MISSED_PUNCH_MESSAGE);
  return { missed:missed, remaining:Math.max(0,4-missed), message:msg.join('\n'), weekHours:weekHours, warning40:weekHours>=40 };
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
    ' ca ' + (p.caLabel || 'chưa xác định') +
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

/* ---------- Exception: ca đột xuất có ảnh/GPS ---------- */
function getExceptionStatus(ma) {
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN');
  if(!sh || sh.getLastRow()<2) return {open:false};
  var rows=sh.getDataRange().getDisplayValues();
  for(var i=rows.length-1;i>=1;i--) if(String(rows[i][0]).trim()===String(ma).trim() && (rows[i][4]==='EXCEPTION_IN'||rows[i][4]==='EXCEPTION_OUT')) return {open:rows[i][4]==='EXCEPTION_IN', ca:String(rows[i][3]||'')};
  return {open:false};
}
function submitException(p) {
  if (!p.ma || !p.ten || !p.reason) return { ok:false, msg:'Bạn chọn mã, tên và lý do giúp mình.' };
  if (p.action !== 'IN' && p.action !== 'OUT') return { ok:false, msg:'Bạn chọn VÀO hoặc RA ca Exception giúp mình.' };
  if (!p.lat || !p.lng || !p.photo) return { ok:false, msg:'Ca Exception cần GPS và ảnh.' };
  var now = new Date(p.submitTs || new Date().getTime()), dist=Math.round(haversine(p.lat,p.lng,CENTER_LAT,CENTER_LNG));
  if (dist > RADIUS_M) return {ok:false,msg:'Bạn đang ngoài khu vực check-in: '+dist+' m.'};
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHECK IN'), rows=sh.getDataRange().getDisplayValues(), open=null;
  for(var i=rows.length-1;i>=1;i--) if(String(rows[i][0]).trim()===String(p.ma).trim() && (rows[i][4]==='EXCEPTION_IN'||rows[i][4]==='EXCEPTION_OUT')) { if(rows[i][4]==='EXCEPTION_IN') open=rows[i]; break; }
  if (p.action === 'IN' && open) return {ok:false,msg:'Bạn đang có một ca Exception chưa RA. Hãy chọn RA ca Exception để kết thúc ca đó.'};
  if (p.action === 'OUT' && !open) return {ok:false,msg:'Chưa có ca Exception đang mở để RA.'};
  var type=p.action === 'IN' ? 'EXCEPTION_IN' : 'EXCEPTION_OUT', ca='Ca Exception — '+p.reason;
  var id=open && String(open[8]).match(/ID:(EX-[A-Za-z0-9-]+)/);
  var uid=id ? id[1] : 'EX-' + now.getTime() + '-' + Utilities.getUuid().replace(/-/g,'').slice(0,8);
  if(open) ca=String(open[3]);
  var reasonText = open ? ca.replace(/^Ca Exception\s*[—-]\s*/, '') : p.reason;
  if(type==='EXCEPTION_IN') {
    var cv=sh.getDataRange().getDisplayValues();
    for(var q=1;q<cv.length;q++) if(String(cv[q][0]).trim()===String(p.ma).trim() && cellDay(cv[q][2])===fmtD(now) && cv[q][4]==='IN') return {ok:false,msg:'Đang có ca lịch; không mở ca Exception trùng giờ.'};
  }
  var blob=Utilities.newBlob(Utilities.base64Decode(p.photo),'image/jpeg',p.ma+'_'+fmtFile(now)+'_'+type+'.jpg'), url=getFolder().createFile(blob).getUrl();
  sh.appendRow([p.ma,p.ten,fmtD(now),ca,type,type==='EXCEPTION_IN'?cellHM(now):'',type==='EXCEPTION_OUT'?cellHM(now):'',0,'Exception | '+p.reason+' | ID:'+uid,url,dist,p.device||'']);
  var action = type === 'EXCEPTION_IN' ? 'VÀO' : 'RA';
  var notice = '🟣 ' + cellHM(now) + ' — ' + p.ten + ' (' + p.ma + ') ' + action +
    ' CA EXCEPTION — ' + reasonText + (type === 'EXCEPTION_OUT' ? ' (chờ quản lý duyệt)' : '');
  guiAnhTelegram(p.photo, notice);
  return {ok:true,msg:type==='EXCEPTION_IN'?'Đã VÀO CA EXCEPTION. Khi xong việc, chọn RA ca Exception.':'Đã RA CA EXCEPTION. Ca này chờ quản lý duyệt.',type:type};
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
    soLanQuenIN: 0, soLanQuenRA: 0, soVangCoPhep: 0, soVangKhongBao: 0, vangKhongBaoChiTiet: [], kpi: 100, chiTiet: [], 
    soLanTreThucTe: 0 };
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
          res.soLanTreThucTe++;
          caDaTinhTre[caName] = true;
        }
      } else if (r.type === 'VẮNG') {
        // Vắng có phép: 0 giờ, không tính ca làm, nhưng VẮNG bấm muộn vẫn tính trễ như đi trễ.
        res.soVangCoPhep++;
        var caV = r.ca || 'Ca chung';
        if (r.tre > 0 && r.note.indexOf('Phụ huynh xin nghỉ') !== 0 && !caDaTinhTre[caV]) {
          res.soLanTre++;
          res.soLanTreThucTe++;
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
        res.soLanTre++; // tính như 1 lần trễ cho KPI
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

/* ---------- Xuất chấm công tính lương (chỉ đọc CHECK IN/LICHLAM) ---------- */
var PAYROLL_EXPORT_HEADERS = ['Mã NV', 'Họ tên', 'Ngày', 'Ca lịch', 'Giờ VÀO', 'Giờ RA', 'Loại', 'Trễ (phút)', 'Trạng thái ca', 'Số giờ thực tế', 'Đủ ca theo lịch', 'Ghi chú'];

function getPayrollAttendanceSource(ss, monthStr) {
  // Tháng đã chốt luôn ưu tiên bản snapshot, vì CHECK IN hiện tại có thể đã được dọn.
  var snapshotName = 'CHECK IN - Tháng ' + monthStr.replace('/', '-');
  var snapshot = ss.getSheetByName(snapshotName);
  return { sheet: snapshot || ss.getSheetByName('CHECK IN'), name: snapshot ? snapshotName : 'CHECK IN', locked: !!snapshot };
}

function getPayrollAttendanceRows(monthStr) {
  // Legacy CSV 12 cột chỉ cho đối chiếu; không dùng làm nguồn tự tính lương.
  var m = String(monthStr || '').match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
  if (!m) throw new Error('Tháng không hợp lệ. Dùng định dạng MM/yyyy.');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = getPayrollAttendanceSource(ss, monthStr).sheet;
  var shL = payrollScheduleSource(ss, monthStr).sheet;
  var result = {};
  var days = new Date(Number(m[2]), Number(m[1]), 0).getDate();
  var dateKeys = [];
  for (var d = 1; d <= days; d++) dateKeys.push(('0' + d).slice(-2) + '/' + m[1] + '/' + m[2]);
  function add(ma, ten, ngay, ca) {
    var key = [ma, ngay, ca].join('|');
    if (!result[key]) result[key] = { ma: ma, ten: ten, ngay: ngay, ca: ca, vao: '', ra: '', loai: [], tre: 0, notes: [], hasIn: false, hasOut: false, absent: '' };
    return result[key];
  }
  if (shL && shL.getLastRow() >= 2) {
    var lv = shL.getDataRange().getDisplayValues(), nc = lv[0].length;
    for (var i = 1; i < lv.length; i++) {
      var ma = String(lv[i][0] || '').trim(); if (!ma) continue;
      var ten = String(lv[i][1] || ''), ca = String(lv[i][nc >= 7 ? 4 : 3] || '').trim();
      var ktLich = fmtTimeCell(lv[i][nc >= 7 ? 6 : 5]);
      var dayCell = String(lv[i][nc >= 7 ? 3 : 2] || '').trim();
      var thu = nc >= 7 ? String(lv[i][2] || '').trim() : '';
      dateKeys.forEach(function(day) {
        if (thu && !matchDay(thu, weekDay(parseVNDate(day)))) return;
        if (dayCell && !matchDay(dayCell, weekDay(parseVNDate(day))) && cellDay(dayCell) !== day) return;
        if (!dayCell && !thu) return;
        add(ma, ten, day, ca).kt = ktLich;
      });
    }
  }
  if (sh && sh.getLastRow() >= 2) {
    var cv = sh.getDataRange().getDisplayValues(), raw = sh.getDataRange().getValues();
    for (var j = 1; j < cv.length; j++) {
      var ma2 = String(cv[j][0] || '').trim(); if (!ma2) continue;
      var day2 = ngayCuaO(raw[j][2]); if (thangCuaO(raw[j][2]) !== monthStr) continue;
      var ca2 = String(cv[j][3] || '').trim(), r = add(ma2, String(cv[j][1] || ''), day2, ca2);
      // File trao cho Bảng lương chỉ dùng HH:mm, không kèm giây.
      var type = String(cv[j][4] || '').trim(), timeIn = cellHM(cv[j][5]), timeOut = cellHM(cv[j][6]);
      if (type === 'IN') { r.hasIn = true; if (timeIn && (!r.vao || timeIn < r.vao)) r.vao = timeIn; r.tre = Math.max(r.tre, Number(cv[j][7] || 0)); }
      else if (type === 'OUT') { r.hasOut = true; if (timeOut && (!r.ra || timeOut > r.ra)) r.ra = timeOut; }
      else if (type === 'VẮNG') { r.absent = String(cv[j][8] || '').toLowerCase().indexOf('không báo') >= 0 ? 'Vắng không báo' : 'Vắng'; r.tre = Math.max(r.tre, Number(cv[j][7] || 0)); }
      if (cv[j][8]) r.notes.push(String(cv[j][8]));
    }
  }
  // Xác định vắng không báo bằng lịch nhưng không có IN/VẮNG, chỉ cho ngày đã hết ca.
  Object.keys(result).forEach(function(key) {
    var r = result[key];
    if (!r.hasIn && !r.hasOut && !r.absent && isQuaGioCa(r.ngay, r.kt || caKtFromLabel(r.ca))) r.absent = 'Vắng không báo';
  });
  var rows = Object.keys(result).map(function(key) {
    var r = result[key], status, type, hours = '';
    if (r.absent) {
      status = r.absent;
      type = r.absent;
      if (r.absent === 'Vắng không báo' && r.notes.join(' | ').indexOf('Vắng không báo') === -1) r.notes.push('Vắng không báo');
    }
    else if (!r.hasIn) { status = 'Thiếu IN'; type = r.hasOut ? 'OUT' : ''; }
    else if (!r.hasOut) { status = 'Thiếu OUT'; type = 'IN'; }
    else { status = 'Đủ ca'; type = 'IN/OUT'; }
    if (r.vao && r.ra) {
      var a = parseVN(r.ngay + ' ' + r.vao), b = parseVN(r.ngay + ' ' + r.ra);
      if (a && b) { if (b < a) b += 86400000; hours = Math.round((b - a) / 36000) / 100; }
    }
    var qualified = status === 'Đủ ca' && r.tre < 20 ? 'Có' : 'Không';
    return [r.ma, r.ten, r.ngay, r.ca, r.vao, r.ra, type, r.tre || 0, status, hours, qualified, r.notes.join(' | ')];
  });
  rows.sort(function(a,b) { var pa=a[2].split('/'),pb=b[2].split('/'); return new Date(pa[2],pa[1]-1,pa[0])-new Date(pb[2],pb[1]-1,pb[0]) || String(a[0]).localeCompare(String(b[0])) || String(a[3]).localeCompare(String(b[3])); });
  return rows;
}

function previewPayrollAttendance(monthStr) { return { headers: PAYROLL_EXPORT_HEADERS, rows: getPayrollAttendanceRows(monthStr) }; }

function exportPayrollAttendanceCsv(monthStr) {
  var rows = [PAYROLL_EXPORT_HEADERS].concat(getPayrollAttendanceRows(monthStr));
  var csv = rows.map(function(row) { return row.map(function(x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""'); }).join(','); }).join('\r\n');
  return { filename: 'Cham_cong_tinh_luong_' + monthStr.replace('/', '-') + '.csv', content: '\uFEFF' + csv };
}

function exportPayrollAttendanceXlsx(monthStr) {
  var data = getPayrollWorkbookData(monthStr);
  var book = SpreadsheetApp.create('Cham cong tinh luong ' + monthStr);
  var sheets = [{name:'Tong hop GV', data:[PAYROLL_SUMMARY_HEADERS].concat(data.summaryRows)}, {name:'Chi tiet ca', data:[PAYROLL_DETAIL_HEADERS].concat(data.detailRows)}, {name:'Gio tuan', data:[PAYROLL_WEEK_HEADERS].concat(data.weekRows)}];
  sheets.forEach(function (part, index) {
    var sh = index === 0 ? book.getSheets()[0] : book.insertSheet();
    sh.setName(part.name);
    if (part.data.length) sh.getRange(1, 1, part.data.length, part.data[0].length).setValues(part.data);
    sh.setFrozenRows(1);
  });
  var url = 'https://docs.google.com/spreadsheets/d/' + book.getId() + '/export?format=xlsx';
  return { url: url, filename: 'Cham_cong_tinh_luong_' + monthStr.replace('/', '-') + '.xlsx' };
}

var PAYROLL_DETAIL_HEADERS = ['Mã dòng','Mã NV','Họ tên','Ngày','Loại ca','Tên ca','Giờ VÀO','Giờ RA','Số giờ thực tế','Giờ đề xuất tính công','Kết quả công','Lý do','Trễ (phút)','Ảnh hưởng KPI','Lý do KPI','Phép','Lý do phép','Quên chấm năm nay','Trạng thái Exception','Ghi chú','Nguồn dữ liệu','Lịch đối chiếu','Phiên bản file','Giờ dùng kiểm soát 46h','Nhắc nhở'];
var PAYROLL_V4_VERSION = 'attendance-export-v4';
function payrollRowId(r) {
  if (r.isException && r.uid) return r.uid;
  return (r.isException ? 'EX-LEGACY-' : 'CA-') + [r.ma, r.ngay.split('/').reverse().join(''), r.ca, r.bd || '', r.kt || ''].map(function(x){return encodeURIComponent(String(x));}).join('-');
}
var PAYROLL_SUMMARY_HEADERS = ['Mã NV','Họ tên','Vai trò','Tổng giờ hợp lệ tháng','Giờ miễn trừ','Số ca không tính công','Số Exception chờ duyệt','Quên chấm năm nay','Giờ tuần cao nhất','Tình trạng 46 giờ','Ngày cần xem KPI','Ngày trừ phép','Cần quản lý xem'];
var PAYROLL_WEEK_HEADERS = ['Mã NV','Họ tên','Tuần từ','Tuần đến','Giờ thực tế hợp lệ','Giờ Exception chờ duyệt','Tổng giờ dùng kiểm soát lịch','Mốc hợp đồng','Còn lại/Vượt','Cảnh báo'];

function payrollScheduleSource(ss, monthStr) {
  var n = 'LICHLAM - Tháng ' + monthStr.replace('/', '-'), sh = ss.getSheetByName(n);
  return { sheet: sh || ss.getSheetByName('LICHLAM'), locked: !!sh, name: sh ? n : 'LICHLAM' };
}
function isExceptionType(t) { return t === 'EXCEPTION_IN' || t === 'EXCEPTION_OUT'; }
function isQuotaDate(ngay) { return ngay.slice(6) !== '2026' || parseVNDate(ngay) >= new Date(2026,10,1); }
function daysInMonth(monthStr) { var p = monthStr.split('/'); return new Date(Number(p[1]), Number(p[0]), 0).getDate(); }
function caHoursFromLabel(ngay, ca) { return scheduleHours(ngay, caBdFromLabel(ca), caKtFromLabel(ca)); }

// Đếm quota quên chấm ca lịch trên toàn năm, gộp CHECK IN và các snapshot,
// sau đó khử trùng theo nhân viên-ngày-ca. Lần miễn trừ của tháng đang xuất
// phải biết các lần đã dùng từ những tháng trước, không được reset theo tháng.
function getAnnualMissedBefore(ss, ma, ngayTarget) {
  var year=ngayTarget.slice(6), all={}, sheets=ss.getSheets ? ss.getSheets() : [];
  sheets.forEach(function(sh){ var name=sh.getName(); if(name!=='CHECK IN' && name.indexOf('CHECK IN - Tháng ')!==0)return; if(sh.getLastRow()<2)return; var d=sh.getDataRange(), v=d.getDisplayValues(), raw=d.getValues(); for(var i=1;i<v.length;i++){if(String(v[i][0]).trim()!==String(ma).trim())continue;var day=ngayCuaO(raw[i][2]);if(day.slice(6)!==year||(year==='2026'&&parseVNDate(day)<new Date(2026,10,1)))continue;var k=day+'|'+String(v[i][3]||''),o=all[k]||(all[k]={day:day,in:false,out:false});if(v[i][4]==='IN')o.in=true;if(v[i][4]==='OUT')o.out=true;}});
  var n=0;Object.keys(all).forEach(function(k){var o=all[k];if(parseVNDate(o.day)<parseVNDate(ngayTarget)&&o.in!==o.out)n++;});return n;
}

function getPayrollWorkbookData(monthStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), src = getPayrollAttendanceSource(ss, monthStr), schedSrc = payrollScheduleSource(ss, monthStr);
  var m = String(monthStr).match(/^(0[1-9]|1[0-2])\/(\d{4})$/); if (!m) throw new Error('Tháng không hợp lệ. Dùng MM/yyyy.');
  if (!src.sheet || !schedSrc.sheet) throw new Error('Thiếu CHECK IN hoặc LICHLAM; không thể xuất file đáng tin cậy.');
  var shifts = {}, days = daysInMonth(monthStr), sourceLabel = src.locked ? 'Bản chốt' : 'Dữ liệu hiện tại', scheduleLabel = schedSrc.locked ? 'Lịch tại thời điểm chốt' : (schedSrc.sheet ? 'Lịch hiện tại' : 'Không có lịch');
  function add(ma, ten, ngay, ca, isException, uid, bd, kt) { var k=[ma,ngay,uid || ca,isException?'E':'L',bd||'',kt||''].join('|'); if (!shifts[k]) shifts[k]={ma:ma,ten:ten,ngay:ngay,ca:ca,uid:uid||'',bd:bd||'',kt:kt||'',hasIn:false,hasOut:false,vao:'',ra:'',late:0,notes:[],absent:'',absentReason:'',isException:!!isException}; return shifts[k]; }
  function scheduledShiftForEvent(ma,ngay,ca) {
    var keys=Object.keys(shifts).filter(function(k){var r=shifts[k];return !r.isException && r.ma===ma && r.ngay===ngay && (ca===r.ca || ca.indexOf(r.ca+' ')===0);});
    if(keys.length===1) return shifts[keys[0]];
    var span=String(ca).match(/(\d{1,2}:\d\d)\s*[-–]\s*(\d{1,2}:\d\d)/);
    if(span){var exact=keys.filter(function(k){var r=shifts[k];return r.bd===span[1]&&r.kt===span[2];});if(exact.length===1)return shifts[exact[0]];}
    // Ambiguous old records must not be silently assigned to one shift.
    return null;
  }
  // expand scheduled shifts for every date of the selected month
  if (schedSrc.sheet && schedSrc.sheet.getLastRow() >= 2) {
    var lv=schedSrc.sheet.getDataRange().getDisplayValues(), nc=lv[0].length;
    for (var i=1;i<lv.length;i++) { var ma=String(lv[i][0]||'').trim(); if(!ma)continue; var ten=String(lv[i][1]||''), dayCell=String(lv[i][nc>=7?3:2]||'').trim(), thu=nc>=7?String(lv[i][2]||'').trim():'', ca=String(lv[i][nc>=7?4:3]||'').trim(), bd=fmtTimeCell(lv[i][nc>=7?5:4]), kt=fmtTimeCell(lv[i][nc>=7?6:5]);
      for(var d=1;d<=days;d++){var ngay=('0'+d).slice(-2)+'/'+m[1]+'/'+m[2]; if(thu&&!matchDay(thu,weekDay(parseVNDate(ngay))))continue; if(dayCell&&!matchDay(dayCell,weekDay(parseVNDate(ngay)))&&cellDay(dayCell)!==ngay)continue; if(!dayCell&&!thu)continue; var q=add(ma,ten,ngay,ca,false,'',bd,kt);q.bd=bd;q.kt=kt;}
    }
  }
  if (src.sheet && src.sheet.getLastRow() >= 2) {
    var cv=src.sheet.getDataRange().getDisplayValues(), raw=src.sheet.getDataRange().getValues(), legacyOpen={};
    for(var j=1;j<cv.length;j++){var ma2=String(cv[j][0]||'').trim();if(!ma2||thangCuaO(raw[j][2])!==monthStr)continue;var ngay2=ngayCuaO(raw[j][2]), type=String(cv[j][4]||''), ex=isExceptionType(type), note=String(cv[j][8]||''), uidMatch=note.match(/(?:^|\|)\s*ID:(EX-[A-Za-z0-9-]+)/), uid=ex&&uidMatch?uidMatch[1]:'', legacyKey=ma2+'|'+ngay2+'|'+String(cv[j][3]||''), legacyUid=ex&&!uid?(type==='EXCEPTION_IN'?'EX-LEGACY-'+ma2+'-'+ngay2.split('/').reverse().join('')+'-'+j:(legacyOpen[legacyKey]||'EX-UNPAIRED-'+ma2+'-'+j)):'', r=(ex?null:scheduledShiftForEvent(ma2,ngay2,String(cv[j][3]||'')))||add(ma2,String(cv[j][1]||''),ngay2,String(cv[j][3]||''),ex,uid||legacyUid), ti=cellHM(cv[j][5]),to=cellHM(cv[j][6]);
      if(ex&&!uid){if(type==='EXCEPTION_IN')legacyOpen[legacyKey]=legacyUid;else delete legacyOpen[legacyKey];}
      if(type==='IN'||type==='EXCEPTION_IN'){r.hasIn=true;r.vao=ti||r.vao;r.late=Math.max(r.late,Number(cv[j][7]||0));} else if(type==='OUT'||type==='EXCEPTION_OUT'){r.hasOut=true;r.ra=to||r.ra;} else if(type==='VẮNG'){r.absent='Vắng';r.absentReason=note.split(' (')[0]||'Vắng';r.reportedLate=Number(cv[j][7]||0);} if(note)r.notes.push(note);
    }
  }
  Object.keys(shifts).forEach(function(k){var r=shifts[k];if(!r.isException&&!r.hasIn&&!r.hasOut&&!r.absent&&isQuaGioCa(r.ngay,r.kt))r.absent='Vắng không báo';});
  var exMissed={}, sameDayMissed={}, details=[];
  Object.keys(shifts).sort(function(a,b){var ra=shifts[a],rb=shifts[b];return parseVNDate(ra.ngay)-parseVNDate(rb.ngay)||ra.ma.localeCompare(rb.ma)||(ra.bd||ra.vao||'').localeCompare(rb.bd||rb.vao||'')||a.localeCompare(b);}).forEach(function(k){var r=shifts[k], ek=r.ma+'|'+monthStr, dayKey=r.ma+'|'+r.ngay, scheduled=scheduleHours(r.ngay,r.bd,r.kt)||caHoursFromLabel(r.ngay,r.ca), before=getAnnualMissedBefore(ss,r.ma,r.ngay)+(sameDayMissed[dayKey]||0), ev=evaluateAttendanceShift({hasIn:r.hasIn,hasOut:r.hasOut,vao:r.vao,ra:r.ra,ngay:r.ngay,lateMin:r.late,scheduleHours:scheduled,absent:r.absent,absentReason:r.absentReason,reportedLate:r.reportedLate,isException:r.isException},before,exMissed[ek]||0);
    if(r.isException&&(r.hasIn!==r.hasOut))exMissed[ek]=(exMissed[ek]||0)+1;
    if(!r.isException&&(r.hasIn!==r.hasOut)&&isQuotaDate(r.ngay))sameDayMissed[dayKey]=(sameDayMissed[dayKey]||0)+1;
    details.push({r:r,ev:ev,quota:before + (!r.isException&&(r.hasIn!==r.hasOut)&&isQuotaDate(r.ngay)?1:0),source:sourceLabel,schedule:r.isException?'Không có lịch':scheduleLabel});
  });
  var exceptionIntervals={};
  details.forEach(function(x){if(!x.r.isException||!x.r.hasIn||!x.r.hasOut)return;var r=x.r, key=r.ma+'|'+r.ngay, intervals=exceptionIntervals[key]||(exceptionIntervals[key]=[]);var a=parseVN(r.ngay+' '+r.vao),b=parseVN(r.ngay+' '+r.ra);if(b<a)b+=86400000;intervals.push([a,b]);});
  details.forEach(function(x){var r=x.r;if(r.isException||!r.hasIn||!r.hasOut)return;var a=parseVN(r.ngay+' '+r.vao),b=parseVN(r.ngay+' '+r.ra);if(b<a)b+=86400000;var overlap=(exceptionIntervals[r.ma+'|'+r.ngay]||[]).some(function(t){return a<t[1]&&b>t[0];});if(overlap){x.ev.result='Không tính công';x.ev.reason='Trùng giờ ca đột xuất — chờ quản lý kiểm tra';x.ev.hours='';}});
  var roles={};getNhanVienList().forEach(function(n){roles[n.ma]=n.role;});
  var controlIntervals={};
  details.forEach(function(x){var r=x.r,e=x.ev;if(!(r.hasIn&&r.hasOut) || !(r.isException || e.result==='Tính theo giờ thực tế'))return;var k=r.ma+'|'+getWeekStart(r.ngay),a=parseVN(r.ngay+' '+r.vao),b=parseVN(r.ngay+' '+r.ra);if(b<a)b+=86400000;if(!controlIntervals[k])controlIntervals[k]=[];controlIntervals[k].push([a,b,r.isException]);});
  var byPerson={}, byWeek={}; details.forEach(function(x){var r=x.r,e=x.ev,pk=r.ma+'|'+r.ten;if(!byPerson[pk])byPerson[pk]={ma:r.ma,ten:r.ten,role:roles[r.ma]||'',actual:0,exempt:0,no:0,exceptions:0,quota:x.quota,kpi:[],leave:[],todo:[]};var p=byPerson[pk];p.quota=Math.max(p.quota,x.quota);if(e.result==='Tính theo giờ thực tế')p.actual+=Number(e.hours||0);else if(e.result==='Không tính công')p.no++;else p.exceptions++;if(e.kpi==='Có')p.kpi.push(r.ngay+' — '+r.ca+' — '+e.kpiReason);if(e.leave==='Trừ phép')p.leave.push(r.ngay+' — '+r.ca+' — '+e.reason);if(e.result==='Chờ duyệt Exception'||e.result==='Không tính công')p.todo.push(r.ngay+' — '+r.ca+' — '+e.reason);
    var wk=r.ma+'|'+getWeekStart(r.ngay);if(!byWeek[wk])byWeek[wk]={ma:r.ma,ten:r.ten,start:getWeekStart(r.ngay),actual:0,exempt:0,exception:0};if(e.result==='Tính theo giờ thực tế')byWeek[wk].actual+=Number(e.hours||0);if(r.isException&&r.hasIn&&r.hasOut)byWeek[wk].exception+=Number(hoursBetween(r.ngay,r.vao,r.ra)||0);
  });
  Object.keys(controlIntervals).forEach(function(k){var intervals=controlIntervals[k].sort(function(a,b){return a[0]-b[0]||a[1]-b[1];}), actual=0, exception=0, cursor=0;intervals.forEach(function(t){var fresh=Math.max(0,t[1]-Math.max(t[0],cursor))/3600000;if(t[2])exception+=fresh;else actual+=fresh;cursor=Math.max(cursor,t[1]);});if(byWeek[k]){byWeek[k].actual=Math.round(actual*100)/100;byWeek[k].exception=Math.round(exception*100)/100;}});
  var weekRows=Object.keys(byWeek).sort().map(function(k){var w=byWeek[k], end=parseVNDate(w.start);end.setDate(end.getDate()+6);var endStr=('0'+end.getDate()).slice(-2)+'/'+('0'+(end.getMonth()+1)).slice(-2)+'/'+end.getFullYear(), missing=false;
    // Read the adjacent month's archived events; never infer safety from a partial week.
    var edgeDays=[w.start,endStr];
    edgeDays.forEach(function(day){var adj=day.slice(3);if(adj===monthStr)return;var other=getPayrollAttendanceSource(ss,adj).sheet;if(!other){missing=true;return;}var v=other.getDataRange().getDisplayValues(), pairs={};for(var i=1;i<v.length;i++){var row=v[i],d=cellDay(row[2]);if(String(row[0]).trim()!==w.ma || parseVNDate(d)<parseVNDate(w.start)||parseVNDate(d)>parseVNDate(endStr))continue;var type=String(row[4]), key=d+'|'+String(row[3]);var p=pairs[key]||(pairs[key]={day:d,inn:'',out:'',ex:false});if(type==='IN'||type==='EXCEPTION_IN')p.inn=cellHM(row[5]);if(type==='OUT'||type==='EXCEPTION_OUT')p.out=cellHM(row[6]);p.ex=p.ex||isExceptionType(type);}Object.keys(pairs).forEach(function(key){var p=pairs[key];if(p.inn&&p.out){if(p.ex)w.exception+=Number(hoursBetween(p.day,p.inn,p.out)||0);else w.actual+=Number(hoursBetween(p.day,p.inn,p.out)||0);}});
    });
    var total=Math.round((w.actual+w.exception)*100)/100,state=missing?'Chưa đủ dữ liệu tuần':total>46?'Vượt '+Math.round((total-46)*100)/100+' giờ':total===46?'Đủ 46 giờ':'Còn '+Math.round((46-total)*100)/100+' giờ',warn=missing?'Chưa đủ dữ liệu tuần vắt tháng — kiểm tra tháng kề':total>46?'Vượt 46 giờ — cần quản lý kiểm tra':total>=40?'Từ 40 giờ — liên hệ Ms. Vân Anh':'';return [w.ma,w.ten,w.start,endStr,w.actual,w.exception,total,46,state,warn];});
  var summaryRows=Object.keys(byPerson).sort().map(function(k){var p=byPerson[k], ws=weekRows.filter(function(w){return w[0]===p.ma;}),high=ws.reduce(function(a,w){return Math.max(a,Number(w[6]||0));},0),state=high>46?'Vượt '+Math.round((high-46)*100)/100+' giờ':high>=40?'Từ 40 giờ — kiểm tra lịch':'Bình thường';return[p.ma,p.ten,p.role,Math.round(p.actual*100)/100,Math.round(p.exempt*100)/100,p.no,p.exceptions,p.quota+'/4',high,state,p.kpi.join('; '),p.leave.join('; '),p.todo.join('; ')];});
  var detailRows=details.map(function(x){var r=x.r,e=x.ev, verified=r.hasIn&&r.hasOut?hoursBetween(r.ngay,r.vao,r.ra):'', control=r.isException&&verified!==''?verified:e.result==='Tính theo giờ thực tế'?verified:0, proposed=e.result==='Tính theo giờ thực tế'?verified:0, ph=r.absentReason.indexOf('Phụ huynh xin nghỉ')===0, reminder=ph&&Number(r.reportedLate||0)>0?'PH xin nghỉ báo muộn '+r.reportedLate+' phút':'', note=r.notes.join(' | '), status=r.isException?'Chờ duyệt Exception':'Không có';return[payrollRowId(r),r.ma,r.ten,r.ngay,r.isException?'Ca đột xuất':'Ca lịch',r.ca,r.vao,r.ra,verified,proposed,e.result,e.reason,r.late||r.reportedLate||0,e.kpi,e.kpiReason,e.leave==='Trừ phép'?'Trừ phép':'Không trừ phép',e.leave==='Trừ phép'?r.absentReason:'',x.quota+'/4',status,note,x.source,x.schedule,PAYROLL_V4_VERSION,control,reminder];});
  return {detailRows:detailRows,summaryRows:summaryRows,weekRows:weekRows};
}

function previewPayrollWorkbook(monthStr) { var d=getPayrollWorkbookData(monthStr); return {summaryHeaders:PAYROLL_SUMMARY_HEADERS,summaryRows:d.summaryRows,detailHeaders:PAYROLL_DETAIL_HEADERS,detailRows:d.detailRows,weekHeaders:PAYROLL_WEEK_HEADERS,weekRows:d.weekRows}; }
function exportPayrollAttendanceCompactCsv(monthStr) { var d=getPayrollWorkbookData(monthStr), rows=[PAYROLL_DETAIL_HEADERS].concat(d.detailRows), csv=rows.map(function(row){return row.map(function(x){return '"'+String(x==null?'':x).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');return {filename:'Cham_cong_tinh_luong_gon_'+monthStr.replace('/','-')+'.csv',content:'\uFEFF'+csv}; }

// Chốt bản copy để xem/xuất lại tháng cũ. Không xóa dữ liệu CHECK IN hiện hành.
function chotThangAnToan(monthStr, replaceExisting) {
  if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(String(monthStr||''))) return {ok:false,msg:'Tháng phải theo dạng MM/yyyy.'};
  var ss=SpreadsheetApp.getActiveSpreadsheet(), tag=monthStr.replace('/','-'), specs=[{from:'CHECK IN',to:'CHECK IN - Tháng '+tag},{from:'LICHLAM',to:'LICHLAM - Tháng '+tag}];
  for(var i=0;i<specs.length;i++) {
    if(!ss.getSheetByName(specs[i].from)) return {ok:false,msg:'Thiếu sheet '+specs[i].from+'; chưa chốt được.'};
    if(ss.getSheetByName(specs[i].to) && !replaceExisting) return {ok:false,exists:true,msg:'Đã có bản chốt tháng '+monthStr+'. Chọn Giữ bản cũ hoặc Chốt lại.'};
  }
  // Tạo bản tạm trước; lỗi bất kỳ bước nào không được xóa bản đã chốt cũ.
  var copies=[];
  try {
    specs.forEach(function(s,idx){var copy=ss.getSheetByName(s.from).copyTo(ss);copies.push(copy);copy.setName('TAM_CHOT_'+tag+'_'+idx);});
    specs.forEach(function(s,idx){var old=ss.getSheetByName(s.to);if(old)old.setName('CU_CHOT_'+tag+'_'+idx);copies[idx].setName(s.to);copies[idx].setTabColor('#B8A38B');copies[idx].getRange(1,1).setNote('🔒 BẢN ĐÃ CHỐT | Tháng: '+monthStr+' | Lúc: '+fmtDT(new Date()));copies[idx].setFrozenRows(1);});
    specs.forEach(function(s,idx){var old=ss.getSheetByName('CU_CHOT_'+tag+'_'+idx);if(old)ss.deleteSheet(old);});
    return {ok:true,msg:'Đã chốt chấm công và lịch tháng '+monthStr+'.'};
  } catch(e) {
    Logger.log('Chốt tháng lỗi: '+e.message);
    // Khôi phục tên chuẩn của cả hai bản cũ trước; giữ bản tạm nếu không thể dọn.
    specs.forEach(function(s,idx){
      var old=ss.getSheetByName('CU_CHOT_'+tag+'_'+idx);
      if(old){
        var partial=ss.getSheetByName(s.to);
        if(partial) partial.setName('TAM_LOI_'+tag+'_'+idx);
        old.setName(s.to);
      }
    });
    return {ok:false,msg:'Chốt tháng chưa hoàn tất: '+e.message+'; bản cũ được giữ lại. Kiểm tra các sheet TAM_CHOT/TAM_LOI trước khi thử lại.'};
  }
}

/* ---------- Quy tắc công/lương (chỉ đọc dữ liệu nguồn) ---------- */

var MISSED_PUNCH_MESSAGE = 'Ú oà!!! Đi làm mà quên chấm công nè. Mình trừ KPI của bạn rồi. Đừng buồn nhé. Thương.';

function hoursBetween(ngay, vao, ra) {
  var a = parseVN(ngay + ' ' + vao), b = parseVN(ngay + ' ' + ra);
  if (!a || !b) return '';
  if (b < a) b += 86400000;
  return Math.round((b - a) / 36000) / 100;
}

function scheduleHours(ngay, bd, kt) {
  if (!bd || !kt) return 0;
  return hoursBetween(ngay, bd, kt) || 0;
}

// annualMissedBefore = số lần quên ca lịch TRƯỚC ca đang xét (0-based).
// exceptionMissedBefore = số Exception thiếu đầu chấm TRƯỚC ca đang xét trong tháng (0-based).
function evaluateAttendanceShift(s, annualMissedBefore, exceptionMissedBefore) {
  annualMissedBefore = Number(annualMissedBefore || 0);
  exceptionMissedBefore = Number(exceptionMissedBefore || 0);
  var no = { hours: '', result: 'Không tính công', reason: '', kpi: 'Không', kpiReason: '', leave: 'Không' };
  if (s.isException) {
    if (s.hasIn && s.hasOut) {
      return { hours: hoursBetween(s.ngay, s.vao, s.ra), result: 'Chờ duyệt Exception', reason: 'Ca đột xuất chờ quản lý duyệt', kpi: 'Không', kpiReason: '', leave: 'Không' };
    }
    if (exceptionMissedBefore >= 3) {
      no.reason = 'Exception thiếu chấm lần thứ ' + (exceptionMissedBefore + 1) + ' trong tháng — không tính giờ';
      return no;
    }
    no.result = 'Chờ duyệt Exception';
    no.reason = 'Chờ duyệt — thiếu ' + (s.hasIn ? 'CHECK OUT' : 'CHECK IN') + ' Exception (lần ' + (exceptionMissedBefore + 1) + '/3 trong tháng)';
    return no;
  }
  if (s.absent) {
    if (s.absent === 'Vắng không báo') {
      no.reason = 'Nghỉ không báo'; no.kpi = 'Có'; no.kpiReason = 'Nghỉ không báo'; return no;
    }
    var reason = s.absentReason || 'Vắng';
    var late = Number(s.reportedLate || 0);
    if (reason.indexOf('Phụ huynh xin nghỉ') === 0) { no.reason = 'Phụ huynh xin nghỉ'; return no; }
    if (late > 0) {
      no.reason = reason + ' — báo vắng trễ ' + late + ' phút'; no.kpi = 'Có'; no.kpiReason = 'Báo vắng trễ ' + late + ' phút';
      if (reason === 'Ốm / việc gia đình') no.leave = 'Trừ phép';
      return no;
    }
    no.reason = reason + ' — báo trước';
    if (reason === 'Ốm / việc gia đình') no.leave = 'Trừ phép';
    return no;
  }
  if (s.hasIn && s.hasOut) {
    var hours = hoursBetween(s.ngay, s.vao, s.ra);
    var lateMin = Number(s.lateMin || 0);
    return { hours: hours, result: 'Tính theo giờ thực tế', reason: lateMin ? 'Đi trễ ' + lateMin + ' phút' : 'Đã có mặt', kpi: lateMin ? 'Có' : 'Không', kpiReason: lateMin ? 'Đi trễ ' + lateMin + ' phút' : '', leave: 'Không' };
  }
  if (s.hasIn || s.hasOut) {
    if (annualMissedBefore >= 4) {
      no.reason = 'Thiếu ' + (s.hasIn ? 'OUT' : 'IN') + ' — đã dùng hết 4 lần miễn trừ'; no.kpi = 'Có'; no.kpiReason = MISSED_PUNCH_MESSAGE; return no;
    }
    return { hours: '', result: 'Không tính công', reason: 'Thiếu ' + (s.hasIn ? 'OUT' : 'IN') + ' — lần ' + (annualMissedBefore + 1) + '/4, chờ quản lý kiểm tra', kpi: 'Không', kpiReason: '', leave: 'Không' };
  }
  no.reason = 'Chưa có dữ liệu chấm công';
  return no;
}

function getWeekStart(ngay) {
  var d = parseVNDate(ngay), dow = d.getDay(), delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
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
  sh.appendRow(['Mã NV', 'Họ và tên', 'Tổng giờ', 'Giờ tăng cường', 'Số ca', 'Trễ IN', 'Quên IN', 'Quên OUT', 'Vắng có phép', 'Vắng không báo', 'KPI (%)']);
  
  var summaryRows = [];
  list.forEach(function (n) {
    var r = getBaoCaoThang(n.ma, thangStr);
    summaryRows.push([r.ma, n.ten, r.tongGio, r.gioTangCuong, r.soCa, r.soLanTreThucTe, r.soLanQuenIN, r.soLanQuenRA, r.soVangCoPhep, r.soVangKhongBao, r.kpi]);
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
      if (loai === 'VẮNG' && tre > 0 && note.indexOf('Phụ huynh xin nghỉ') !== 0) {
        errRows.push([ngay, ma, ten, ca, 'Đi làm trễ (báo vắng muộn)', tre + 'p', note]);
      }
      // B6: VẮNG đúng giờ chỉ nằm ở bảng tổng hợp, KHÔNG ghi vào bảng lỗi.
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
    
    // 2. Quên OUT: Gom theo ngày+mã để tìm IN không có OUT
    var byDayMa = {};
    for (var i = 1; i < v.length; i++) {
      if (!v[i][0]) continue;
      var ngay = ngayCuaO(vN[i][2]);
      var month = thangCuaO(vN[i][2]);
      if (month !== thangStr) continue;
      var ma = String(v[i][0]).trim();
      var key = ngay + '|' + ma;
      if (!byDayMa[key]) byDayMa[key] = [];
      byDayMa[key].push({
        ma: ma, ten: String(v[i][1]), ca: String(v[i][3]), loai: String(v[i][4]),
        gioIn: v[i][5], gioOut: v[i][6], note: String(v[i][8])
      });
    }
    for (var key in byDayMa) {
      var rows = byDayMa[key];
      var ngay = key.split('|')[0];
      var openIn = null;
      rows.forEach(function (r) {
        if (r.loai === 'IN') {
          if (openIn) {
            // IN mới mà chưa OUT lần trước → ghi lỗi cho lần trước
            errRows.push([ngay, openIn.ma, openIn.ten, openIn.ca, 'Quên check out', '', openIn.note]);
          }
          openIn = r;
        } else if (r.loai === 'OUT' && openIn) {
          openIn = null;
        }
      });
      if (openIn) {
        errRows.push([ngay, openIn.ma, openIn.ten, openIn.ca, 'Quên check out', '', openIn.note]);
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
    
    // 2. Chốt cả lịch làm để tháng cũ không bị lệch theo lịch hiện tại.
    var shLich = ss.getSheetByName('LICHLAM');
    var newLichName = 'LICHLAM - Tháng ' + thangFile;
    if (!shLich) return { ok: false, msg: 'Thiếu LICHLAM; chưa thể chốt đủ hai bản.' };
    if (!ss.getSheetByName(newLichName)) shLich.copyTo(ss).setName(newLichName);

    // Chỉ giữ hai bản chốt. Không tạo thêm sheet báo cáo/lỗi và không xóa CHECK IN;
    // báo cáo hiện hành vẫn có thể đọc lịch sử.

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
  var lyDoNhap = String(p.lyDo || '').trim();
  if (!lyDoNhap) return { ok: false, msg: 'Vui lòng chọn hoặc ghi lý do vắng.' };
  var lyDoMacDinh = ['Phụ huynh xin nghỉ lớp', 'Nghỉ phép (Đã báo trước)'];
  if (lyDoMacDinh.indexOf(lyDoNhap) < 0 && lyDoNhap.length > 200) return { ok: false, msg: 'Lý do vắng tối đa 200 ký tự.' };

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

  var lyDo = lyDoNhap;
  var baoTruoc = treVang === 0;
  var ghiChu = lyDo + (baoTruoc && lyDo === 'Nghỉ phép (Đã báo trước)' ? ' | Trừ phép' : baoTruoc && lyDo === 'Phụ huynh xin nghỉ lớp' ? ' | PH xin nghỉ — báo trước' : '') + ' (Báo vắng từ xa: ' + fmtDT(gioBao) + ')';
  if (treVang > 0) ghiChu += ' | Báo vắng trễ ' + treVang + ' phút';
  // Nghỉ phép báo trước hoặc phụ huynh xin nghỉ lớp báo trước không ảnh hưởng KPI; báo trễ vẫn có phút trễ để báo cáo xử lý.

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
