const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
const hdr = ['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú','Ảnh','Khoảng cách','Thiết bị'];
const approvalHdr = ['Mã NV','Họ tên','Lý do Exception','VÀO','RA','Ngày','Tổng giờ','Quyết định','Ghi chú quản lý','Người duyệt','Ảnh minh chứng','Duyệt lúc','ID Exception'];
function sheet(name, rows) {
  return {
    name, rows,
    getName() { return name; }, getLastRow() { return rows.length; }, getLastColumn() { return Math.max(...rows.map(r=>r.length), 0); }, setFrozenRows() {}, hideColumns() {}, clear() { rows.splice(0); },
    getDataRange() { return { getDisplayValues: () => rows, getValues: () => rows }; },
    appendRow(row) { rows.push(row); },
    getRange(row, col, numRows=1, numCols=1) { return { getDisplayValues() { return Array.from({length:numRows},(_,i)=>Array.from({length:numCols},(_,j)=>(rows[row-1+i]||[])[col-1+j]||'')); }, setValue(value) { (rows[row-1]||(rows[row-1]=[]))[col-1]=value; }, setValues(values) { for (let i = 0; i < numRows; i++) rows[row - 1 + i] = values[i]; }, setDataValidation() {} }; }
  };
}
function env() {
  const sheets = {
    'CHECK IN': sheet('CHECK IN', [hdr,
      ['001','An','05/11/2026','Ca đột xuất — Dạy bù','EXCEPTION_IN','08:00','','0','Exception | Dạy bù | ID:EX-ONE'],
      ['001','An','05/11/2026','Ca đột xuất — Dạy bù','EXCEPTION_OUT','','10:00','0','Exception | Dạy bù | ID:EX-ONE'],
      ['002','Bình','06/11/2026','Ca đột xuất — Họp','EXCEPTION_IN','13:00','','0','Exception | Họp | ID:EX-TWO'],
      ['002','Bình','06/11/2026','Ca đột xuất — Họp','EXCEPTION_OUT','','15:30','0','Exception | Họp | ID:EX-TWO']
    ]),
    'LICHLAM': sheet('LICHLAM', [['Mã NV','Họ tên','Ngày','Ca','Bắt đầu','Kết thúc']]),
    'DANHSACH': sheet('DANHSACH', [['Mã NV','Họ tên','Vai trò'],['001','An','GV'],['002','Bình','GV']])
  };
  const ss = { getSheetByName: n => sheets[n] || null, getSheets: () => Object.values(sheets), insertSheet(n) { return sheets[n] = sheet(n, []); } };
  const context = { Date, Math, Number, String, Object, Array, RegExp, JSON, Error,
    Logger:{log(){}}, SpreadsheetApp:{getActiveSpreadsheet:()=>ss, newDataValidation:()=>({requireValueInList(){return this},build(){return {}}})},
    Utilities:{formatDate:(d,t,f) => f === 'dd/MM/yyyy HH:mm:ss' ? '06/11/2026 12:00:00' : f === 'dd/MM/yyyy' ? '06/11/2026' : '', getUuid:()=> 'uuid'},
  };
  vm.createContext(context); vm.runInContext(code, context); return { context, sheets };
}
let e = env();
let list = e.context.getExceptionApprovals('11/2026');
assert.deepEqual(JSON.parse(JSON.stringify(list.map(x => [x.id, x.status, x.hours]))), [['EX-ONE','Chờ duyệt',2],['EX-TWO','Chờ duyệt',2.5]]);
let result = {ok:true}; e.context.dongBoDuyetException();
e.sheets['DUYET_EXCEPTION'].rows[1][7] = 'Đã duyệt tính giờ'; e.sheets['DUYET_EXCEPTION'].rows[1][8] = 'Đủ ảnh và GPS';
assert.equal(result.ok, true);
assert.equal(e.sheets['DUYET_EXCEPTION'].rows.length, 3, 'sync creates two exception rows');
assert.deepEqual(JSON.parse(JSON.stringify(e.sheets['DUYET_EXCEPTION'].rows[0])), approvalHdr);
assert.equal(e.sheets['DUYET_EXCEPTION'].rows[1][12], 'EX-ONE');
assert.equal(e.sheets['DUYET_EXCEPTION'].rows.length, 3, 'sync remains idempotent');
assert.equal(e.context.getExceptionApprovals('11/2026')[0].status, 'Đã duyệt tính giờ');
e.sheets['DUYET_EXCEPTION'].rows[2][7] = 'Không duyệt'; e.sheets['DUYET_EXCEPTION'].rows[2][8] = 'Không có xác nhận quản lý';
assert.equal(e.context.getExceptionApprovals('11/2026')[1].status, 'Không duyệt');
assert.equal(e.context.getExceptionPendingCount().count, 0, 'approval sheet reports no pending rows after decisions');
let payroll = e.context.getPayrollWorkbookData('11/2026');
let approved = payroll.detailRows.find(r => r[0] === 'EX-ONE'), rejected = payroll.detailRows.find(r => r[0] === 'EX-TWO');
assert.equal(approved[10], 'Tính theo giờ Exception đã duyệt');
assert.equal(approved[18], 'Đã duyệt tính giờ');
assert.equal(rejected[10], 'Không tính công');
assert.equal(rejected[18], 'Không duyệt');
console.log('PASS exception approval: list paired shifts, idempotent dedicated decisions, and payroll distinction');
