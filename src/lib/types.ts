export interface Event {
  id: string;
  name: string;
  date: string; // ISO date (yyyy-mm-dd)
  description?: string;
  createdAt: number;
}

export interface Scan {
  id?: number; // auto-increment
  eventId: string;
  regNo: string; // normalised to uppercase
  timestamp: number;
}
