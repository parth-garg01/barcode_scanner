/**
 * ScanMark backend.
 *
 * Lives inside the attendance Google Sheet (Extensions > Apps Script) and is
 * deployed as a web app. The sheet is the database: an "Events" tab indexes
 * every event and its join code, and each event gets its own tab with one row
 * per check-in (registration number, time, volunteer).
 *
 * Setup: see the "Google Sheet backend" section of the README.
 */

var INDEX_SHEET = 'Events';
var INDEX_HEADER = ['Code', 'Event', 'Date', 'Sheet', 'Created', 'Closed At'];
var CLOSED_AT_COLUMN = 6;
var SCAN_HEADER = ['Registration Number', 'Check-in Time', 'Scanned By'];
// No 0/O or 1/I/L, so a code read out loud or copied by hand is unambiguous.
var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
var CODE_LENGTH = 6;
var MAX_SCANS_PER_REQUEST = 500;

var ACTIONS = {
  createEvent: withLock(createEvent),
  listEvents: listEvents,
  setEventOpen: withLock(setEventOpen),
  joinEvent: joinEvent,
  listScans: listScans,
  addScans: withLock(addScans),
};

function doPost(e) {
  var out;
  try {
    var request = JSON.parse(e.postData.contents);
    var handler = ACTIONS[request.action];
    if (!handler) throw new Error('Unknown action');
    out = { ok: true, data: handler(request) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Serialises writers so two volunteers cannot both append the same registration number. */
function withLock(handler) {
  return function (request) {
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return handler(request);
    } finally {
      lock.releaseLock();
    }
  };
}

// ---------- Admin ----------

function requireAdmin(request) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected) throw new Error('ADMIN_PASSWORD is not set in the script properties');
  if (String(request.password || '') !== expected) throw new Error('Wrong admin password');
}

function createEvent(request) {
  requireAdmin(request);
  var name = cleanText(request.name, 80);
  var date = /^\d{4}-\d{2}-\d{2}$/.test(String(request.date)) ? String(request.date) : '';
  if (!name) throw new Error('Event name is required');
  if (!date) throw new Error('Event date is required');

  var book = SpreadsheetApp.getActiveSpreadsheet();
  var events = readEvents();
  var code = newCode(events);
  var sheetName = uniqueSheetName(book, name);

  var sheet = book.insertSheet(sheetName);
  // Plain text, or Sheets would turn all digit barcodes into numbers and drop leading zeros.
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('B:B').setNumberFormat('dd-mmm-yyyy hh:mm:ss');
  sheet.appendRow(SCAN_HEADER);
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.setFrozenRows(1);

  indexSheet().appendRow([code, name, date, sheetName, new Date(), '']);
  return { code: code, name: name, date: date, count: 0, closed: false };
}

function listEvents(request) {
  requireAdmin(request);
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var events = readEvents().map(function (event) {
    var sheet = book.getSheetByName(event.sheet);
    return { code: event.code, name: event.name, date: event.date, count: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0, closed: !!event.closedAt };
  });
  return { events: events.reverse(), sheetUrl: book.getUrl() };
}

/**
 * Closes an event to further check-ins, or reopens it. The closing time is
 * kept so that scans made before it, on a phone that was offline, still count.
 */
function setEventOpen(request) {
  requireAdmin(request);
  var event = findEvent(request.code);
  indexSheet().getRange(event.row, CLOSED_AT_COLUMN).setValue(request.open ? '' : new Date());
  return { code: event.code, closed: !request.open };
}

// ---------- Volunteers ----------

function joinEvent(request) {
  var event = findEvent(request.code);
  return { code: event.code, name: event.name, date: event.date, closed: !!event.closedAt };
}

function listScans(request) {
  var event = findEvent(request.code);
  return { scans: readScans(eventSheet(event)), closed: !!event.closedAt };
}

/**
 * Appends check-ins, keeping one row per registration number. Each scan gets a
 * result: "ok", "duplicate" (with who scanned it first and when), "invalid", or
 * "closed" when it was made after the organiser stopped scanning.
 * Resending a scan that was already stored reports the stored row, so a retry
 * after a lost response is harmless.
 */
