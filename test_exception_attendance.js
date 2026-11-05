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
      formatDate: (d, tz, f) => {
        const p = n => String(n).padStart(2, '0');
        if (f === 'dd/MM/yyyy') return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
        if (f === 'HH:mm') return `${p(d.getHours())}:${p(d.getMinutes())}`;
        if (f === 'dd/MM/yyyy HH:mm:ss') return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        if (f === 'yyyyMMdd_HHmmss') return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
        return '';
      },
      getUuid: () => 'uuid', base64Decode: () => [], newBlob: () => ({})
    },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => ({ createFile: () => ({ getUrl: () => 'file-url' }) }) }) }
  };
  vm.createContext(s); vm.runInContext(code, s); s.guiAnhTelegram = () => 'ok'; return { s, rows };
}

let env = sandbox([header, ['DA','Đức Anh',day,'Ca Exception — Dạy bù','EXCEPTION_IN','16:30','','0','Exception | Dạy bù | ID:EX-DA']]);
let s = env.s;
assert.equal(s.getExceptionStatus('DA').open, true, 'same-day Exception IN must show as open');
let r = s.submitCheckin({ma:'DA',ten:'Đức Anh',lat:11.937044,lng:108.444760,photo:'x',type:'IN',caLabel:'Ca dạy 17:45-19:15',submitTs:new Date(2026,10,5,17,45).getTime()});
assert.equal(r.ok, true, 'regular IN must succeed while auto-closing a same-day Exception');
assert.equal(r.autoExceptionOut, true);
assert.equal(r.exceptionInTime, '16:30');
assert.equal(env.rows.length, 4, 'must write Exception OUT then regular IN');
assert.equal(env.rows[2][4], 'EXCEPTION_OUT');
assert.equal(env.rows[2][6], '17:45');
assert.match(env.rows[2][8], /Hệ thống tự RA/);
assert.equal(env.rows[3][4], 'IN');
assert.equal(env.rows[3][5], '17:45');
assert.match(env.rows[3][8], /hệ thống tự RA Exception/i);

env = sandbox([header, ['DA','Đức Anh',day,'Ca Exception — Dạy bù','EXCEPTION_IN','16:30','','0','Exception | Dạy bù | ID:EX-DA'], ['DA','Đức Anh',day,'Ca Exception — Dạy bù','EXCEPTION_OUT','','18:00','0','Exception | Dạy bù | ID:EX-DA']]);
s = env.s;
assert.equal(s.getExceptionStatus('DA').open, false, 'same-day Exception OUT must close the Exception');
r = s.submitCheckin({ma:'DA',ten:'Đức Anh',lat:11.937044,lng:108.444760,photo:'x',type:'IN',caLabel:'Ca dạy 17:45-19:15',submitTs:new Date(2026,10,5,18,1).getTime()});
assert.equal(r.autoExceptionOut, false, 'closed Exception must not be closed again');

env = sandbox([header, ['DA','Đức Anh','04/11/2026','Ca Exception — Dạy bù','EXCEPTION_IN','16:30','','0','Exception | Dạy bù | ID:EX-YESTERDAY']]);
s = env.s;
assert.equal(s.getExceptionStatus('DA').open, false, 'yesterday Exception must not affect today');
console.log('PASS exception attendance: same-day open state, automatic Exception OUT, closed and prior-day Exceptions');
