const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('Code.gs', 'utf8');
function create(rows, props = {}) {
  const sent = [], state = {};
  const s = {
    Date, Math, Number, String, Object, Array, RegExp, JSON, Error,
    SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: n => n === 'LICHLAM' ? {getLastRow: () => rows.length, getDataRange: () => ({getDisplayValues: () => rows})} : null})},
    PropertiesService: {getScriptProperties: () => ({getProperty: n => props[n] || state[n] || '', setProperty: (n, v) => {state[n] = v;}})},
    Utilities: {formatDate: (d, tz, fmt) => {assert.equal(tz, 'Asia/Ho_Chi_Minh'); const p = n => String(n).padStart(2,'0'); const v = { 'dd/MM/yyyy': `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`, 'HH:mm': `${p(d.getHours())}:${p(d.getMinutes())}` }; return v[fmt];}},
    UrlFetchApp: {fetch: (url, opts) => {sent.push({url, opts}); return {getResponseCode: () => 200, getContentText: () => '{"ok":true}'};}},
    LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock: () => {}})},
    Logger: {log: () => {}}
  };
  vm.createContext(s); vm.runInContext(source, s); return {s, sent, state};
}
const rows = [
 ['Mã NV','Họ tên','Ngày','Ca','Giờ bắt đầu','Giờ kết thúc'],
 ['001','Cô An','T6','Ca chiều','13:00','17:00'],
 ['002','Thầy Bình','24/10/2026','Ca riêng','08:00','11:00'],
 ['003','Cô C','T7','Ca sáng','07:30','10:30']
];
const env = create(rows, {LICH_LAM_BOT_TOKEN:'test-token', LICH_LAM_CHAT_ID:'-100123'});
assert.equal(typeof env.s.sendTomorrowWorkSchedule, 'function');
const day = new Date(2026, 9, 23, 21, 0); // Friday, send Saturday 24th
let result = env.s.sendTomorrowWorkSchedule(day);
assert.equal(result.ok, true);
assert.equal(env.sent.length, 1);
assert.match(env.sent[0].opts.payload.text, /24\/10\/2026/);
assert.match(env.sent[0].opts.payload.text, /Cô C/);
assert.match(env.sent[0].opts.payload.text, /Thầy Bình/);
assert.doesNotMatch(env.sent[0].opts.payload.text, /Cô An/);
assert.equal(env.sent[0].opts.payload.chat_id, '-100123');
result = env.s.sendTomorrowWorkSchedule(day);
assert.equal(result.skipped, true);
assert.equal(env.sent.length, 1);
const missing = create(rows, {});
result = missing.s.sendTomorrowWorkSchedule(day);
assert.equal(result.ok, false);
assert.equal(missing.sent.length, 0);
console.log('PASS: tomorrow schedule, correct group, no duplicate, missing config safe');
