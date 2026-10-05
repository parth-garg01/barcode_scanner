import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { stubDate } from '../lib/dates';
import { getJoinedEvents, getVolunteer, rememberEvent, setVolunteer } from '../lib/session';

/** Where a volunteer starts: the event code from the organiser, plus their own name. */
export default function JoinPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState(getVolunteer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joined = getJoinedEvents();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const event = await api.joinEvent(code.trim());
      setVolunteer(name.trim());
      rememberEvent(event);
      navigate(`/e/${event.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Joining an event needs an internet connection.');
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div>
        <p className="eyebrow">Volunteer check-in</p>
        <h2 className="display">Join event</h2>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="eyebrow">Event code</span>
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC234"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            required
          />
        </label>

        <label className="field">
          <span className="eyebrow">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shown next to every scan you make" autoComplete="name" maxLength={60} required />
        </label>

        {error && (
          <p className="card" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !code.trim() || !name.trim()}>
          {busy ? 'Joining…' : 'Start scanning'}
        </button>
      </form>

      {joined.length > 0 && (
        <section className="stack">
          <h3 className="eyebrow">Your events on this device</h3>
          <ul className="stubs">
            {joined.map((event) => {
              const { day, month } = stubDate(event.date);
              return (
                <li key={event.code}>
                  <Link to={`/e/${event.code}`} className="stub">
                    <span className="stub-date">
                      <b>{day}</b>
                      <span>{month}</span>
                    </span>
                    <span className="stub-body">
                      <strong>{event.name}</strong>
                      <span className="mono">{event.code}</span>
                    </span>
                    <span className="stub-go" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link to="/admin" className="link-quiet">
        Organiser? Open the admin portal
      </Link>
    </div>
  );
}
