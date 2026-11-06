const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const H=['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú'];
const L=['Mã NV','Họ tên','Ngày','Ca','Giờ bắt đầu','Giờ kết thúc'];
function sheet(name, rows) { return {getName:()=>name,getLastRow:()=>rows.length,getDataRange:()=>({getDisplayValues:()=>rows,getValues:()=>rows})}; }
const sources={
  LICHLAM: sheet('LICHLAM',[L,['001','An','02/11/2026','Ca sáng','08:00','12:00'],['002','Bình','02/11/2026','Ca sáng','08:00','12:00']]),
  'CHECK IN': sheet('CHECK IN',[H,
    ['001','An','02/11/2026','Ca sáng','IN','08:00','','0',''],['001','An','02/11/2026','Ca sáng','OUT','','12:00','0',''],
    ['001','An','03/11/2026','Ca đột xuất','EXCEPTION_IN','13:00','','0','Exception | ID:EX-1'],['001','An','03/11/2026','Ca đột xuất','EXCEPTION_OUT','','15:00','0',''],
    ['002','Bình','02/11/2026','Ca sáng','IN','08:00','','0','']]),
  DANHSACH: sheet('DANHSACH',[['Mã NV','Họ tên','Vai trò'],['001','An','GV'],['002','Bình','GV']])
};
const s={Date,Math,Number,String,Object,Array,RegExp,JSON,Error,encodeURIComponent,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sources[n],getSheets:()=>Object.values(sources)})},Utilities:{formatDate:(d,t,f)=>{const p=n=>String(n).padStart(2,'0');return f==='dd/MM/yyyy'?`${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`:f==='MM/yyyy'?`${p(d.getMonth()+1)}/${d.getFullYear()}`:'';}}};
vm.createContext(s); vm.runInContext(fs.readFileSync('Code.gs','utf8'),s);
assert.equal(typeof s.getBaoCaoGioTuan, 'function');
const rows=s.getBaoCaoGioTuan('05/11/2026');
const an=rows.find(r=>r.ma==='001'), binh=rows.find(r=>r.ma==='002');
assert.equal(an.tu,'02/11/2026'); assert.equal(an.den,'08/11/2026');
assert.equal(an.gioThucTe,4); assert.equal(an.gioExceptionChoDuyet,2, 'paired Exception IN/OUT is reported separately as pending approval'); assert.equal(an.tongGioTheoDoi,6);
assert.match(an.canhBao,/Bình thường/); assert.match(binh.canhBao,/Bình thường/);
assert.equal(s.weeklyHoursWarning(40), 'Từ 40 giờ — kiểm tra lịch');
assert.equal(s.weeklyHoursWarning(46), 'Từ 40 giờ — kiểm tra lịch');
assert.equal(s.weeklyHoursWarning(46.01), 'Trên 46 giờ — quản lý kiểm tra');
console.log('PASS weekly report: Monday-Sunday, confirmed vs pending Exception, incomplete data and thresholds');
