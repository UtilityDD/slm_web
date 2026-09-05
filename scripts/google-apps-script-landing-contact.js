/**
 * Google Apps Script — Landing contact → Google Sheet
 *
 * Setup (no Vercel needed — the site posts straight to this Web App URL):
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file → Save
 * 3. Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy
 *    OR New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. If the Web app URL changes, update LANDING_CONTACT_SCRIPT_URL in
 *    src/utils/landingContactService.js and rebuild the site.
 *
 * Opening the /exec URL in a browser should show: {"ok":true,"service":"landing-contact"}
 * Admin inbox: /exec?pull=slmPull_8f3c1a9e2b
 * Pending count only: /exec?pull=slmPull_8f3c1a9e2b&count=1
 * Follow-up write (readable): GET
 *   /exec?pull=...&followup=1&id=&phone=&contactedOn=&contactedBy=&remarks=
 * Follow-up write (legacy POST JSON):
 *   { source: "smartlineman-contact-followup", pull, id, phone?, contactedOn, contactedBy, remarks }
 *   id = sheet row number. Landing posts (source smartlineman-landing) are unchanged.
 *
 * One-shot District/Contacted-On cleanup (run manually in editor once if needed):
 *   healMisplacedDistrictOnce()
 *
 * Sheet tab: Landing Contacts
 * Columns: Timestamp | Name | Phone | Email | Topic | Message | Formatted digest | Language | District
 * Last three: Contacted On | Contacted By | Remarks
 * Pending = those three are empty (Contacted On must be a date, not a district name).
 *
 * IMPORTANT: Inbox pulls (doGet pull) are read-only. They must never rewrite sheet cells.
 */

var SHEET_NAME = 'Landing Contacts';
var PULL_KEY = 'slmPull_8f3c1a9e2b';

function doGet(e) {
  try {
    var pull = e && e.parameter && e.parameter.pull;
    if (pull && String(pull) === PULL_KEY) {
      var cache = CacheService.getScriptCache();
      var isForce = String(e.parameter.refresh || e.parameter.force || '') === '1';

      if (String(e.parameter.followup || '') === '1') {
        var res = writeFollowUp_({
          id: e.parameter.id,
          phone: e.parameter.phone,
          contactedOn: e.parameter.contactedOn,
          contactedBy: e.parameter.contactedBy,
          remarks: e.parameter.remarks,
          clearRemarks: e.parameter.clearRemarks,
        });
        if (res && res.ok) {
          try {
            cache.remove('contact_inbox_json');
            cache.remove('contact_inbox_pending');
          } catch (ign) {}
        }
        return jsonOut(res);
      }

      // Fast path for pending count badge
      if (e.parameter.count === '1') {
        if (!isForce) {
          var cachedPending = cache.get('contact_inbox_pending');
          if (cachedPending !== null) {
            return jsonOut({ ok: true, pending: parseInt(cachedPending, 10) });
          }
        }
        var pendingOnly = readPendingCountOnly_();
        try {
          cache.put('contact_inbox_pending', String(pendingOnly), 300); // 5 min cache
        } catch (ign) {}
        return jsonOut({ ok: true, pending: pendingOnly });
      }

      // Fast path for all rows
      if (!isForce) {
        var cachedJson = cache.get('contact_inbox_json');
        if (cachedJson !== null) {
          return ContentService.createTextOutput(cachedJson).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var pack = readAllRows_();
      var outputObj = { ok: true, pending: pack.pending, rows: pack.rows };
      var outStr = JSON.stringify(outputObj);

      // CacheService has a 100KB item limit
      if (outStr.length < 95000) {
        try {
          cache.put('contact_inbox_json', outStr, 300);
        } catch (ign) {}
      }
      try {
        cache.put('contact_inbox_pending', String(pack.pending), 300);
      } catch (ign) {}

      return ContentService.createTextOutput(outStr).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
  return jsonOut({ ok: true, service: 'landing-contact' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var data = JSON.parse(raw);
    if (data.source === 'smartlineman-contact-followup') {
      if (String(data.pull || '') !== PULL_KEY) {
        return jsonOut({ ok: false, error: 'bad pull' });
      }
      return jsonOut(writeFollowUp_(data));
    }
    if (data.source !== 'smartlineman-landing') {
      return jsonOut({ ok: false, error: 'bad source' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp (UTC)',
        'Name',
        'Phone',
        'Email',
        'Topic',
        'Message',
        'Formatted digest',
        'Language',
        'District',
        'Contacted On',
        'Contacted By',
        'Remarks',
      ]);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(7, 420);
      sheet.getRange('A1:L1').setFontWeight('bold');
    } else {
      ensureHeadersOnly_(sheet);
    }

    writeLandingRow_(sheet, data);

    try {
      var cache = CacheService.getScriptCache();
      cache.remove('contact_inbox_json');
      cache.remove('contact_inbox_pending');
    } catch (ign) {}

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function headerRow_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 12)).getValues()[0];
}

function findHeader_(header, name) {
  var want = String(name || '').trim().toLowerCase();
  for (var i = 0; i < header.length; i++) {
    if (String(header[i] || '').trim().toLowerCase() === want) return i;
  }
  return -1;
}

function cellText_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return String(value || '').trim();
}

function looksLikeFollowUpDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return true;
  }
  var s = cellText_(value);
  if (!s) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (/T\d{2}:\d{2}/.test(s)) return true;
  if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i.test(s) && /\d/.test(s)) {
    return true;
  }
  if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(s)) return true;
  return false;
}

