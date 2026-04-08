import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { addScan, DuplicateScanError, listScans } from '../scans';
import { upsertStudents } from '../students';

describe('addScan', () => {
  beforeEach(async () => {
    await db.students.clear();
    await db.scans.clear();
    await db.events.clear();
  });

  it('auto-fills details from the master list and rejects a repeat scan', async () => {
    await upsertStudents([{ regNo: '24bci0115', name: 'Asha Rao', department: 'CSE', bloodGroup: 'O+' }]);

    const scan = await addScan('event-1', '24BCI0115');
    expect(scan.name).toBe('Asha Rao');
    expect(scan.manual).toBe(false);

    await expect(addScan('event-1', '24bci0115')).rejects.toBeInstanceOf(DuplicateScanError);

    const rows = await listScans('event-1');
    expect(rows).toHaveLength(1);
  });

  it('falls back to manual details when the ID is not in the master list', async () => {
    const scan = await addScan('event-1', '99XYZ0000', { name: 'Walk-in Guest' });
    expect(scan.manual).toBe(true);
    expect(scan.name).toBe('Walk-in Guest');
  });

  it('keeps the same registration number separate across different events', async () => {
    await addScan('event-1', '24BCI0115', { name: 'Asha' });
    await expect(addScan('event-2', '24BCI0115', { name: 'Asha' })).resolves.toBeDefined();
  });
});
