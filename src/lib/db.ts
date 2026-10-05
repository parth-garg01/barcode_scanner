import Dexie, { type Table } from 'dexie';
import type { Event, Scan } from './types';

class ScanMarkDB extends Dexie {
  events!: Table<Event, string>;
  scans!: Table<Scan, number>;

  constructor() {
    super('scanmark');
    this.version(1).stores({
      events: 'id, date, createdAt',
      students: 'regNo, name',
      // compound index keeps duplicate lookup for one event to a single query
      scans: '++id, eventId, [eventId+regNo], regNo, timestamp',
    });
    // The master student list was removed; drop its table from existing installs.
    this.version(2).stores({ students: null });
  }
}

export const db = new ScanMarkDB();
