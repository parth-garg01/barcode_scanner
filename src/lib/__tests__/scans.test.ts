import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { addScan, DuplicateScanError, listScans } from '../scans';

describe('addScan', () => {
  beforeEach(async () => {
    await db.scans.clear();
    await db.events.clear();
  });

  it('records a check-in and rejects a repeat scan, whatever the letter case', async () => {
    const scan = await addScan('event-1', '24BCI0115');
    expect(scan.regNo).toBe('24BCI0115');

    await expect(addScan('event-1', '24bci0115')).rejects.toBeInstanceOf(DuplicateScanError);

    const rows = await listScans('event-1');
    expect(rows).toHaveLength(1);
  });

  it('keeps the same registration number separate across different events', async () => {
    await addScan('event-1', '24BCI0115');
    await expect(addScan('event-2', '24BCI0115')).resolves.toBeDefined();
  });

  it('strips Code 39 start/stop asterisks from a decoded barcode', async () => {
    const scan = await addScan('event-1', '*24BCI0115*');
    expect(scan.regNo).toBe('24BCI0115');
  });
});
