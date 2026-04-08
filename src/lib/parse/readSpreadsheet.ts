import * as XLSX from 'xlsx';

/** Reads a CSV or XLSX file into a 2D array of cell strings, header row first. */
export async function readSpreadsheetRows(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, raw: false, blankrows: false });
}
