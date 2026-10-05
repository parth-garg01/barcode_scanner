import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { exportAttendanceToExcel } from '../lib/exportExcel';
import { getEvent } from '../lib/events';
import { listScans } from '../lib/scans';
import type { Event, Scan } from '../lib/types';

export default function ExportPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then((e) => setEvent(e ?? null));
    listScans(eventId).then(setScans);
  }, [eventId]);

  async function handleExport() {
    if (!event) return;
    setError(null);
    try {
      await exportAttendanceToExcel(event, scans);
    } catch (err) {
      // Dismissing the share sheet rejects with "Share canceled"; that is not a failure.
      if (err instanceof Error && /cancel/i.test(err.message)) return;
      setError('Could not export the attendance file. Try again.');
    }
  }

  return (
    <div className="stack">
      <h3 className="eyebrow">Export attendance</h3>
      <p className="muted">
        An Excel file with the registration number and check-in time for all {scans.length} attendee{scans.length === 1 ? '' : 's'}.
      </p>
      <button
        className="btn btn-primary btn-block"
        disabled={!event || scans.length === 0}
        onClick={handleExport}
      >
        Export to Excel
      </button>
      {error && (
        <p className="card" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