function digitsOnly_(value) {
  return String(value || '').replace(/\D/g, '');
}

function phoneMatches_(sheetPhone, incomingPhone) {
  var a = digitsOnly_(sheetPhone);
  var b = digitsOnly_(incomingPhone);
  if (!b) return true;
  if (!a) return false;
  if (a.length >= 10) a = a.slice(-10);
  if (b.length >= 10) b = b.slice(-10);
  return a === b;
}

/** Headers only — never rewrite data cells. Safe for landing writes. */
function ensureDistrictHeader_(sheet) {
  var header = headerRow_(sheet);
  if (findHeader_(header, 'district') >= 0) return;
  var ninth = String(header[8] || '').trim();
  if (!ninth) {
    sheet.getRange(1, 9).setValue('District').setFontWeight('bold');
    return;
  }
  if (ninth.toLowerCase() === 'contacted on') {
    sheet.insertColumnBefore(9);
    sheet.getRange(1, 9).setValue('District').setFontWeight('bold');
    return;
  }
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue('District').setFontWeight('bold');
}

function ensureFollowUpHeaders_(sheet) {
  var header = headerRow_(sheet);
  var names = ['Contacted On', 'Contacted By', 'Remarks'];
  var next = Math.max(sheet.getLastColumn(), 9) + 1;
  for (var i = 0; i < names.length; i++) {
    if (findHeader_(header, names[i]) >= 0) continue;
    sheet.getRange(1, next).setValue(names[i]).setFontWeight('bold');
    header[next - 1] = names[i];
    next += 1;
  }
}

function ensureHeadersOnly_(sheet) {
  ensureDistrictHeader_(sheet);
  ensureFollowUpHeaders_(sheet);
}

/**
 * One-shot cleanup for older sheets where district names landed in Contacted On.
 * Run manually from the Apps Script editor: healMisplacedDistrictOnce()
 * Do NOT call this from doGet / inbox pulls.
 */
function healMisplacedDistrictOnce() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { ok: false, error: 'no sheet' };
  ensureHeadersOnly_(sheet);
  var moved = healMisplacedDistrict_(sheet);
  return { ok: true, moved: moved };
}

function healMisplacedDistrict_(sheet) {
  if (sheet.getLastRow() < 2) return 0;
  var header = headerRow_(sheet);
  var dCol = findHeader_(header, 'district');
  var onCol = findHeader_(header, 'Contacted On');
  if (dCol < 0 || onCol < 0) return 0;
  var n = sheet.getLastRow() - 1;
  var districts = sheet.getRange(2, dCol + 1, n, 1).getValues();
  var ons = sheet.getRange(2, onCol + 1, n, 1).getValues();
  var moved = 0;
  for (var i = 0; i < n; i++) {
    if (cellText_(districts[i][0])) continue;
    if (looksLikeFollowUpDate_(ons[i][0])) continue;
    var onText = cellText_(ons[i][0]);
    if (!onText) continue;
    sheet.getRange(i + 2, dCol + 1).setValue(onText);
    sheet.getRange(i + 2, onCol + 1).setValue('');
    moved += 1;
  }
  return moved;
}

function writeLandingRow_(sheet, data) {
  ensureHeadersOnly_(sheet);
  var header = headerRow_(sheet);
  var last = sheet.getLastRow() + 1;
  function setNamed(name, value) {
    var col = findHeader_(header, name);
    if (col < 0) return;
    sheet.getRange(last, col + 1).setValue(value || '');
  }
  setNamed('Timestamp (UTC)', data.timestamp || new Date().toISOString());
  if (findHeader_(header, 'Timestamp (UTC)') < 0) {
    var tsCol = findHeader_(header, 'Timestamp');
    if (tsCol < 0) tsCol = 0;
    sheet.getRange(last, tsCol + 1).setValue(data.timestamp || new Date().toISOString());
  }
  setNamed('Name', data.name || '');
  setNamed('Phone', data.phone || '');
  setNamed('Email', data.email || '');
  setNamed('Topic', data.topicLabel || data.topic || '');
  setNamed('Message', data.message || '');
  setNamed('Formatted digest', data.formatted || '');
  setNamed('Language', data.language || '');
  setNamed('District', data.district || '');
  var digestCol = findHeader_(header, 'Formatted digest');
  if (digestCol >= 0) sheet.getRange(last, digestCol + 1).setWrap(true);
  sheet.setRowHeight(last, 140);
}

/** Read path: resolve column indexes without mutating the sheet. */
function followUpIndexesRead_(sheet) {
  var header = headerRow_(sheet);
  return {
    on: findHeader_(header, 'Contacted On'),
    by: findHeader_(header, 'Contacted By'),
    remarks: findHeader_(header, 'Remarks'),
    district: findHeader_(header, 'district'),
    phone: findHeader_(header, 'Phone'),
  };
}

