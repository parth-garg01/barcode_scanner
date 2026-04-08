import { db } from './db';
import { getStudent, normaliseRegNo } from './students';
import type { Scan } from './types';

export class DuplicateScanError extends Error {
  constructor(public existing: Scan) {
    super(`${existing.regNo} has already checked in`);
    this.name = 'DuplicateScanError';
  }
}

/**
 * Records a scan for an event. Looks up the master student list to fill in
 * name/department/contact/bloodGroup when available; falls back to whatever
 * details are passed in (manual entry) otherwise.
 */
export async function addScan(
  eventId: string,
  regNo: string,
  manualDetails?: Partial<Pick<Scan, 'name' | 'department' | 'contact' | 'bloodGroup'>>,
): Promise<Scan> {
  const normalisedRegNo = normaliseRegNo(regNo);

  const existing = await db.scans.where({ eventId, regNo: normalisedRegNo }).first();
  if (existing) {
    throw new DuplicateScanError(existing);
  }

  const student = await getStudent(normalisedRegNo);
  const scan: Scan = {
    eventId,
    regNo: normalisedRegNo,
    name: student?.name ?? manualDetails?.name ?? '',
    department: student?.department ?? manualDetails?.department,
    contact: student?.contact ?? manualDetails?.contact,
    bloodGroup: student?.bloodGroup ?? manualDetails?.bloodGroup,
    timestamp: Date.now(),
    manual: !student,
  };

  const id = await db.scans.add(scan);
  return { ...scan, id };
}

export function listScans(eventId: string): Promise<Scan[]> {
  return db.scans.where('eventId').equals(eventId).reverse().sortBy('timestamp');
}

export function countScans(eventId: string): Promise<number> {
  return db.scans.where('eventId').equals(eventId).count();
}

export function deleteScan(id: number): Promise<void> {
  return db.scans.delete(id);
}
