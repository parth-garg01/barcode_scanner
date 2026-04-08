import { describe, expect, it } from 'vitest';
import { rowsToStudents } from '../parse/masterList';

describe('rowsToStudents', () => {
  it('maps aliased headers and skips incomplete rows', () => {
    const rows = [
      ['Reg No', 'Student Name', 'Dept', 'Phone Number', 'Blood Group'],
      ['24BCI0115', 'Asha Rao', 'CSE', '9999999999', 'O+'],
      ['', '', '', '', ''],
      ['24BCI0200', '', 'ECE', '8888888888', 'A+'], // missing name -> skipped
    ];

    const { students, skipped } = rowsToStudents(rows);

    expect(students).toEqual([
      { regNo: '24BCI0115', name: 'Asha Rao', department: 'CSE', contact: '9999999999', bloodGroup: 'O+' },
    ]);
    expect(skipped).toBe(1);
  });

  it('returns nothing for an empty sheet', () => {
    expect(rowsToStudents([])).toEqual({ students: [], skipped: 0 });
  });
});
