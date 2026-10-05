import { api } from './api';
import { db } from './db';
import type { RemoteScan, Scan } from './types';

export class DuplicateScanError extends Error {
  constructor(public existing: RemoteScan) {
    super(`${existing.regNo} has already checked in`);
    this.name = 'DuplicateScanError';
  }
}

export function normaliseRegNo(regNo: string): string {
  // Code 39 (common on ID cards) frames its payload in '*' start/stop
  // characters that some decoders return literally.
  return regNo.trim().replace(/^\*+|\*+$/g, '').toUpperCase();
}

/**
 * Records a check-in on this device, to be sent to the sheet by syncScans.
 * Rejects a registration number already known for the event, whether it was
 * scanned here or came down from another volunteer in an earlier sync.
 */
export async function addScan(eventCode: string, regNo: string, volunteer: string): Promise<Scan> {
  const normalisedRegNo = normaliseRegNo(regNo);

  const existing = await db.scans.where({ eventCode, regNo: normalisedRegNo }).first();
  if (existing) {
    throw new DuplicateScanError(existing);
  }

  const scan: Scan = { eventCode, regNo: normalisedRegNo, timestamp: Date.now(), volunteer, synced: 0 };
  const id = await db.scans.add(scan);
  return { ...scan, id };
}

export function listScans(eventCode: string): Promise<Scan[]> {
  return db.scans.where('eventCode').equals(eventCode).reverse().sortBy('timestamp');
}

export interface SyncResult {
  /** Scans turned away because another volunteer got there first, each as the server's winning row. */
  beaten: RemoteScan[];
  /** How many scans were refused because they were made after the organiser stopped scanning. */
  refused: number;
  /** Whether the organiser has stopped scanning for this event. */
  closed: boolean;
}

const inFlight = new Map<string, Promise<SyncResult>>();

/**
 * Sends this device's waiting check-ins to the sheet and pulls down everyone
 * else's. The result says what the server turned away, so the caller can tell
 * the volunteer. Throws when the server cannot be reached; nothing is lost,
 * the scans stay queued for the next attempt.
 */
export function syncScans(eventCode: string): Promise<SyncResult> {
  // One sync per event at a time: overlapping runs would send the same scans twice.
  let run = inFlight.get(eventCode);
  if (!run) {
    run = runSync(eventCode).finally(() => inFlight.delete(eventCode));
    inFlight.set(eventCode, run);
  }
  return run;
}

async function runSync(eventCode: string): Promise<SyncResult> {
  const pending = await db.scans.where({ eventCode, synced: 0 }).toArray();
  const sent = new Map(pending.map((scan) => [scan.regNo, scan]));

  const reply = pending.length
    ? await api.addScans(eventCode, pending.map(({ regNo, timestamp, volunteer }) => ({ regNo, timestamp, volunteer })))
    : { results: [], ...(await api.listScans(eventCode)) };

  const beaten: RemoteScan[] = [];
  let refused = 0;
  for (const result of reply.results) {
    if (result.status === 'closed') refused++;
    if (result.status !== 'duplicate') continue;
    const mine = sent.get(result.regNo);
    // The server already holding this exact scan just means an earlier send got
    // through and its reply was lost. Only a different row is a real conflict.
    if (mine && (mine.volunteer !== result.volunteer || mine.timestamp !== result.timestamp)) {
      beaten.push({ regNo: result.regNo, timestamp: result.timestamp, volunteer: result.volunteer });
    }
  }

  // The sheet is the source of truth: mirror it, then put back anything scanned
  // here while the request was in the air.
  await db.transaction('rw', db.scans, async () => {
    const sentIds = new Set(pending.map((scan) => scan.id));
    const onServer = new Set(reply.scans.map((scan) => scan.regNo));
    const scannedMeanwhile = (await db.scans.where({ eventCode, synced: 0 }).toArray()).filter(
      (scan) => !sentIds.has(scan.id) && !onServer.has(scan.regNo),
    );
    await db.scans.where('eventCode').equals(eventCode).delete();
    await db.scans.bulkAdd([
      ...reply.scans.map((scan): Scan => ({ ...scan, eventCode, synced: 1 })),
      ...scannedMeanwhile.map(({ id: _id, ...scan }) => scan),
    ]);
  });

  return { beaten, refused, closed: reply.closed };
}
