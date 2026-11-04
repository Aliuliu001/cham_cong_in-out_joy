const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/BaoCao.html', 'utf8');
assert.equal((html.match(/onclick="taiBangLuong\(\)"/g) || []).length, 1);
for (const old of ['Tải CSV cũ', 'Tải bảng gọn', 'Xuất về Sheet BAOCAO_THANG']) assert.ok(!html.includes(old), old);
assert.match(html, /id="btnChotThang"/);
const nodes = new Map();
function element() { return { _text: '', innerHTML: '', style: {}, children: [], disabled: false,
  set textContent(v) { this._text = v; this.innerHTML = ''; this.children = []; },
  get textContent() { return this._text; }, appendChild(child) { this.children.push(child); },
  click() { throw Error('sandbox blocked automatic download'); } }; }
function get(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }
const calls = [], confirms = [];
const context = {
  document: { getElementById: get, createElement: element },
  window: {}, Date,
  confirm: () => confirms.shift() ?? false,
  google: { script: { run: {
    withSuccessHandler(success) { return { withFailureHandler(failure) { return new Proxy({}, { get(_, method) { return (...args) => calls.push({ method, args, success, failure }); } }); } }; }
  } } }
};
vm.createContext(context);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
get('thang').value = '13/2026';
context.taiBangLuong(); context.xemBangLuong(); context.chotThang(); context.xemThang();
assert.equal(calls.length, 0);
assert.match(get('statusExcel').textContent, /MM\/yyyy/);
get('thang').value = '10/2026';
context.xemBangLuong();
assert.equal(calls[0].method, 'previewPayrollWorkbook');
assert.equal(get('btnPreviewLuong').disabled, true);
assert.match(get('statusPreview').textContent, /Đang đọc/);
const data = { summaryHeaders: ['NV'], summaryRows: [['A']], weekHeaders: ['Tuần'], weekRows: [['40']], detailHeaders: Array.from({length:25}, (_, i) => 'Cột ' + i), detailRows: [Array.from({length:25}, (_, i) => i === 20 ? 'Bản chốt' : i === 21 ? 'Lịch tại thời điểm chốt' : i)] };
calls.shift().success(data);
assert.equal(get('btnPreviewLuong').disabled, false);
assert.match(get('previewLuong').innerHTML, /Cột 24/);
assert.match(get('statusPreview').textContent, /Đã tải 1 ca.*Bản chốt/);
context.xemBangLuong(); calls.shift().success({...data, detailRows: []});
assert.match(get('statusPreview').textContent, /chưa có ca/);
context.xemBangLuong(); calls.shift().failure({message: '<thiếu CHECK IN>'});
assert.match(get('statusPreview').textContent, /thiếu CHECK IN/);
assert.equal(get('previewLuong').innerHTML, '');
context.taiBangLuong(); context.taiBangLuong();
assert.equal(calls.length, 1);
assert.equal(calls[0].method, 'exportPayrollAttendanceXlsx');
assert.equal(get('btnExcelLuong').disabled, true);
assert.match(get('statusExcel').textContent, /Đang tạo Excel/);
calls.shift().success({url:'https://docs.google.com/spreadsheets/d/abc123/export?format=xlsx', filename:'export.xlsx'});
assert.equal(get('btnExcelLuong').disabled, false);
assert.equal(get('excelLinks').children.length, 2);
assert.match(get('excelLinks').children[0].href, /\/edit$/);
assert.match(get('excelLinks').children[1].href, /format=xlsx$/);
assert.match(get('statusExcel').textContent, /Đã tạo file Excel/);
context.taiBangLuong();
assert.equal(get('excelLinks').children.length, 0);
calls.shift().failure({message:'thiếu LICHLAM'});
assert.match(get('statusExcel').textContent, /thiếu LICHLAM/);
assert.equal(get('btnExcelLuong').disabled, false);
assert.equal(get('btnChotThang').disabled, false);
confirms.push(false); context.chotThang(); assert.equal(calls.length, 0);
confirms.push(true); context.chotThang();
assert.equal(calls[0].method, 'chotThangAnToan');
assert.equal(calls[0].args[1], false);
assert.equal(get('btnChotThang').disabled, true);
confirms.push(false); calls.shift().success({ok:false, exists:true, msg:'Đã có bản chốt'});
assert.match(get('statusChot').textContent, /giữ bản chốt cũ/);
confirms.push(true, true); context.chotThang(); calls.shift().success({ok:false, exists:true});
assert.equal(calls[0].args[1], true);
calls.shift().failure({message:'copy failed'});
assert.match(get('statusChot').textContent, /copy failed/);
assert.equal(get('btnChotThang').disabled, false);
context.xemThang(); calls.shift().success([]);
assert.equal(get('btnChotThang').disabled, false);
console.log('PASS test_baocao_ui: validation, preview, empty/error, Excel duplicate/fallback, month close');
