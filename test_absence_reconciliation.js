const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const CHECK_HEADER = ['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú'];
// Core schedule columns deliberately reordered; auxiliary Online is also present.
const SCHEDULE_HEADER = ['Mã NV','Họ tên','Online','Ngày','Ca','Giờ kết thúc','Giờ bắt đầu'];
const employee = 'NV0204';

function day(date) { return new Date(date + 'T00:00:00'); }
function row(date, ca, type, time) {
  return [employee,'Ms. Vân Anh',day(date),ca,type,type === 'IN' ? time : '',type === 'OUT' ? time : '',0,''];
}
function schedule(date, ca, start, end, online) {
  return [employee,'Ms. Vân Anh',online || false,day(date),ca,end,start];
}
function makeRuntime(lich, check) {
  const pad = n => String(n).padStart(2, '0');
  const display = rows => rows.map(r => r.map(v => v instanceof Date ? `${pad(v.getDate())}/${pad(v.getMonth()+1)}/${v.getFullYear()}` : v));
  const sheets = {
    LICHLAM: { getLastRow: () => lich.length, getDataRange: () => ({ getDisplayValues: () => display(lich), getValues: () => lich }) },
    'CHECK IN': { getLastRow: () => check.length, getDataRange: () => ({ getDisplayValues: () => display(check), getValues: () => check }) }
  };
  const context = {
    Date, Math, Number, String, Object, Array, RegExp, JSON, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n], getSheets: () => Object.values(sheets) }) },
    Utilities: { formatDate: (d, tz, format) => {
      if (format === 'dd/MM/yyyy') return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
      if (format === 'MM/yyyy') return `${pad(d.getMonth()+1)}/${d.getFullYear()}`;
      if (format === 'HH:mm') return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return '';
    } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), context);
  return context;
}

const scheduleRows = [SCHEDULE_HEADER,
  schedule('2026-11-02','Cả ngày','08:00','16:30'),
  schedule('2026-11-04','Cả ngày','08:00','16:30'),
  schedule('2026-11-07','Sáng','07:30','12:00'),
  schedule('2026-11-07','Chiều','14:30','19:15'),
  schedule('2026-11-08','Sáng','07:30','12:00'),
  schedule('2026-11-08','Chiều','14:30','19:15')
];
const checkRows = [CHECK_HEADER,
  row('2026-11-02','Cả ngày 08:00-16:30','IN','07:57'), row('2026-11-02','Cả ngày 08:00-16:30','OUT','17:51'),
  row('2026-11-04','Cả ngày 08:00–16:30','IN','07:59'), row('2026-11-04','Cả ngày 08:00–16:30','OUT','19:24'),
  row('2026-11-07','Sáng 07:30-12:00','IN','07:29'), row('2026-11-07','Sáng 07:30-12:00','OUT','12:00'),
  row('2026-11-07','Chiều 14:30-19:15','IN','14:30'), row('2026-11-07','Chiều 14:30-19:15','OUT','18:18'),
  row('2026-11-08','Sáng 07:30-12:00','IN','07:29'), row('2026-11-08','Sáng 07:30-12:00','OUT','12:01'),
  row('2026-11-08','Chiều 14:30-19:15','IN','14:31'), row('2026-11-08','Chiều 14:30-19:15','OUT','19:28')
];
const app = makeRuntime(scheduleRows, checkRows);
const result = {soVangKhongBao: 0, soLanTre: 0, vangKhongBaoChiTiet: []};
app.tinhVangKhongBao(employee, '11/2026', result);
assert.equal(result.soVangKhongBao, 0, 'completed shifts must never be marked absent when schedule columns are reordered');

const missing = checkRows.filter(r => !(r[2] instanceof Date) || !(r[2].getDate() === 8 && String(r[3]).startsWith('Chiều')));
const appMissing = makeRuntime(scheduleRows, missing);
const resultMissing = {soVangKhongBao: 0, soLanTre: 0, vangKhongBaoChiTiet: []};
appMissing.tinhVangKhongBao(employee, '11/2026', resultMissing);
assert.equal(resultMissing.soVangKhongBao, 1, 'only the missing afternoon shift must be absent');
assert.equal(resultMissing.vangKhongBaoChiTiet[0].ca, 'Chiều');
console.log('PASS absence reconciliation: reordered schedule, completed pairs, and one missing shift');
