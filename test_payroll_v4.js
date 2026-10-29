const assert=require('assert'),fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('Code.gs','utf8');
const hdr=['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú'];
const schedHdr=['Mã NV','Họ tên','Ngày','Ca','Giờ bắt đầu','Giờ kết thúc'];
function sheet(name,rows){return {getName:()=>name,getLastRow:()=>rows.length,getDataRange:()=>({getDisplayValues:()=>rows,getValues:()=>rows})};}
function env(data){const sheets=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,sheet(k,v)])); const s={Date,Math,Number,String,Object,Array,RegExp,JSON,Error, encodeURIComponent, SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n],getSheets:()=>Object.values(sheets)})}, Utilities:{formatDate:(d,t,f)=>{const p=n=>String(n).padStart(2,'0');return {'dd/MM/yyyy':`${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`,'MM/yyyy':`${p(d.getMonth()+1)}/${d.getFullYear()}`}[f]||'';}}};vm.createContext(s);vm.runInContext(code,s);return s;}
const d='05/11/2026',id='001';
const a=env({'LICHLAM':[schedHdr,[id,'An',d,'Ca sáng','08:00','12:00']], 'CHECK IN':[hdr,[id,'An',d,'Ca sáng','IN','08:10','','10',''],[id,'An',d,'Ca sáng','OUT','','11:00','0','']]});
let out=a.getPayrollWorkbookData('11/2026');
assert.equal(a.PAYROLL_DETAIL_HEADERS.length,25);
assert.equal(out.detailRows.length,1);
assert.equal(out.detailRows[0].length,25);
assert.equal(out.detailRows[0][8],2.83);
assert.equal(out.detailRows[0][9],2.83);
assert.equal(out.detailRows[0][22],'attendance-export-v4');
assert.equal(out.detailRows[0][15],'Không trừ phép');
assert.equal(out.detailRows[0][13],'Có');
const ph=env({'LICHLAM':[schedHdr,[id,'An',d,'Ca sáng','08:00','12:00']], 'CHECK IN':[hdr,[id,'An',d,'Ca sáng','VẮNG','','','25','Phụ huynh xin nghỉ (Báo vắng từ xa: 05/11/2026 08:25)']]});
out=ph.getPayrollWorkbookData('11/2026');assert.equal(out.detailRows[0][13],'Không');assert.equal(out.detailRows[0][15],'Không trừ phép');assert.match(out.detailRows[0][24],/25 phút/);
const ex=env({'LICHLAM':[schedHdr], 'CHECK IN':[hdr,[id,'An',d,'Ca đột xuất — Sự kiện','EXCEPTION_IN','08:00','','0','Exception | Sự kiện | ID:EX-abc001'],[id,'An',d,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','10:00','0','Exception | Sự kiện | ID:EX-abc001'],[id,'An',d,'Ca đột xuất — Sự kiện','EXCEPTION_IN','13:00','','0','Exception | Sự kiện | ID:EX-abc002'],[id,'An',d,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','15:00','0','Exception | Sự kiện | ID:EX-abc002']]});
out=ex.getPayrollWorkbookData('11/2026');assert.equal(out.detailRows.length,2);assert.deepEqual(Array.from(out.detailRows.map(x=>x[0])),['EX-abc001','EX-abc002']);assert.equal(out.weekRows[0][6],4);assert.equal(out.detailRows[0][9],0);assert.equal(out.detailRows[0][23],2);assert.equal(out.detailRows[0][18],'Chờ duyệt Exception');
console.log('PASS v4: 25-column contract, late/actual, PH reminder, two Exceptions and weekly control');
