import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Runs the real Apps Script backend (Code.gs) in Node against an in-memory
 * stand-in for Google Sheets. Used by the unit tests and by the dev server's
 * demo backend, so the app can be tried end to end before a Sheet is set up.
 * Only the handful of Sheets calls Code.gs makes are implemented.
 */
export function createLocalBackend({ adminPassword = 'admin' } = {}) {
  const sheets: { name: string; rows: unknown[][] }[] = [];

  const formatOnly = { setNumberFormat: () => formatOnly, setFontWeight: () => formatOnly };
  const wrap = (sheet: { name: string; rows: unknown[][] }) => ({
    getName: () => sheet.name,
    appendRow: (row: unknown[]) => void sheet.rows.push(row.slice()),
    getLastRow: () => sheet.rows.length,
    getDataRange: () => ({ getValues: () => sheet.rows.map((row) => row.slice()) }),
    setFrozenRows: () => {},
    getRange: (row: number | string, column?: number) =>
      typeof row === 'string'
        ? formatOnly
        : {
            setValue: (value: unknown) => void ((sheet.rows[row - 1] ??= [])[column! - 1] = value),
            setValues: (values: unknown[][]) =>
              values.forEach((cells, i) => {
                const target = (sheet.rows[row - 1 + i] ??= []);
                cells.forEach((cell, j) => (target[column! - 1 + j] = cell));
              }),
          },
  });

  const book = {
    getUrl: () => 'https://docs.google.com/spreadsheets/d/demo',
    getSheetByName: (name: string) => {
      const sheet = sheets.find((s) => s.name === name);
      return sheet ? wrap(sheet) : null;
    },
    insertSheet: (name: string) => {
      const sheet = { name, rows: [] as unknown[][] };
      sheets.push(sheet);
      return wrap(sheet);
    },
  };

  const globals = {
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (key: string) => (key === 'ADMIN_PASSWORD' ? adminPassword : null) }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content: string) => {
        const output = { setMimeType: () => output, getContent: () => content };
        return output;
      },
    },
  };

  const source = readFileSync(fileURLToPath(new URL('./Code.gs', import.meta.url)), 'utf8');
  const doPost = new Function(...Object.keys(globals), `${source}\nreturn doPost;`)(...Object.values(globals));

  return {
    /** Takes the raw request body, returns the raw response body, like the deployed web app. */
    handle: (body: string): string => doPost({ postData: { contents: body } }).getContent(),
    /** The stand-in workbook, for assertions in tests. */
    sheets,
  };
}
