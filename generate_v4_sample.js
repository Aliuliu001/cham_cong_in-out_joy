// Deterministic fictional sample produced by the real Apps Script row builder.
const fs=require('fs'),vm=require('vm');
const hdr=['Mã NV','Họ tên','Ngày','Ca','Loại IN/OUT','Giờ check in','Giờ check out','Trễ (phút)','Ghi chú'];
const sh=['Mã NV','Họ tên','Ngày','Ca','Giờ bắt đầu','Giờ kết thúc'];
const date='05/11/2026';
const sheets={
 'CHECK IN':[hdr,['GV001','Cô An',date,'Ca sáng','IN','08:10','','10',''],['GV001','Cô An',date,'Ca sáng','OUT','','11:00','0',''],['GV001','Cô An',date,'Ca đột xuất — Sự kiện','EXCEPTION_IN','13:00','','0','Exception | Sự kiện | ID:EX-DEMO-001'],['GV001','Cô An',date,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','15:00','0','Exception | Sự kiện | ID:EX-DEMO-001'],['GV001','Cô An',date,'Ca đột xuất — Sự kiện','EXCEPTION_IN','16:00','','0','Exception | Sự kiện | ID:EX-DEMO-002'],['GV001','Cô An',date,'Ca đột xuất — Sự kiện','EXCEPTION_OUT','','17:00','0','Exception | Sự kiện | ID:EX-DEMO-002'],['GV002','Thầy Bình',date,'Ca sáng','VẮNG','','','25','Phụ huynh xin nghỉ (Báo vắng từ xa: 05/11/2026 08:25)']],
 'LICHLAM':[sh,['GV001','Cô An',date,'Ca sáng','08:00','12:00'],['GV002','Thầy Bình',date,'Ca sáng','08:00','12:00']],
 'DANHSACH':[['Mã NV','Họ tên','Vai trò'],['GV001','Cô An','Giáo viên'],['GV002','Thầy Bình','Giáo viên']]
};
function sheet(name,rows){return {getName:()=>name,getLastRow:()=>rows.length,getDataRange:()=>({getDisplayValues:()=>rows,getValues:()=>rows})};}
const collection=Object.fromEntries(Object.entries(sheets).map(([name,rows])=>[name,sheet(name,rows)]));
const s={Date,Math,Number,String,Object,Array,RegExp,JSON,Error,encodeURIComponent,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>collection[n],getSheets:()=>Object.values(collection)})},Utilities:{formatDate:(d,t,f)=>{const p=n=>String(n).padStart(2,'0');return {'dd/MM/yyyy':`${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`,'MM/yyyy':`${p(d.getMonth()+1)}/${d.getFullYear()}`}[f]||'';}}};
vm.createContext(s);vm.runInContext(fs.readFileSync('Code.gs','utf8'),s);
const result=s.previewPayrollWorkbook('11/2026');
fs.writeFileSync(process.argv[2]||'/home/ubuntu/.hermes/cache/scratch/payroll_v4_sample.json',JSON.stringify(result,null,2));
console.log('Sample rows',result.detailRows.length,result.summaryRows.length,result.weekRows.length);
