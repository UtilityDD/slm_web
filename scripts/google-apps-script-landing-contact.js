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
 *
 * Sheet tab: Landing Contacts
 * Columns: Timestamp | Name | Phone | Email | Topic | Message | Formatted digest | Language | District
 */

var SHEET_NAME = 'Landing Contacts';

function doGet() {
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
      ]);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(7, 420);
      sheet.getRange('A1:I1').setFontWeight('bold');
    } else {
      ensureDistrictHeader_(sheet);
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

/** Add District as column I when an older sheet is missing it. */
function ensureDistrictHeader_(sheet) {
  var header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 9)).getValues()[0];
  if (String(header[8] || '').trim() === '') {
    sheet.getRange(1, 9).setValue('District').setFontWeight('bold');
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
