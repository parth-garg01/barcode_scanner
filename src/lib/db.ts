import Dexie, { type Table } from 'dexie';
import type { Scan } from './types';

/**
 * Local copy of each joined event's check-ins. It is what makes scanning work
 * offline: new scans wait here until they sync, and everyone else's scans are
 * cached here so duplicates are caught without a round trip.
 */
class ScanMarkDB extends Dexie {
  scans!: Table<Scan, number>;

  constructor() {
    super('scanmark');
    this.version(1).stores({
      events: 'id, date, createdAt',
      students: 'regNo, name',
      scans: '++id, eventId, [eventId+regNo], regNo, timestamp',
    });
    this.version(2).stores({ students: null });
    // Events moved to the shared backend; scans are now keyed by event code.
    this.version(3)
      .stores({
        events: null,
        // compound indexes keep the duplicate lookup and the sync queue to single queries
        scans: '++id, eventCode, [eventCode+regNo], [eventCode+synced]',
      })
      .upgrade((tx) => tx.table('scans').clear());
  }
}

export const db = new ScanMarkDB();
