import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { api, ApiError, isDemoBackend } from '../lib/api';
import { stubDate } from '../lib/dates';
import { getAdminPassword, setAdminPassword } from '../lib/session';
import type { AdminEvent } from '../lib/types';

/** Organiser's portal: create events and hand their codes to volunteers. */
export default function AdminPage() {
  const [password, setPassword] = useState(getAdminPassword);
  const [draft, setDraft] = useState('');
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const fail = useCallback((err: unknown) => {
    if (err instanceof ApiError && /password/i.test(err.message)) {
      // Wrong or changed password: back to the sign-in form.
      setAdminPassword(null);
      setPassword('');
    }
    setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.');
  }, []);

  const load = useCallback(
    (pw: string) =>
      api.listEvents(pw).then((reply) => {
        setEvents(reply.events);
        setSheetUrl(reply.sheetUrl);
      }),
    [],
  );

  useEffect(() => {
    if (password) load(password).catch(fail);
  }, [password, load, fail]);

  function signIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEvents(null);
    setAdminPassword(draft);
    setPassword(draft);
    setDraft('');
  }

  function signOut() {
    setAdminPassword(null);
    setPassword('');
    setEvents(null);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createEvent(password, name.trim(), date);
      setName('');
      await load(password);
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      // Clipboard blocked: the code is on screen to read out or type.
    }
  }

  const demoNote = isDemoBackend && (
    <p className="note">
      Demo backend: nothing is saved to Google Sheets yet and events vanish when the dev server restarts. The admin
      password is <span className="mono">admin</span>. See the README to connect your Sheet.
    </p>
  );

  if (!password) {
    return (
      <form className="page" onSubmit={signIn}>
        <div>
          <p className="eyebrow">Organiser</p>
          <h2 className="display">Admin portal</h2>
        </div>
        {demoNote}
        <label className="field">
          <span className="eyebrow">Admin password</span>
          <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="current-password" required autoFocus />
        </label>
        {error && (
          <p className="card" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={!draft}>
          Sign in
        </button>
        <Link to="/" className="link-quiet">
          Back to volunteer check-in
        </Link>
      </form>
    );
  }

  return (
    <div className="page">
      <div>
        <p className="eyebrow">Organiser</p>
        <h2 className="display">Events</h2>
      </div>
      {demoNote}

      <form className="stack" onSubmit={create}>
        <h3 className="eyebrow">New event</h3>
        <label className="field">
          <span className="visually-hidden">Event name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name, e.g. Robotics Fest 2026" maxLength={80} required />
        </label>
        <label className="field">
          <span className="visually-hidden">Event date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving || !name.trim()}>
          {saving ? 'Creating…' : 'Create event and code'}
        </button>
      </form>

      {error && (
        <p className="card" role="alert">
          {error}
        </p>
      )}

      <section className="stack">
        <h3 className="eyebrow">Codes to give your volunteers</h3>
        {events === null && !error && <Spinner />}
        {events?.length === 0 && <p className="empty">No events yet. Create one above to get its code.</p>}
        {!!events?.length && (
          <ul className="stubs">
            {events.map((event) => {
              const { day, month } = stubDate(event.date);
              return (
                <li key={event.code}>
                  <button type="button" className="stub" onClick={() => copy(event.code)} aria-label={`Copy code ${event.code} for ${event.name}`}>
                    <span className="stub-date">
                      <b>{day}</b>
                      <span>{month}</span>
                    </span>
                    <span className="stub-body">
                      <strong>{event.name}</strong>
                      <span>{event.count} checked in</span>
                    </span>
                    <span className="stub-code">
                      <span className="mono">{event.code}</span>
                      <span className="eyebrow">{copied === event.code ? 'Copied' : 'Tap to copy'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="row-links">
        {sheetUrl && (
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="link-quiet">
            Open the Google Sheet
          </a>
        )}
        <button type="button" className="link-quiet" onClick={() => load(password).catch(fail)}>
          Refresh counts
        </button>
        <button type="button" className="link-quiet" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