function addScans(request) {
  var event = findEvent(request.code);
  var sheet = eventSheet(event);
  var incoming = Array.isArray(request.scans) ? request.scans.slice(0, MAX_SCANS_PER_REQUEST) : [];
  var stored = readScans(sheet);
  var byRegNo = {};
  stored.forEach(function (scan) {
    byRegNo[scan.regNo] = scan;
  });

  var rows = [];
  var results = incoming.map(function (scan) {
    var regNo = cleanRegNo(scan && scan.regNo);
    if (!regNo) return { regNo: String((scan && scan.regNo) || ''), status: 'invalid' };
    var existing = byRegNo[regNo];
    if (existing) return { regNo: regNo, status: 'duplicate', volunteer: existing.volunteer, timestamp: existing.timestamp };

    var timestamp = cleanTimestamp(scan.timestamp);
    if (event.closedAt && timestamp > event.closedAt) return { regNo: regNo, status: 'closed' };

    var added = { regNo: regNo, timestamp: timestamp, volunteer: cleanText(scan.volunteer, 60) || 'Unknown' };
    byRegNo[regNo] = added;
    stored.push(added);
    rows.push([added.regNo, new Date(added.timestamp), added.volunteer]);
    return { regNo: regNo, status: 'ok' };
  });

  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
  return { results: results, scans: stored, closed: !!event.closedAt };
}

// ---------- Sheet access ----------

function indexSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(INDEX_SHEET);
  if (!sheet) {
    sheet = book.insertSheet(INDEX_SHEET);
    sheet.appendRow(INDEX_HEADER);
    sheet.getRange('A1:F1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readEvents() {
  return indexSheet()
    .getDataRange()
    .getValues()
    .map(function (row, index) {
      return {
        row: index + 1, // 1-based row in the index sheet, for updates
        code: String(row[0]),
        name: String(row[1]),
        date: isoDate(row[2]),
        sheet: String(row[3]),
        closedAt: row[5] ? new Date(row[5]).getTime() : 0,
      };
    })
    .slice(1)
    .filter(function (event) {
      return event.code;
    });
}

function findEvent(code) {
  var wanted = String(code || '').trim().toUpperCase();
  var match = readEvents().filter(function (event) {
    return event.code === wanted;
  })[0];
  if (!wanted || !match) throw new Error('Event code not found');
  return match;
}

function eventSheet(event) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(event.sheet);
  if (!sheet) throw new Error('The sheet for this event was deleted or renamed');
  return sheet;
}

function readScans(sheet) {
  return sheet
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(function (row) {
      return row[0] !== '';
    })
    .map(function (row) {
      return { regNo: String(row[0]), timestamp: new Date(row[1]).getTime() || 0, volunteer: String(row[2]) };
    });
}

// ---------- Helpers ----------

function newCode(events) {
  var taken = {};
  events.forEach(function (event) {
    taken[event.code] = true;
  });
  for (;;) {
    var code = '';
    for (var i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
    if (!taken[code]) return code;
  }
}

/** Sheet tab names cannot contain []*?/\: and must be unique within the workbook. */
function uniqueSheetName(book, eventName) {
  var base = eventName.replace(/[\[\]*?\/\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Event';
  var name = base;
  for (var n = 2; book.getSheetByName(name) || name === INDEX_SHEET; n++) name = base + ' (' + n + ')';
  return name;
}

/**
 * Free text headed for a cell: no control characters, bounded length, and no
 * leading = + - @, which Sheets would run as a formula.
 */
function cleanText(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/^[=+\-@\s]+/, '')
    .trim()
    .slice(0, maxLength);
}

/** Registration numbers are short and alphanumeric; anything else is refused rather than stored. */
function cleanRegNo(value) {
  var regNo = String(value == null ? '' : value).trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9 .\/_-]{0,39}$/.test(regNo) ? regNo : '';
}

/** Trusts the phone's scan time (it may sync much later) unless it is missing or in the future. */
function cleanTimestamp(value) {
  var time = Number(value);
  var now = Date.now();
  return isFinite(time) && time > 0 && time <= now + 5 * 60 * 1000 ? Math.round(time) : now;
}

/** The Date column comes back as a Date object once Sheets has parsed it. */
function isoDate(value) {
  if (Object.prototype.toString.call(value) !== '[object Date]') return String(value);
  var pad = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate());
}
