const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('Code.gs', 'utf8');
const day = '05/11/2026';
const header = ['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú','Ảnh','Khoảng cách','Thiết bị'];

function sandbox(rows) {
  const sheet = {
    getLastRow: () => rows.length,
    getDataRange: () => ({ getDisplayValues: () => rows, getValues: () => rows }),
    appendRow: (r) => rows.push(r)
  };
  const s = {
    Date, Math, Number, String, Object, Array, RegExp, JSON, Error,
    Logger: { log() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
    Utilities: {
      formatDate: (d, tz, f) => f === 'dd/MM/yyyy' ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '',
      getUuid: () => 'uuid', base64Decode: () => [], newBlob: () => ({})
    },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => ({ createFile: () => ({ getUrl: () => 'file-url' }) }) }) }
  };
  vm.createContext(s); vm.runInContext(code, s); s.guiAnhTelegram = () => 'ok'; return s;
}

let s = sandbox([header, ['DA','Đức Anh',day,'Ca Exception — Dạy bù','EXCEPTION_IN','16:30','','0','Exception | Dạy bù | ID:EX-DA']]);
assert.equal(s.getExceptionStatus('DA').open, true, 'same-day Exception IN must show as open');
let r = s.submitCheckin({ma:'DA',ten:'Đức Anh',lat:11.937044,lng:108.444760,photo:'x',type:'IN',caLabel:'Ca dạy 17:45-19:15',submitTs:new Date(2026,10,5,17,45).getTime()});
assert.equal(r.ok, false, 'must block regular IN while Exception is open');
assert.match(r.msg, /Exception chưa RA/);

s = sandbox([header, ['DA','Đức Anh',day,'Ca Exception — Dạy bù','EXCEPTION_IN','16:30','','0','Exception | Dạy bù | ID:EX-DA'], ['DA','Đức Anh',day,'Ca Exception — Dạy bù','EXCEPTION_OUT','','18:00','0','Exception | Dạy bù | ID:EX-DA']]);
assert.equal(s.getExceptionStatus('DA').open, false, 'same-day Exception OUT must close the Exception');
r = s.submitCheckin({ma:'DA',ten:'Đức Anh',lat:11.937044,lng:108.444760,photo:'x',type:'IN',caLabel:'Ca dạy 17:45-19:15',submitTs:new Date(2026,10,5,18,1).getTime()});
assert.notEqual(r.msg && r.msg.indexOf('Exception chưa RA') >= 0, true, 'closed Exception must not trigger the blocking message');

s = sandbox([header, ['DA','Đức Anh','04/11/2026','Ca Exception — Dạy bù','EXCEPTION_IN','16:30','','0','Exception | Dạy bù | ID:EX-YESTERDAY']]);
assert.equal(s.getExceptionStatus('DA').open, false, 'yesterday Exception must not affect today');
console.log('PASS exception attendance: same-day open state, regular-IN block, closed and prior-day Exceptions');
