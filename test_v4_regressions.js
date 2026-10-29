const assert=require('assert'), fs=require('fs'),vm=require('vm');
const head=['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú'];
const lh=['Mã NV','Họ tên','Ngày','Ca','Giờ bắt đầu','Giờ kết thúc'];
function run(sources,month='11/2026'){
 const sh=Object.fromEntries(Object.entries(sources).map(([name,rows])=>[name,{getName:()=>name,getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows,getDisplayValues:()=>rows})}]));
 const s={Date,Math,Number,String,Object,Array,RegExp,JSON,Error,encodeURIComponent,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sh[n],getSheets:()=>Object.values(sh)})},Utilities:{formatDate:(d,t,p)=>{let z=n=>('0'+n).slice(-2);return p==='dd/MM/yyyy'?`${z(d.getDate())}/${z(d.getMonth()+1)}/${d.getFullYear()}`:p==='MM/yyyy'?`${z(d.getMonth()+1)}/${d.getFullYear()}`:'';}}};vm.createContext(s);vm.runInContext(fs.readFileSync('Code.gs','utf8'),s);return s.getPayrollWorkbookData(month);
}
let date='05/11/2026';
let rows=run({'CHECK IN':[head,['001','An',date,'Ca sáng 08:00-10:00','IN','08:00','','0',''],['001','An',date,'Ca sáng 08:00-10:00','OUT','','10:00','0',''],['001','An',date,'Ca sáng 13:00-15:00','IN','13:00','','0',''],['001','An',date,'Ca sáng 13:00-15:00','OUT','','15:00','0','']],LICHLAM:[lh,['001','An',date,'Ca sáng','08:00','10:00'],['001','An',date,'Ca sáng','13:00','15:00']]});
assert.equal(rows.detailRows.length,2,'two scheduled shifts with identical names must not merge');
assert.equal(new Set(rows.detailRows.map(r=>r[0])).size,2);
assert.equal(rows.weekRows[0][6],4);
rows=run({'CHECK IN':[head,['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_IN','08:00','','0',''],['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','10:00','0',''],['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_IN','13:00','','0',''],['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','15:00','0','']],LICHLAM:[lh]});
assert.equal(rows.detailRows.length,2,'old Exceptions without IDs must remain separate');
const misses=[head], schedule=[lh];for(let i=0;i<5;i++){const ca='Ca '+i, h=String(8+i*2).padStart(2,'0')+':00',end=String(9+i*2).padStart(2,'0')+':00';schedule.push(['001','An',date,ca,h,end]);misses.push(['001','An',date,ca,'IN',h,'','0','']);}
rows=run({'CHECK IN':misses,LICHLAM:schedule});
assert.equal(rows.detailRows.length,5);assert.equal(rows.detailRows.filter(r=>r[13]==='Có').length,1,'fifth forgotten punch same day must affect KPI');
const overlap=run({'CHECK IN':[head,['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_IN','08:00','','0','Exception | Sự kiện | ID:EX-ONE'],['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','10:00','0','Exception | Sự kiện | ID:EX-ONE'],['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_IN','09:00','','0','Exception | Sự kiện | ID:EX-TWO'],['001','An',date,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','11:00','0','Exception | Sự kiện | ID:EX-TWO']],LICHLAM:[lh]});
assert.equal(overlap.weekRows[0][6],3,'overlapping Exceptions must count their union, not 4h');
console.log('PASS: duplicate shift names, legacy exception pairing, annual quota and no double-count');

