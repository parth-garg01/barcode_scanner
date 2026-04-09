import * as XLSX from 'xlsx';
import type { Event, Scan } from './types';

const COLUMNS: { header: string; key: keyof Scan }[] = [
  { header: 'Registration Number', key: 'regNo' },
  { header: 'Name', key: 'name' },
  { header: 'Department', key: 'department' },
  { header: 'Contact Number', key: 'contact' },
  { header: 'Blood Group', key: 'bloodGroup' },
  { header: 'Check-in Time', key: 'timestamp' },
];

function toSheetRow(scan: Scan): Record<string, string> {
  const row: Record<string, string> = {};
  for (const { header, key } of COLUMNS) {
    const value = scan[key];
    row[header] = key === 'timestamp' ? new Date(value as number).toLocaleString() : ((value as string) ?? '');
  }
  return row;
}

/** Builds the attendance workbook and returns it without writing to disk (for testing). */
export function buildAttendanceWorkbook(event: Event, scans: Scan[]): XLSX.WorkBook {
  const sheet = XLSX.utils.json_to_sheet(scans.map(toSheetRow), {
    header: COLUMNS.map((c) => c.header),
  });
  const workbook = XLSX.utils.book_new();
  // Sheet names are capped at 31 chars and can't contain []/\?*:
  const sheetName = event.name.replace(/[[\]\\/?*:]/g, '').slice(0, 31) || 'Attendance';
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return workbook;
}

function safeFileName(name: string): string {
  return name.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'event';
}

/** Generates the attendance XLSX and triggers a browser download. */
export function exportAttendanceToExcel(event: Event, scans: Scan[]): void {
  const workbook = buildAttendanceWorkbook(event, scans);
  XLSX.writeFile(workbook, `${safeFileName(event.name)}_attendance.xlsx`);
}
