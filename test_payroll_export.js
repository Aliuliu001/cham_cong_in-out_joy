// Regression tests for the read-only payroll attendance export.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function sheet(rows) {
  return {
    getLastRow: () => rows.length,
    getDataRange: () => ({
      getDisplayValues: () => rows.map(r => r.map(v => v instanceof Date ? `${String(v.getDate()).padStart(2, '0')}/${String(v.getMonth() + 1).padStart(2, '0')}/${v.getFullYear()}` : String(v ?? ''))),
      getValues: () => rows
    })
  };
}
function runExport(sheets, month) {
  const sandbox = {
    console, Date, Math, Number, String, Object, Array, RegExp, JSON, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null }) },
    Utilities: { formatDate: (d, tz, pattern) => {
      const p = n => String(n).padStart(2, '0');
      if (pattern === 'dd/MM/yyyy') return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
      if (pattern === 'MM/yyyy') return `${p(d.getMonth() + 1)}/${d.getFullYear()}`;
      if (pattern === 'HH:mm') return `${p(d.getHours())}:${p(d.getMinutes())}`;
      return '';
    } }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), sandbox);
  return sandbox.getPayrollAttendanceRows(month);
}

const header = ['Mã NV', 'Họ và tên', 'Ngày', 'Ca', 'Loại IN/OUT', 'Giờ check in', 'Giờ check out', 'Trễ (phút)', 'Ghi chú'];
const schedule = [
  ['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc'],
  ['NV001', 'An', 'Cả tuần', 'Ca sáng', '08:00', '12:00']
];
const live = [header, ['NV001', 'An', new Date(2026, 9, 5), 'Ca sáng', 'IN', '08:00', '', '0', 'Dữ liệu đang chạy']];
const closed = [header, ['NV001', 'An', new Date(2026, 9, 5), 'Ca sáng', 'IN', '08:19', '', '19', 'Dữ liệu đã chốt'], ['NV001', 'An', new Date(2026, 9, 6), 'Ca sáng', 'OUT', '', '12:00', '0', 'Chỉ OUT']];

// A closed month must read its immutable monthly copy, never the live sheet.
let rows = runExport({ 'CHECK IN': sheet(live), 'CHECK IN - Tháng 10-2026': sheet(closed), LICHLAM: sheet(schedule) }, '10/2026');
let row = rows.find(r => r[2] === '05/10/2026');
assert.equal(row[4], '08:19');
assert.equal(row[7], 19);
assert.equal(row[11], 'Dữ liệu đã chốt');
row = rows.find(r => r[2] === '06/10/2026');
assert.deepEqual(Array.from(row.slice(6, 11)), ['OUT', 0, 'Thiếu IN', '', 'Không']);

// Without a closed copy, the current CHECK IN sheet is the source.
rows = runExport({ 'CHECK IN': sheet(live), LICHLAM: sheet(schedule) }, '10/2026');
row = rows.find(r => r[2] === '05/10/2026');
assert.equal(row[4], '08:00');
assert.equal(row[11], 'Dữ liệu đang chạy');

// Mandatory status / threshold cases.  The scheduled shift has already ended in 2026.
const cases = [header,
  ['NV001', 'An', new Date(2026, 9, 5), 'Ca sáng', 'IN', '08:00', '', '0', ''],
  ['NV001', 'An', new Date(2026, 9, 5), 'Ca sáng', 'OUT', '', '12:00', '0', ''],
  ['NV002', 'Bình', new Date(2026, 9, 6), 'Ca sáng', 'IN', '08:19', '', '19', ''],
  ['NV002', 'Bình', new Date(2026, 9, 6), 'Ca sáng', 'OUT', '', '12:00', '0', ''],
  ['NV003', 'Chi', new Date(2026, 9, 7), 'Ca sáng', 'IN', '08:20', '', '20', ''],
  ['NV003', 'Chi', new Date(2026, 9, 7), 'Ca sáng', 'OUT', '', '12:00', '0', ''],
  ['NV004', 'Dung', new Date(2026, 9, 8), 'Ca sáng', 'IN', '08:00', '', '0', ''],
  ['NV005', 'Em', new Date(2026, 9, 9), 'Ca sáng', 'OUT', '', '12:00', '0', ''],
  ['NV006', 'Giang', new Date(2026, 9, 10), 'Ca sáng', 'VẮNG', '', '', '0', 'DUYỆT BÙ: ốm']
];
const scheduleAll = [['Mã NV', 'Họ tên', 'Ngày', 'Ca', 'Giờ bắt đầu', 'Giờ kết thúc'],
  ['NV001', 'An', '05/10/2026', 'Ca sáng', '08:00', '12:00'],
  ['NV002', 'Bình', '06/10/2026', 'Ca sáng', '08:00', '12:00'],
  ['NV003', 'Chi', '07/10/2026', 'Ca sáng', '08:00', '12:00'],
  ['NV004', 'Dung', '08/10/2026', 'Ca sáng', '08:00', '12:00'],
  ['NV005', 'Em', '09/10/2026', 'Ca sáng', '08:00', '12:00'],
  ['NV006', 'Giang', '10/10/2026', 'Ca sáng', '08:00', '12:00'],
  ['NV007', 'Hà', '11/10/2026', 'Ca sáng', '08:00', '12:00']];
