export interface Event {
  id: string;
  name: string;
  date: string; // ISO date (yyyy-mm-dd)
  description?: string;
  createdAt: number;
}

export interface Student {
  regNo: string; // primary key, normalised to uppercase
  name: string;
  department?: string;
  contact?: string;
  bloodGroup?: string;
}

export interface Scan {
  id?: number; // auto-increment
  eventId: string;
  regNo: string;
  name: string;
  department?: string;
  contact?: string;
  bloodGroup?: string;
  timestamp: number;
  manual: boolean; // true if entered by hand instead of scanned
}
