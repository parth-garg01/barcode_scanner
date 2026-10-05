import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBackend } from '../../../apps-script/local';
import { setTransport } from '../api';
import { db } from '../db';
import { addScan, DuplicateScanError, listScans, syncScans } from '../scans';

describe('addScan', () => {
  beforeEach(async () => {
    await db.scans.clear();
  });

  it('records a check-in and rejects a repeat scan, whatever the letter case', async () => {
    const scan = await addScan('EVENT1', '24BCI0115', 'Asha');
    expect(scan).toMatchObject({ regNo: '24BCI0115', volunteer: 'Asha', synced: 0 });

    await expect(addScan('EVENT1', '24bci0115', 'Asha')).rejects.toBeInstanceOf(DuplicateScanError);
    expect(await listScans('EVENT1')).toHaveLength(1);
  });

  it('keeps the same registration number separate across different events', async () => {
    await addScan('EVENT1', '24BCI0115', 'Asha');
    await expect(addScan('EVENT2', '24BCI0115', 'Asha')).resolves.toBeDefined();
  });

  it('strips Code 39 start/stop asterisks from a decoded barcode', async () => {
    const scan = await addScan('EVENT1', '*24BCI0115*', 'Asha');
    expect(scan.regNo).toBe('24BCI0115');
  });
});

// Two volunteers share one backend; this device plays Asha, and Ravi's scans
// are posted straight to the backend as if from another phone.
describe('syncScans', () => {
  let backend: ReturnType<typeof createLocalBackend>;
  let code: string;
  let online: boolean;
  const post = (action: string, payload: object) => JSON.parse(backend.handle(JSON.stringify({ action, ...payload }))).data;

  beforeEach(async () => {
    await db.scans.clear();
    backend = createLocalBackend({ adminPassword: 'secret' });
    code = post('createEvent', { password: 'secret', name: 'Hack Night', date: '2026-10-09' }).code;
    online = true;
    setTransport(async (body) => {
      if (!online) throw new TypeError('Failed to fetch');
      return backend.handle(body);
    });
  });

  it('uploads waiting scans and brings down the other volunteers scans', async () => {
    post('addScans', { code, scans: [{ regNo: '23BCE1042', timestamp: 500, volunteer: 'Ravi' }] });
    await addScan(code, '24BCI0115', 'Asha');

    expect(await syncScans(code)).toEqual([]);

    const local = await listScans(code);
    expect(local.map((s) => [s.regNo, s.volunteer, s.synced]).sort()).toEqual([
      ['23BCE1042', 'Ravi', 1],
      ['24BCI0115', 'Asha', 1],
    ]);
    // Ravi's card is now known here, so scanning it again is caught without the network.
    await expect(addScan(code, '23BCE1042', 'Asha')).rejects.toMatchObject({ existing: { volunteer: 'Ravi' } });
  });

  it('keeps scans queued while offline, then reports the ones another volunteer got to first', async () => {
    online = false;
    await addScan(code, '24BCI0115', 'Asha');
    await addScan(code, '22BEC0777', 'Asha');
    await expect(syncScans(code)).rejects.toThrow();
    expect((await listScans(code)).every((s) => s.synced === 0)).toBe(true);

    // Meanwhile Ravi, who has signal, checks in one of the same cards.
    post('addScans', { code, scans: [{ regNo: '24BCI0115', timestamp: 700, volunteer: 'Ravi' }] });

    online = true;
    expect(await syncScans(code)).toEqual([{ regNo: '24BCI0115', timestamp: 700, volunteer: 'Ravi' }]);

    const local = await listScans(code);
    expect(local.map((s) => [s.regNo, s.volunteer, s.synced]).sort()).toEqual([
      ['22BEC0777', 'Asha', 1],
      ['24BCI0115', 'Ravi', 1],
    ]);
    expect(backend.sheets.find((s) => s.name === 'Hack Night')!.rows).toHaveLength(3); // header + 2, no duplicate row
  });

  it('treats a resend after a lost reply as already done, not as a conflict', async () => {
    await addScan(code, '24BCI0115', 'Asha');
    // The server stores the scan but the reply never arrives.
    setTransport(async (body) => {
      backend.handle(body);
      throw new TypeError('Failed to fetch');
    });
    await expect(syncScans(code)).rejects.toThrow();

    setTransport(async (body) => backend.handle(body));
    expect(await syncScans(code)).toEqual([]);
    expect(await listScans(code)).toMatchObject([{ regNo: '24BCI0115', volunteer: 'Asha', synced: 1 }]);
    expect(backend.sheets.find((s) => s.name === 'Hack Night')!.rows).toHaveLength(2);
  });
});