rows = runExport({ 'CHECK IN': sheet(cases), LICHLAM: sheet(scheduleAll) }, '10/2026');
const byId = id => rows.find(r => r[0] === id);
assert.deepEqual(Array.from(byId('NV001').slice(6, 11)), ['IN/OUT', 0, 'Đủ ca', 4, 'Có']);
assert.equal(byId('NV002')[10], 'Có'); // 19 minutes late still qualifies
assert.equal(byId('NV003')[10], 'Không'); // exactly 20 does not qualify
assert.deepEqual(Array.from(byId('NV004').slice(6, 11)), ['IN', 0, 'Thiếu OUT', '', 'Không']);
assert.deepEqual(Array.from(byId('NV005').slice(6, 11)), ['OUT', 0, 'Thiếu IN', '', 'Không']);
assert.deepEqual(Array.from(byId('NV006').slice(6, 11)), ['Vắng', 0, 'Vắng', '', 'Không']);
assert.equal(byId('NV006')[11], 'DUYỆT BÙ: ốm');
assert.deepEqual(Array.from(byId('NV007').slice(6, 11)), ['Vắng không báo', 0, 'Vắng không báo', '', 'Không']);
assert.match(byId('NV007')[11], /Vắng không báo/);

// New payroll contract: actual hours, 4 annual exemptions, leave and Exception.
assert.equal(typeof runExport, 'function');
const sandboxForRules = {};
(function loadRules() {
  const sandbox = { console, Date, Math, Number, String, Object, Array, RegExp, JSON, Error };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), sandbox);
  sandboxForRules.evaluateAttendanceShift = sandbox.evaluateAttendanceShift;
  sandboxForRules.getWeekStart = sandbox.getWeekStart;
})();
assert.equal(typeof sandboxForRules.evaluateAttendanceShift, 'function', 'evaluateAttendanceShift must be exported');
let ev = sandboxForRules.evaluateAttendanceShift({hasIn:true, hasOut:true, vao:'08:10', ra:'11:00', ngay:'05/11/2026', lateMin:10, scheduleHours:4}, 0);
assert.deepEqual(JSON.parse(JSON.stringify(ev)), {hours:2.83, result:'Tính theo giờ thực tế', reason:'Đi trễ 10 phút', kpi:'Có', kpiReason:'Đi trễ 10 phút', leave:'Không'});
ev = sandboxForRules.evaluateAttendanceShift({hasIn:true, hasOut:false, ngay:'05/11/2026', scheduleHours:4}, 1);
assert.equal(ev.result, 'Không tính công');
assert.equal(ev.hours, '');
assert.match(ev.reason, /2\/4, chờ quản lý kiểm tra/);
ev = sandboxForRules.evaluateAttendanceShift({hasIn:false, hasOut:true, ngay:'05/11/2026', scheduleHours:4}, 4);
assert.equal(ev.result, 'Không tính công');
assert.equal(ev.kpi, 'Có');
assert.match(ev.kpiReason, /Ú oà!!!/);
ev = sandboxForRules.evaluateAttendanceShift({absent:'Vắng', absentReason:'Ốm / việc gia đình', reportedLate:0}, 0);
assert.deepEqual(JSON.parse(JSON.stringify(ev)), {hours:'', result:'Không tính công', reason:'Ốm / việc gia đình — báo trước', kpi:'Không', kpiReason:'', leave:'Trừ phép'});
ev = sandboxForRules.evaluateAttendanceShift({absent:'Vắng không báo'}, 0);
assert.equal(ev.kpi, 'Có');
assert.equal(ev.kpiReason, 'Nghỉ không báo');
ev = sandboxForRules.evaluateAttendanceShift({isException:true, hasIn:true, hasOut:true, vao:'08:10', ra:'11:00', ngay:'05/11/2026'}, 0, 0);
assert.equal(ev.result, 'Chờ duyệt Exception');
assert.equal(ev.hours, 2.83);
ev = sandboxForRules.evaluateAttendanceShift({isException:true, hasIn:true, hasOut:false, ngay:'05/11/2026'}, 0, 3);
assert.equal(ev.result, 'Không tính công');
assert.match(ev.reason, /lần thứ 4/);
assert.equal(sandboxForRules.getWeekStart('05/11/2026'), '02/11/2026');

console.log('PASS: archived/current source selection and payroll attendance rules');
