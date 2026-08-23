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
 *
 * Sheet tab: Landing Contacts
 * Columns: Timestamp | Name | Phone | Email | Topic | Message | Formatted digest | Language | District
 * Last three: Contacted On | Contacted By | Remarks
 * Pending = those three are empty. Fill them after you reply.
 */

var SHEET_NAME = 'Landing Contacts';
var PULL_KEY = 'slmPull_8f3c1a9e2b';

function doGet(e) {
  try {
    var pull = e && e.parameter && e.parameter.pull;
    if (pull && String(pull) === PULL_KEY) {
      var pack = readAllRows_();
      if (e.parameter.count === '1') {
        return jsonOut({ ok: true, pending: pack.pending });
      }
      return jsonOut({ ok: true, pending: pack.pending, rows: pack.rows });
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
      ensureDistrictHeader_(sheet);
      ensureFollowUpHeaders_(sheet);
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.topicLabel || data.topic || '',
      data.message || '',
      data.formatted || '',
      data.language || '',
      data.district || '',
    ]);

    var last = sheet.getLastRow();
    sheet.getRange(last, 7).setWrap(true);
    sheet.setRowHeight(last, 140);

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

function ensureDistrictHeader_(sheet) {
  var header = headerRow_(sheet);
  if (findHeader_(header, 'district') >= 0) return;
  if (String(header[8] || '').trim() === '') {
    sheet.getRange(1, 9).setValue('District').setFontWeight('bold');
  }
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

function followUpIndexes_(sheet) {
  ensureFollowUpHeaders_(sheet);
  var header = headerRow_(sheet);
  return {
    on: findHeader_(header, 'Contacted On'),
    by: findHeader_(header, 'Contacted By'),
    remarks: findHeader_(header, 'Remarks'),
  };
}

function isPendingFollowUp_(row, cols) {
  var on = cols.on >= 0 ? cellText_(row[cols.on]) : '';
  var by = cols.by >= 0 ? cellText_(row[cols.by]) : '';
  var remarks = cols.remarks >= 0 ? cellText_(row[cols.remarks]) : '';
  return !on && !by && !remarks;
}

function readAllRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return { rows: [], pending: 0 };
  var cols = followUpIndexes_(sheet);
  var width = Math.max(sheet.getLastColumn(), 12);
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
  var rows = [];
  var pending = 0;
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var name = String(row[1] || '').trim();
    var message = String(row[5] || '').trim();
    if (!name || !message) continue;
    var pendingRow = isPendingFollowUp_(row, cols);
    if (pendingRow) pending += 1;
    rows.push({
      id: String(i + 2),
      timestamp: cellText_(row[0]),
      name: name,
      phone: String(row[2] || '').trim(),
      email: String(row[3] || '').trim(),
      topic: String(row[4] || '').trim(),
      topicLabel: String(row[4] || '').trim(),
      message: message,
      formatted: String(row[6] || '').trim(),
      language: String(row[7] || '').trim(),
      district: String(row[8] || '').trim(),
      contactedOn: cols.on >= 0 ? cellText_(row[cols.on]) : '',
      contactedBy: cols.by >= 0 ? cellText_(row[cols.by]) : '',
      remarks: cols.remarks >= 0 ? cellText_(row[cols.remarks]) : '',
      pending: pendingRow,
    });
  }
  rows.reverse();
  return { rows: rows, pending: pending };
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
