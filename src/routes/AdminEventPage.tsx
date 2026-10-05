import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import AttendeeList from '../components/AttendeeList';
import Spinner from '../components/Spinner';
import { api, ApiError } from '../lib/api';
import { stubDate } from '../lib/dates';
import { getAdminPassword } from '../lib/session';
import type { EventInfo, Scan } from '../lib/types';

/** Organiser's view of one event: its join code and everyone checked in so far. */
export default function AdminEventPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    const fail = (err: unknown, hint = '') =>
      setError(err instanceof ApiError ? err.message + hint : 'Could not reach the server. Check your connection and try again.');
    // Loaded separately: if the event's tab was removed from the sheet by hand, the
    // list cannot load, but the event itself must still open so it can be deleted here.
    api.joinEvent(code).then(setEvent).catch(fail);
    api
      .listScans(code)
      // Newest first, in the shape the shared list component expects.
      .then(({ scans: rows }) => setScans(rows.map((scan, id): Scan => ({ ...scan, id, eventCode: code, synced: 1 })).sort((a, b) => b.timestamp - a.timestamp)))
      .catch((err) => {
        setScans([]);
        fail(err, '. Its check-ins cannot be shown, but you can still delete the event from this portal below.');
      });
  }, [code]);

  useEffect(load, [load]);

  if (!getAdminPassword()) return <Navigate to="/admin" replace />;

  /** Stops or resumes check-ins for every volunteer on this event. */
  async function setOpen(open: boolean) {
    setSaving(true);
    setError(null);
    try {
      const { closed } = await api.setEventOpen(getAdminPassword(), code, open);
      setEvent((current) => current && { ...current, closed });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  /** Removes the event from the portal. Nothing is deleted from the Google Sheet. */
  async function remove() {
    const name = event?.name ?? code;
    if (!confirm(`Delete "${name}" from this portal? Its code stops working. Nothing is deleted from the Google Sheet: the attendance stays there until you remove it yourself.`)) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteEvent(getAdminPassword(), code);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.');
      setSaving(false);
    }
  }

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

      {event && (
        <div className="stack">
          <p className="eyebrow">Scanning</p>
          <p className={event.closed ? 'note' : 'muted'}>
            {event.closed
              ? 'Scanning is stopped. Volunteers cannot check in any more ID cards for this event.'
              : 'Scanning is open. Volunteers with the code can check in ID cards.'}
          </p>
          <button type="button" className={`btn btn-block${event.closed ? ' btn-primary' : ' btn-stop'}`} disabled={saving} onClick={() => setOpen(!!event.closed)}>
            {saving ? 'Saving…' : event.closed ? 'Allow scanning again' : 'Stop scanning'}
          </button>
        </div>
      )}

      {error && (
        <p className="card" role="alert">
          {error}
        </p>
      )}
      {scans ? <AttendeeList scans={scans} /> : !error && <Spinner />}

      <div className="row-links">
        <button type="button" className="link-quiet" onClick={load}>
          Refresh list
        </button>
        <button type="button" className="link-danger" disabled={saving} onClick={remove}>
          Delete event
        </button>
      </div>
    </div>
  );
}
