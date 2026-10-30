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
const props = {
  LICH_LAM_BOT_TOKEN:'schedule-token',
  LICH_LAM_CHAT_ID:'-1003955550981',
  LICH_LAM_THREAD_ID:'50',
  TELEGRAM_BOT_TOKEN:'checkin-token',
  CHECKIN_TELEGRAM_CHAT_ID:'-100777',
  CHECKIN_TELEGRAM_THREAD_ID:'77'
};
const env = create(rows, props);
const day = new Date(2026, 9, 23, 21, 0); // Friday, send Saturday 24th
let result = env.s.sendTomorrowWorkSchedule(day);
assert.equal(result.ok, true);
assert.equal(env.sent.length, 1);
assert.match(env.sent[0].opts.payload.text, /24\/10\/2026/);
assert.match(env.sent[0].opts.payload.text, /Cô C/);
assert.match(env.sent[0].opts.payload.text, /Thầy Bình/);
assert.doesNotMatch(env.sent[0].opts.payload.text, /Cô An/);
assert.equal(env.sent[0].opts.payload.chat_id, '-1003955550981');
assert.equal(env.sent[0].opts.payload.message_thread_id, '50');
result = env.s.sendTomorrowWorkSchedule(day);
assert.equal(result.skipped, true);
assert.equal(env.sent.length, 1);

// Manual schedule test sends now but never creates the daily "already sent" marker.
const manual = create(rows, props);
result = manual.s.testGuiLichLamNow(day);
assert.equal(result.ok, true);
assert.equal(manual.sent.length, 1);
assert.equal(manual.sent[0].opts.payload.chat_id, '-1003955550981');
assert.equal(manual.sent[0].opts.payload.message_thread_id, '50');
assert.equal(Object.keys(manual.state).filter(k => k.startsWith('LICH_LAM_SENT_')).length, 0);

// Check-in destination must be configured separately and missing destination must be safe.
const checkin = create(rows, props);
assert.match(checkin.s.guiTinTelegram('Test check-in'), /ok/);
assert.equal(checkin.sent.length, 1);
assert.equal(checkin.sent[0].opts.payload.chat_id, '-100777');
assert.equal(checkin.sent[0].opts.payload.message_thread_id, '77');
const noCheckinDestination = create(rows, {TELEGRAM_BOT_TOKEN:'checkin-token'});
assert.equal(noCheckinDestination.s.guiTinTelegram('Do not send'), 'THIEU DIA CHI NHAN');
assert.equal(noCheckinDestination.sent.length, 0);
console.log('PASS: schedule topic, manual no-marker test, check-in destination and missing config safety');
