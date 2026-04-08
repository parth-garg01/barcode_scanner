import type { Student } from '../types';

const HEADER_ALIASES: Record<string, keyof Student> = {
  regno: 'regNo',
  registrationnumber: 'regNo',
  registrationno: 'regNo',
  id: 'regNo',
  idnumber: 'regNo',
  name: 'name',
  studentname: 'name',
  department: 'department',
  dept: 'department',
  contact: 'contact',
  contactnumber: 'contact',
  phone: 'contact',
  phonenumber: 'contact',
  mobile: 'contact',
  bloodgroup: 'bloodGroup',
  blood: 'bloodGroup',
};

function keyFor(header: string): keyof Student | undefined {
  const key = header.trim().toLowerCase().replace(/[^a-z]/g, '');
  return HEADER_ALIASES[key];
}

/** Parses rows already extracted from a CSV/XLSX sheet (header row first) into Students. */
export function rowsToStudents(rows: string[][]): { students: Student[]; skipped: number } {
  if (rows.length === 0) return { students: [], skipped: 0 };

  const [headerRow, ...dataRows] = rows;
  const columns = headerRow.map(keyFor);

  const students: Student[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    if (row.every((cell) => !cell?.trim())) continue; // blank line

    const record: Partial<Student> = {};
    columns.forEach((field, i) => {
      if (!field) return;
      const value = row[i]?.toString().trim();
      if (value) record[field] = value;
    });

    if (record.regNo && record.name) {
      students.push(record as Student);
    } else {
      skipped++;
    }
  }

  return { students, skipped };
}
