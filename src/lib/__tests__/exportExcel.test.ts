import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildAttendanceWorkbook } from '../exportExcel';
import type { Event, Scan } from '../types';

describe('buildAttendanceWorkbook', () => {
  it('writes one row per scan with the expected columns', () => {
    const event: Event = { id: 'e1', name: 'Robotics Fest 2026', date: '2026-04-10', createdAt: 0 };
    const scans: Scan[] = [
      {
        id: 1,
        eventId: 'e1',
        regNo: '24BCI0115',
        name: 'Asha Rao',
        department: 'CSE',
        contact: '9999999999',
        bloodGroup: 'O+',
        timestamp: Date.UTC(2026, 3, 10, 10, 0),
        manual: false,
      },
    ];

    const workbook = buildAttendanceWorkbook(event, scans);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, string>[];

    expect(rows).toHaveLength(1);
    expect(rows[0]['Registration Number']).toBe('24BCI0115');
    expect(rows[0]['Name']).toBe('Asha Rao');
    expect(rows[0]['Blood Group']).toBe('O+');
    expect(rows[0]['Check-in Time']).toBeTruthy();
  });
});
