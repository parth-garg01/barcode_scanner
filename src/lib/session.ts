import type { EventInfo } from './types';

/**
 * Small per-device preferences. Storage can be unavailable (private windows,
 * blocked site data), so every access is guarded and the app works without it.
 */
function read<T>(store: Storage, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(store: Storage, key: string, value: unknown): void {
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch {
    // Not persisted; the value still lives for this page view.
  }
}

/** The name written next to every scan this volunteer makes. */
export const getVolunteer = () => read(localStorage, 'scanmark.volunteer', '');
export const setVolunteer = (name: string) => write(localStorage, 'scanmark.volunteer', name);

/** Events this device has joined, most recent first, so a volunteer can get back in offline. */
export const getJoinedEvents = () => read<EventInfo[]>(localStorage, 'scanmark.events', []);
export const getJoinedEvent = (code: string) => getJoinedEvents().find((event) => event.code === code);
export function rememberEvent(event: EventInfo): void {
  write(localStorage, 'scanmark.events', [event, ...getJoinedEvents().filter((e) => e.code !== event.code)]);
}
export function forgetEvent(code: string): void {
  write(localStorage, 'scanmark.events', getJoinedEvents().filter((e) => e.code !== code));
}

/** Kept for the browser session only, so closing the tab signs the admin out. */
export const getAdminPassword = () => read(sessionStorage, 'scanmark.admin', '');
export const setAdminPassword = (password: string | null) => write(sessionStorage, 'scanmark.admin', password);
