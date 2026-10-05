/** An event as volunteers see it. `code` is the join code the admin hands out. */
export interface EventInfo {
  code: string;
  name: string;
  date: string; // ISO date (yyyy-mm-dd)
}

/** An event in the admin portal, with its running check-in count. */
export interface AdminEvent extends EventInfo {
  count: number;
}

/** One check-in as stored in the event's Google Sheet tab. */
export interface RemoteScan {
  regNo: string; // normalised to uppercase
  timestamp: number;
  volunteer: string; // who scanned it
}

/** A check-in on this device. `synced` is 0 until the server has accepted it. */
export interface Scan extends RemoteScan {
  id?: number; // auto-increment
  eventCode: string;
  synced: 0 | 1;
}
