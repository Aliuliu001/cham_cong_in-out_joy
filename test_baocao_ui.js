const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/BaoCao.html', 'utf8');
assert.match(html, /id="btnBaoCaoSheet"/);
assert.match(html, /onclick="xuatBaoCaoThang\(\)"/);
assert.match(html, /id="tabTuan"/);
assert.match(html, /getBaoCaoGioTuan/);
assert.match(html, /window\.open\('', '_blank'/);
assert.match(html, /id="kqDuyetException"/);
assert.match(html, /getExceptionPendingCount/);
assert.doesNotMatch(html, /decideExceptionApproval/);
const nodes = new Map();
function element() { return { _text: '', innerHTML: '', style: {}, children: [], disabled: false, dataset: {},
  set textContent(v) { this._text = v; this.innerHTML = ''; this.children = []; },
  get textContent() { return this._text; }, appendChild(child) { this.children.push(child); }
}; }
function get(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }
const calls = [], confirms = [], opened = [];
const popup = { location: { href: '' }, closeCalled: false, close() { this.closeCalled = true; } };
const context = {
  document: { getElementById: get, createElement: element },
  window: { open: (...args) => { opened.push(args); return popup; } }, Date,
  confirm: () => confirms.shift() ?? false,
  google: { script: { run: {
    withSuccessHandler(success) { return { withFailureHandler(failure) { return new Proxy({}, { get(_, method) { return (...args) => calls.push({ method, args, success, failure }); } }); } }; }
  } } }
};
vm.createContext(context);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
get('thang').value = '13/2026';
context.taiBangLuong(); context.xuatBaoCaoThang(); context.chotThang(); context.xemThang();
assert.equal(calls.length, 0);
assert.match(get('statusExcel').textContent, /MM\/yyyy/);
get('thang').value = '10/2026';
context.taiBangLuong(); context.taiBangLuong();
assert.equal(opened.length, 2, 'each user click opens a blank window synchronously; duplicate is immediately closed');
assert.equal(popup.closeCalled, true, 'duplicate click closes its blank popup');
popup.closeCalled = false;
assert.equal(calls.length, 1, 'double click must only create one file');
assert.equal(calls[0].method, 'exportPayrollAttendanceXlsx');
assert.equal(get('btnExcelLuong').disabled, true);
assert.match(get('statusExcel').textContent, /Đang tạo file Excel/);
calls.shift().success({url:'https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx', filename:'export.xlsx'});
assert.equal(get('btnExcelLuong').disabled, false);
assert.equal(popup.location.href, 'https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx');
assert.equal(get('excelLinks').children.length, 1, 'a visible fallback link remains available');
assert.match(get('statusExcel').textContent, /đang mở|đã mở/i);
context.taiBangLuong();
assert.equal(opened.length, 3, 'cached same-month source opens directly in its synchronously opened window');
get('thang').value = '11/2026'; context.taiBangLuong();
assert.equal(calls.length, 1, 'new month must build a new file, not reuse old month');
assert.equal(calls[0].args[0], '11/2026');
calls.shift().failure({message:'thiếu LICHLAM'});
assert.match(get('statusExcel').textContent, /thiếu LICHLAM/);
assert.equal(get('btnExcelLuong').disabled, false);
confirms.push(false); context.xuatBaoCaoThang(); assert.equal(calls.length, 0);
confirms.push(true); context.xuatBaoCaoThang();
assert.equal(calls[0].method, 'xuatBaoCaoSheet');
assert.equal(calls[0].args[0], '11/2026');
assert.equal(get('btnBaoCaoSheet').disabled, true);
calls.shift().success({ok:true,msg:'Đã ghi'});
assert.match(get('statusBaoCaoSheet').textContent, /Đã ghi/);
assert.equal(get('btnBaoCaoSheet').disabled, false);
confirms.push(true); context.chotThang();
assert.equal(calls[0].method, 'chotThangAnToan');
assert.equal(calls[0].args[1], false);
console.log('PASS test_baocao_ui: separate Sheet export, popup-first Excel, weekly tab, and month close');
