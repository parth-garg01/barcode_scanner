import { db } from './db';
import type { Student } from './types';

export function normaliseRegNo(regNo: string): string {
  return regNo.trim().toUpperCase();
}

export async function upsertStudents(students: Student[]): Promise<number> {
  const normalised = students
    .map((s) => ({ ...s, regNo: normaliseRegNo(s.regNo) }))
    .filter((s) => s.regNo.length > 0);
  await db.students.bulkPut(normalised);
  return normalised.length;
}

export function getStudent(regNo: string): Promise<Student | undefined> {
  return db.students.get(normaliseRegNo(regNo));
}

export function countStudents(): Promise<number> {
  return db.students.count();
}

export function clearStudents(): Promise<void> {
  return db.students.clear();
}
