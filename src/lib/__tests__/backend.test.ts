import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBackend } from '../../../apps-script/local';

// Exercises the real Apps Script source (apps-script/Code.gs) against an in-memory workbook.
describe('Apps Script backend', () => {
  let backend: ReturnType<typeof createLocalBackend>;
  const call = (action: string, payload: object = {}) => JSON.parse(backend.handle(JSON.stringify({ action, ...payload })));

  beforeEach(() => {
    backend = createLocalBackend({ adminPassword: 'secret' });
  });

  it('only lets the admin create events, and gives each one a code and its own sheet', () => {
    expect(call('createEvent', { password: 'nope', name: 'Robotics Fest', date: '2026-10-09' })).toEqual({
      ok: false,
      error: 'Wrong admin password',
    });

    const { data: event } = call('createEvent', { password: 'secret', name: 'Robotics Fest', date: '2026-10-09' });
    expect(event.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(backend.sheets.map((s) => s.name)).toEqual(['Events', 'Robotics Fest']);

    // Same name again gets its own tab rather than sharing one.
    call('createEvent', { password: 'secret', name: 'Robotics Fest', date: '2026-10-10' });
    expect(backend.sheets.map((s) => s.name)).toContain('Robotics Fest (2)');

    expect(call('joinEvent', { code: event.code.toLowerCase() }).data).toEqual({ code: event.code, name: 'Robotics Fest', date: '2026-10-09', closed: false });
    expect(call('joinEvent', { code: 'ZZZZZZ' })).toEqual({ ok: false, error: 'Event code not found' });
  });

  it('keeps one row per registration number across volunteers and reports who scanned first', () => {
    const code = call('createEvent', { password: 'secret', name: 'Hack Night', date: '2026-10-09' }).data.code;

    const first = call('addScans', { code, scans: [{ regNo: '24bci0115', timestamp: 1000, volunteer: 'Asha' }] }).data;
    expect(first.results).toEqual([{ regNo: '24BCI0115', status: 'ok' }]);

    const second = call('addScans', {
      code,
      scans: [
        { regNo: '24BCI0115', timestamp: 2000, volunteer: 'Ravi' },
        { regNo: '23BCE1042', timestamp: 2500, volunteer: 'Ravi' },
      ],
    }).data;
    expect(second.results).toEqual([
      { regNo: '24BCI0115', status: 'duplicate', volunteer: 'Asha', timestamp: 1000 },
      { regNo: '23BCE1042', status: 'ok' },
    ]);
    expect(second.scans.map((s: { regNo: string; volunteer: string }) => [s.regNo, s.volunteer])).toEqual([
      ['24BCI0115', 'Asha'],
      ['23BCE1042', 'Ravi'],
    ]);

    const sheet = backend.sheets.find((s) => s.name === 'Hack Night')!;
    expect(sheet.rows).toHaveLength(3); // header + two check-ins
    expect(sheet.rows[0]).toEqual(['Registration Number', 'Check-in Time', 'Scanned By']);
    expect(call('listEvents', { password: 'secret' }).data.events[0]).toMatchObject({ code, count: 2 });
  });

  it('lets the admin stop scanning: later scans are refused, earlier offline ones still count', () => {
    const code = call('createEvent', { password: 'secret', name: 'Hack Night', date: '2026-10-09' }).data.code;
    const beforeClosing = Date.now() - 60_000;

    expect(call('setEventOpen', { password: 'nope', code, open: false }).ok).toBe(false);
    expect(call('setEventOpen', { password: 'secret', code, open: false }).data).toEqual({ code, closed: true });
    expect(call('joinEvent', { code }).data.closed).toBe(true);
    expect(call('listEvents', { password: 'secret' }).data.events[0].closed).toBe(true);

    const reply = call('addScans', {
      code,
      scans: [
        { regNo: '24BCI0115', timestamp: Date.now() + 1000, volunteer: 'Asha' }, // scanned after closing
        { regNo: '23BCE1042', timestamp: beforeClosing, volunteer: 'Ravi' }, // scanned earlier, synced late
      ],
    }).data;
    expect(reply.closed).toBe(true);
    expect(reply.results.map((r: { status: string }) => r.status)).toEqual(['closed', 'ok']);
    expect(reply.scans.map((s: { regNo: string }) => s.regNo)).toEqual(['23BCE1042']);

    call('setEventOpen', { password: 'secret', code, open: true });
    const reopened = call('addScans', { code, scans: [{ regNo: '24BCI0115', timestamp: Date.now(), volunteer: 'Asha' }] }).data;
    expect(reopened.closed).toBe(false);
    expect(reopened.results[0].status).toBe('ok');
  });

  it('refuses values that are not registration numbers and defuses spreadsheet formulas', () => {
    const code = call('createEvent', { password: 'secret', name: '=HYPERLINK("x")', date: '2026-10-09' }).data.code;
    expect(backend.sheets[1].name).not.toMatch(/^=/);

    const { results } = call('addScans', {
      code,
      scans: [
        { regNo: '=IMPORTXML("http://evil")', timestamp: 1, volunteer: 'x' },
        { regNo: '', timestamp: 1, volunteer: 'x' },
        { regNo: '5901234123457', timestamp: 1, volunteer: '=cmd|calc' },
      ],
    }).data;
    expect(results.map((r: { status: string }) => r.status)).toEqual(['invalid', 'invalid', 'ok']);

    const rows = backend.sheets[1].rows;
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('5901234123457');
    expect(rows[1][2]).toBe('cmd|calc');
  });
});
