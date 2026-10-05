import { Capacitor } from '@capacitor/core';
import * as XLSX from 'xlsx';
import type { Event, Scan } from './types';

const COLUMNS: { header: string; key: keyof Scan }[] = [
  { header: 'Registration Number', key: 'regNo' },
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

/** Generates the attendance XLSX: a browser download on the web, the share sheet in the native app. */
export async function exportAttendanceToExcel(event: Event, scans: Scan[]): Promise<void> {
  const workbook = buildAttendanceWorkbook(event, scans);
  const fileName = `${safeFileName(event.name)}_attendance.xlsx`;
  if (!Capacitor.isNativePlatform()) {
    XLSX.writeFile(workbook, fileName);
    return;
  }
  // A WebView can't download, so write to the cache dir and hand the file to the share sheet.
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }),
    directory: Directory.Cache,
  });
  await Share.share({ title: `${event.name} attendance`, files: [uri] });
}
