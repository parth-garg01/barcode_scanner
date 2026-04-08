import { db } from './db';
import type { Event } from './types';

export function createEvent(input: { name: string; date: string; description?: string }): Promise<Event> {
  const event: Event = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    date: input.date,
    description: input.description?.trim() || undefined,
    createdAt: Date.now(),
  };
  return db.events.add(event).then(() => event);
}

export function listEvents(): Promise<Event[]> {
  return db.events.orderBy('createdAt').reverse().toArray();
}

export function getEvent(id: string): Promise<Event | undefined> {
  return db.events.get(id);
}

export async function deleteEvent(id: string): Promise<void> {
  await db.transaction('rw', db.events, db.scans, async () => {
    await db.scans.where('eventId').equals(id).delete();
    await db.events.delete(id);
  });
}
