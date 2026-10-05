import type { AdminEvent, EventInfo, RemoteScan } from './types';

/**
 * The deployed Apps Script web app (see README). Without it, the dev server
 * falls back to its built in demo backend so the flow can still be tried.
 */
const API_URL: string = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/__api' : '');
export const isDemoBackend = !import.meta.env.VITE_API_URL;

/** The server understood the request and said no (wrong code, wrong password...). */
export class ApiError extends Error {}

type Transport = (body: string) => Promise<string>;

let transport: Transport = async (body) => {
  if (!API_URL) throw new ApiError('This build has no backend configured (VITE_API_URL is missing)');
  // text/plain keeps this a "simple" request: Apps Script cannot answer a CORS preflight.
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
  if (!response.ok) throw new Error(`Server error ${response.status}`);
  return response.text();
};

/** Lets tests talk to an in-process backend instead of the network. */
export function setTransport(next: Transport): void {
  transport = next;
}

async function call<T>(action: string, payload: object): Promise<T> {
  const reply = JSON.parse(await transport(JSON.stringify({ action, ...payload })));
  if (!reply.ok) throw new ApiError(reply.error);
  return reply.data;
}

export type ScanResult =
  | { regNo: string; status: 'ok' | 'invalid' | 'closed' }
  | ({ status: 'duplicate' } & RemoteScan);

export const api = {
  joinEvent: (code: string) => call<EventInfo>('joinEvent', { code }),
  listScans: (code: string) => call<{ scans: RemoteScan[]; closed: boolean }>('listScans', { code }),
  addScans: (code: string, scans: RemoteScan[]) => call<{ results: ScanResult[]; scans: RemoteScan[]; closed: boolean }>('addScans', { code, scans }),
  listEvents: (password: string) => call<{ events: AdminEvent[]; sheetUrl: string }>('listEvents', { password }),
  createEvent: (password: string, name: string, date: string) => call<AdminEvent>('createEvent', { password, name, date }),
  deleteEvent: (password: string, code: string) => call<{ code: string }>('deleteEvent', { password, code }),
  setEventOpen: (password: string, code: string, open: boolean) => call<{ code: string; closed: boolean }>('setEventOpen', { password, code, open }),
};
