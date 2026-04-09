import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createEvent, deleteEvent, listEvents } from '../events';
import { addScan } from '../scans';

describe('deleteEvent', () => {
  beforeEach(async () => {
    await db.events.clear();
    await db.scans.clear();
  });

  it('removes the event and cascades to its scans', async () => {
    const event = await createEvent({ name: 'Hack Night', date: '2026-04-09' });
    await addScan(event.id, '24BCI0115', { name: 'Asha' });

    await deleteEvent(event.id);

    expect(await listEvents()).toHaveLength(0);
    expect(await db.scans.where('eventId').equals(event.id).count()).toBe(0);
  });
});
