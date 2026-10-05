import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import AttendeeList from '../components/AttendeeList';
import Spinner from '../components/Spinner';
import { api, ApiError } from '../lib/api';
import { stubDate } from '../lib/dates';
import { getAdminPassword } from '../lib/session';
import type { EventInfo, Scan } from '../lib/types';

/** Organiser's view of one event: its join code and everyone checked in so far. */
export default function AdminEventPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.joinEvent(code), api.listScans(code)])
      .then(([info, { scans: rows }]) => {
        setEvent(info);
        // Newest first, in the shape the shared list component expects.
        setScans(rows.map((scan, id): Scan => ({ ...scan, id, eventCode: code, synced: 1 })).sort((a, b) => b.timestamp - a.timestamp));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.'));
  }, [code]);

  useEffect(load, [load]);

  if (!getAdminPassword()) return <Navigate to="/admin" replace />;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard blocked: the code is on screen to read out or type.
    }
  }

  return (
    <div className="page">
      <Link to="/admin" className="link-quiet link-back">
        ← All events
      </Link>

      <header className="event-hero">
        <div>
          <p className="eyebrow">{event ? stubDate(event.date).full : 'Event'}</p>
          <h2 className="display">{event?.name ?? code}</h2>
        </div>
        <p className="tally">
          <span className="tally-num">{String(scans?.length ?? 0).padStart(2, '0')}</span>
          <span className="eyebrow">checked in</span>
        </p>
      </header>

      <div className="stack">
        <p className="eyebrow">Join code for volunteers</p>
        <p className="code-input">{code}</p>
        <button type="button" className="btn btn-block" onClick={copy}>
          {copied ? 'Code copied' : 'Copy code'}
        </button>
      </div>

      {error && (
        <p className="card" role="alert">
          {error}
        </p>
      )}
      {scans ? <AttendeeList scans={scans} /> : !error && <Spinner />}

      <button type="button" className="link-quiet" onClick={load}>
        Refresh list
      </button>
    </div>
  );
}
