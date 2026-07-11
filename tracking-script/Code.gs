/**
 * Florentino Academy — tracking backend (Google Apps Script)
 *
 * Receives module completions + staff registrations from the Academy,
 * stores them in this spreadsheet, and serves results to the Manager
 * Dashboard (passcode-protected, JSONP).
 *
 * SETUP: see SETUP.md. Set your own PASSCODE below before deploying.
 * NEVER commit the real passcode to GitHub — it lives only here.
 */

const PASSCODE = 'CHANGE_ME';        // ← your new Manager Dashboard passcode
const SHEET_RESULTS = 'Results';
const SHEET_STAFF   = 'Staff';

/* ---------- write: completions & registrations (POST from the platform) ---------- */
function doPost(e) {
  let d = {};
  try { d = JSON.parse((e.postData && e.postData.contents) || '{}'); }
  catch (err) { return textOut('bad json'); }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (d.type === 'weekly_answer') {
    const sh = ensureSheet(ss, 'Answers', ['Date', 'Staff', 'Venue', 'Week', 'Q#', 'Question', 'Answer', 'AI Score', 'Coaching']);
    sh.appendRow([new Date(), String(d.staff || ''), String(d.venue || ''), String(d.week || ''),
                  Number(d.qnum) || 0, String(d.question || ''), String(d.answer || ''),
                  Number(d.score) || 0, String(d.coaching || '')]);
    return textOut('ok');
  }

  if (d.type === 'register') {
    const sh = ensureSheet(ss, SHEET_STAFF, ['Name', 'Venue', 'Role', 'Registered']);
    if (!isDuplicateStaff(sh, d.staff)) {
      sh.appendRow([String(d.staff || ''), String(d.venue || ''), String(d.role || ''), new Date()]);
    }
  } else {
    const sh = ensureSheet(ss, SHEET_RESULTS, ['Date', 'Staff', 'Venue', 'Track', 'Module', 'Score']);
    sh.appendRow([new Date(), String(d.staff || ''), String(d.venue || ''),
                  String(d.track || ''), String(d.module || ''), Number(d.score) || 0]);
  }
  return textOut('ok');
}

/* ---------- read: dashboard (JSONP GET, passcode required) ---------- */
function doGet(e) {
  const p  = (e && e.parameter) || {};
  const cb = sanitizeCallback(p.callback);

  if (p.action === 'results') {
    if (String(p.key || '') !== PASSCODE) return jsonp(cb, { error: 'unauthorized' });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const results = readRows(ss, SHEET_RESULTS).map(function (r) {
      return { date: r[0], staff: r[1], venue: r[2], track: r[3], module: r[4], score: Number(r[5]) || 0 };
    });
    const staff = readRows(ss, SHEET_STAFF).map(function (r) {
      return { name: r[0], venue: r[1], role: r[2] };
    });
    return jsonp(cb, { results: results, staff: staff });
  }
  return jsonp(cb, { ok: true });
}

/* ---------- helpers ---------- */
function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function readRows(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function isDuplicateStaff(sh, name) {
  const n = String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!n) return true;
  return readRowsFromSheet(sh).some(function (r) {
    return String(r[0] || '').trim().replace(/\s+/g, ' ').toLowerCase() === n;
  });
}
function readRowsFromSheet(sh) {
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function sanitizeCallback(cb) {
  cb = String(cb || 'callback');
  return /^[A-Za-z0-9_$.]+$/.test(cb) ? cb : 'callback';
}
function jsonp(cb, obj) {
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function textOut(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}