/** Write path: ensure headers exist, then resolve indexes. */
function followUpIndexesWrite_(sheet) {
  ensureHeadersOnly_(sheet);
  return followUpIndexesRead_(sheet);
}

function writeFollowUp_(data) {
  var rowNum = parseInt(data.id, 10);
  if (!rowNum || rowNum < 2) return { ok: false, error: 'bad row' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { ok: false, error: 'no sheet' };
  if (rowNum > sheet.getLastRow()) return { ok: false, error: 'bad row' };

  var cols = followUpIndexesWrite_(sheet);
  var phoneCol = cols.phone >= 0 ? cols.phone : 2;
  var sheetPhone = sheet.getRange(rowNum, phoneCol + 1).getValue();
  if (!phoneMatches_(sheetPhone, data.phone)) {
    return { ok: false, error: 'phone mismatch' };
  }

  var onVal = String(data.contactedOn || '').trim().slice(0, 80);
  var byVal = String(data.contactedBy || '').trim().slice(0, 120);
  var remarksVal = String(data.remarks || '').trim().slice(0, 500);
  var clearRemarks =
    data.clearRemarks === true ||
    String(data.clearRemarks || '').toLowerCase() === '1' ||
    String(data.clearRemarks || '').toLowerCase() === 'true';

  if (cols.on >= 0 && onVal) sheet.getRange(rowNum, cols.on + 1).setValue(onVal);
  if (cols.by >= 0 && byVal) sheet.getRange(rowNum, cols.by + 1).setValue(byVal);
  if (cols.remarks >= 0) {
    if (remarksVal) {
      sheet.getRange(rowNum, cols.remarks + 1).setValue(remarksVal);
    } else if (clearRemarks) {
      sheet.getRange(rowNum, cols.remarks + 1).setValue('');
    }
    // Empty remarks without clearRemarks: keep existing cell (do not overwrite).
  }

  return {
    ok: true,
    id: String(rowNum),
    contactedOn: onVal,
    contactedBy: byVal,
    remarks: remarksVal || cellText_(cols.remarks >= 0 ? sheet.getRange(rowNum, cols.remarks + 1).getValue() : ''),
  };
}

function isPendingFollowUp_(row, cols) {
  var onRaw = cols.on >= 0 ? row[cols.on] : '';
  var on = looksLikeFollowUpDate_(onRaw) ? cellText_(onRaw) : '';
  var by = cols.by >= 0 ? cellText_(row[cols.by]) : '';
  var remarks = cols.remarks >= 0 ? cellText_(row[cols.remarks]) : '';
  return !on && !by && !remarks;
}

function readAllRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { rows: [], pending: 0 };
  
  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return { rows: [], pending: 0 };

  var header = values[0];
  var cols = {
    on: findHeader_(header, 'Contacted On'),
    by: findHeader_(header, 'Contacted By'),
    remarks: findHeader_(header, 'Remarks'),
    district: findHeader_(header, 'district'),
    phone: findHeader_(header, 'Phone'),
  };

  var rows = [];
  var pending = 0;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var name = String(row[1] || '').trim();
    var message = String(row[5] || '').trim();
    if (!name || !message) continue;

    var pendingRow = isPendingFollowUp_(row, cols);
    if (pendingRow) pending += 1;

    var district = cols.district >= 0 ? String(row[cols.district] || '').trim() : String(row[8] || '').trim();
    var contactedOnRaw = cols.on >= 0 ? row[cols.on] : '';
    var contactedOn = looksLikeFollowUpDate_(contactedOnRaw) ? cellText_(contactedOnRaw) : '';
    if (!district && contactedOnRaw && !contactedOn) district = cellText_(contactedOnRaw);

    rows.push({
      id: String(i + 1), // 1-indexed row number in sheet
      timestamp: cellText_(row[0]),
      name: name,
      phone: String(row[2] || '').trim(),
      email: String(row[3] || '').trim(),
      topic: String(row[4] || '').trim(),
      topicLabel: String(row[4] || '').trim(),
      message: message,
      // Omit unused 55KB 'formatted' digest for ~60% faster payload transfer
      language: String(row[7] || '').trim(),
      district: district,
      contactedOn: contactedOn,
      contactedBy: cols.by >= 0 ? cellText_(row[cols.by]) : '',
      remarks: cols.remarks >= 0 ? cellText_(row[cols.remarks]) : '',
      pending: pendingRow,
    });
  }
  rows.reverse();
  return { rows: rows, pending: pending };
}

function readPendingCountOnly_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return 0;

  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return 0;

  var header = values[0];
  var cols = {
    on: findHeader_(header, 'Contacted On'),
    by: findHeader_(header, 'Contacted By'),
    remarks: findHeader_(header, 'Remarks'),
  };

  var pending = 0;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var name = String(row[1] || '').trim();
    var message = String(row[5] || '').trim();
    if (!name || !message) continue;
    if (isPendingFollowUp_(row, cols)) pending += 1;
  }
  return pending;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
