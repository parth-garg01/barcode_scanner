import Dexie, { type Table } from 'dexie';
import type { Event, Scan, Student } from './types';

class ScanMarkDB extends Dexie {
  events!: Table<Event, string>;
  students!: Table<Student, string>;
  scans!: Table<Scan, number>;

  constructor() {
    super('scanmark');
    this.version(1).stores({
      events: 'id, date, createdAt',
      students: 'regNo, name',
      // compound index keeps duplicate lookup for one event to a single query
      scans: '++id, eventId, [eventId+regNo], regNo, timestamp',
    });
  }
}

export const db = new ScanMarkDB();
