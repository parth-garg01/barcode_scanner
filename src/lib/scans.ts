import { db } from './db';
import type { Scan } from './types';

export class DuplicateScanError extends Error {
  constructor(public existing: Scan) {
    super(`${existing.regNo} has already checked in`);
    this.name = 'DuplicateScanError';
  }
}

export function normaliseRegNo(regNo: string): string {
  // Code 39 (common on ID cards) frames its payload in '*' start/stop
  // characters that some decoders return literally.
  return regNo.trim().replace(/^\*+|\*+$/g, '').toUpperCase();
}

/** Records a check-in for an event, rejecting a registration number already scanned there. */
export async function addScan(eventId: string, regNo: string): Promise<Scan> {
  const normalisedRegNo = normaliseRegNo(regNo);

  const existing = await db.scans.where({ eventId, regNo: normalisedRegNo }).first();
  if (existing) {
    throw new DuplicateScanError(existing);
  }

  const scan: Scan = { eventId, regNo: normalisedRegNo, timestamp: Date.now() };
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
