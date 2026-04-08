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

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then((e) => setEvent(e ?? null));
    listScans(eventId).then(setScans);
  }, [eventId]);

  return (
    <div className="stack">
      <h3>Export attendance</h3>
      <p className="muted">
        Downloads an XLSX file with registration number, name, department, contact number, blood
        group and check-in time for all {scans.length} attendee{scans.length === 1 ? '' : 's'}.
      </p>
      <button
        className="btn btn-primary btn-block"
        disabled={!event || scans.length === 0}
        onClick={() => event && exportAttendanceToExcel(event, scans)}
      >
        Export to Excel
      </button>
    </div>
  );
}
