const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/BaoCao.html', 'utf8');
assert.equal((html.match(/onclick="taiBangLuong\(\)"/g) || []).length, 1);
for (const removed of ['Xem trước dữ liệu', 'btnPreviewLuong', 'previewPayrollWorkbook', 'Tải CSV cũ', 'Tải bảng gọn', 'Xuất về Sheet BAOCAO_THANG']) assert.ok(!html.includes(removed), removed);
assert.match(html, /id="btnChotThang"/);
const nodes = new Map();
function element() { return { _text: '', innerHTML: '', style: {}, children: [], disabled: false, dataset: {},
  set textContent(v) { this._text = v; this.innerHTML = ''; this.children = []; },
  get textContent() { return this._text; }, appendChild(child) { this.children.push(child); }
}; }
function get(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }
const calls = [], confirms = [], opened = [];
const context = {
  document: { getElementById: get, createElement: element },
  window: { open: (...args) => opened.push(args) }, Date,
  confirm: () => confirms.shift() ?? false,
  google: { script: { run: {
    withSuccessHandler(success) { return { withFailureHandler(failure) { return new Proxy({}, { get(_, method) { return (...args) => calls.push({ method, args, success, failure }); } }); } }; }
  } } }
};
vm.createContext(context);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
get('thang').value = '13/2026';
context.taiBangLuong(); context.chotThang(); context.xemThang();
assert.equal(calls.length, 0);
assert.match(get('statusExcel').textContent, /MM\/yyyy/);
get('thang').value = '10/2026';
context.taiBangLuong(); context.taiBangLuong();
assert.equal(calls.length, 1, 'double click must only create one file');
assert.equal(calls[0].method, 'exportPayrollAttendanceXlsx');
assert.equal(get('btnExcelLuong').disabled, true);
assert.match(get('statusExcel').textContent, /Đang tạo file Excel/);
calls.shift().success({url:'https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx', filename:'export.xlsx'});
assert.equal(get('btnExcelLuong').disabled, false);
assert.equal(get('excelLinks').children.length, 1);
assert.match(get('excelLinks').children[0].href, /format=xlsx$/);
assert.match(get('statusExcel').textContent, /Bấm lại nút xanh/);
assert.match(get('btnExcelLuong').textContent, /Bấm lần nữa/);
context.taiBangLuong();
assert.equal(opened.length, 1, 'second deliberate click must open xlsx URL');
assert.match(opened[0][0], /format=xlsx$/);
get('thang').value = '11/2026'; context.taiBangLuong();
assert.equal(calls.length, 1, 'new month must build a new file, not reuse old month');
assert.equal(calls[0].args[0], '11/2026');
calls.shift().failure({message:'thiếu LICHLAM'});
assert.match(get('statusExcel').textContent, /thiếu LICHLAM/);
assert.equal(get('btnExcelLuong').disabled, false);
confirms.push(false); context.chotThang(); assert.equal(calls.length, 0);
confirms.push(true); context.chotThang();
assert.equal(calls[0].method, 'chotThangAnToan');
assert.equal(calls[0].args[1], false);
console.log('PASS test_baocao_ui: single Excel export, user-initiated download, invalid month and month close');
